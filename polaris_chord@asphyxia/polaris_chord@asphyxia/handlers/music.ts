/*
 * Songs and charts: the mst_music list, chart unlock items, mst_patch shapes.
 * The data comes from data/musics.json (generated from the local GameMusic + chart assets).
 */

import { OPEN_AT, CLOSE_AT, enqueue } from './common';

type SongRow = { id: number; charts: any[] };

let songs: SongRow[] | null = null;

async function loadSongs(): Promise<SongRow[]> {
  if (songs) return songs;
  try {
    const raw = (await IO.ReadFile(IO.Resolve('data/musics.json'), 'utf8')) as string | null;
    songs = raw ? (JSON.parse(raw) as SongRow[]) : [];
  } catch (e) {
    enqueue(`!! failed to load data/musics.json: ${e}\n`);
    songs = [];
  }
  return songs;
}

/**
 * Chart unlock: the game builds its item inventory from usr_item
 * (PlayerItemInventory.OnPlayerDataFetched), and HasChart() looks up
 * "chart.{musicId}.{grade}" (the format produced by ChartItemIdUtility.ToItemId).
 * Give every chart count=1 and PlayerMusicChartAccessControl.GetAccessLevel returns
 * Playable(20) — every song then shows up in the song select list and is playable.
 * data/unlock.json: {"enabled": true, "limit": 0} (limit>0 grants only the first N charts,
 * used for bisecting)
 */
export async function buildChartItems(): Promise<any[]> {
  let enabled = true;
  let limit = 0;
  let grades: number[] | null = null;      // null = send only the lowest grade per song
  try {
    const p = IO.Resolve('data/unlock.json');
    if (IO.Exists(p)) {
      const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
      if (raw) {
        const cfg = JSON.parse(raw);
        enabled = cfg.enabled !== false;
        limit = Number(cfg.limit) || 0;
        if (Array.isArray(cfg.grades)) grades = cfg.grades.map((x: any) => Number(x));
        else if (cfg.grades === 'all') grades = [0, 1, 2, 3, 4];
      }
    }
  } catch (e) {
    /* everything enabled by default */
  }
  if (!enabled) return [];

  // NOTE: the game side caps the count / size of usr_item. Measured: sending all 1607
  // entries (321KB) made only the first ~100 songs show up, and of the 4 Touhou songs only
  // 1 appeared — a classic mid-transfer truncation.
  // Sending just each song's lowest difficulty (NOV) is enough to get the song into the list
  // (HasChart only requires that grade to be held), which drops the count to 323 and the size
  // to about 65KB. For more difficulties, set grades to "all" or to an explicit array.
  const rows = await loadSongs();
  const out: any[] = [];
  for (const s of rows) {
    // 99900 チュートリアル / 99901 ゲームプレビュー are the tutorial and the preview;
    // they should not show up in song select
    if (s.id >= 90000) continue;
    const ds = (s.charts || [])
      // lv = 0 is a placeholder row in the master table meaning that difficulty does not
      // exist (all 330 MXM rows are 0). Sending an item for a nonexistent difficulty only
      // gets the game an empty chart.* entry, so skip it outright.
      .filter((c: any) => typeof c === 'number' || !(typeof c.lv === 'number' && c.lv <= 0))
      .map((c: any) => (typeof c === 'number' ? c : c.d))
      .filter((d: any) => typeof d === 'number')
      .sort((a: number, b: number) => a - b);
    let want = grades ? ds.filter((d: number) => grades!.includes(d)) : ds.slice(0, 1);
    if (!want.length && ds.length) want = ds.slice(0, 1);   // fallback if the config is wrong
    for (const grade of want) {
      // All 4 fields must be sent: drop income / expense and the game discards the entire
      // item (measured: with only item_id+count, the in-game song count fell straight back
      // to 38 = nothing unlocked).
      out.push({
        item_id: K.ITEM('str', `chart.${s.id}.${grade}`),
        count: K.ITEM('s32', 1),
        income: K.ITEM('s32', 0),
        expense: K.ITEM('s32', 0),
      });
      if (limit > 0 && out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Build the array of <music> nodes under mst_music.
 * Controlled by data/music.json: {"enabled": true, "limit": 3} (limit=0 means all)
 */
export async function buildMusicList(): Promise<any[]> {
  let enabled = true;
  let limit = 0;
  try {
    const p = IO.Resolve('data/music.json');
    if (IO.Exists(p)) {
      const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
      if (raw) {
        const cfg = JSON.parse(raw);
        enabled = cfg.enabled !== false;
        limit = Number(cfg.limit) || 0;
      }
    }
  } catch (e) {
    /* everything enabled by default */
  }
  if (!enabled) return [];

  const rows = await loadSongs();
  const pick = limit > 0 ? rows.slice(0, limit) : rows;
  return pick.map((s) => ({
    music_id: K.ITEM('s32', s.id),
    charts: K.ATTR({}, {
      chart: s.charts.map((c: any) => {
        const single = typeof c === 'number';
        return {
          chart_difficulty_type: K.ITEM('s32', single ? c : c.d),
          limitation_type: K.ITEM('s32', single ? 0 : c.lim),
          open_at: K.ITEM('str', single ? OPEN_AT : c.open),
          close_at: K.ITEM('str', single ? CLOSE_AT : c.close),
        };
      }),
    }),
  }));
}

/**
 * Build mst_patch. The shape can be switched via data/patch.json; no core restart needed
 * (it is re-read on every request).
 *
 *   mode = "omit"         no mst_patch (current default; paired with a client patch that
 *                         hides the updater exception)
 *   mode = "empty"        send mst_patch with an empty patch string
 *   mode = "version-only" send version only, no patch
 *   mode = "csv"          patch from data/mst_patch.csv (master data patch, see below)
 *   mode = "sql"          patch from the sql field in data/patch.json (an old field name; it
 *                         is CSV as well)
 *   mode = "legacy"       patch sent as s32 0 (gets into the game but spews PATCH errors)
 *
 * ## What mode = "csv" is
 *
 * On every launch the content updater does:
 *   `RestoreDatabase()` (re-import the master tables from the bundle's CSV) → `ApplyPatch(patch)`.
 * `ApplyPatch` is implemented by `QueryMasterPatch.ApplyDatabasePatch` and consumes **CSV
 * text**:
 *   line 1     = table name (must equal the C# type name, e.g. CharacterCardMaster)
 *   line 2     = column names (all of them must be ColumnName of that table; the primary key
 *                column cannot be omitted)
 *   line 3+    = data rows, UPDATE or INSERT by primary key
 *   blank line = that table ends
 *
 * That hands the server a way to **write directly into the game's in-memory master tables**.
 * Use it to keep the rows that `FilterDatabase(assetVersion)` would otherwise delete:
 * `CharacterCardMaster` has 2 rows (`00080001` / `00080004`) marked `Version=9999999`, and
 * `DELETE FROM '<table>' WHERE Version > 37` removes them, so the game only knows 111 of the
 * 113 cards. `data/mst_patch.csv` is produced offline from the game's own master CSV with those
 * `Version` values clamped to 37 (see `clamp_version()` in `data/`'s generator notes).
 */
export async function buildPatch(): Promise<any | null> {
  let cfg: any = {};
  try {
    const p = IO.Resolve('data/patch.json');
    if (IO.Exists(p)) {
      const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
      if (raw) cfg = JSON.parse(raw);
    }
  } catch (e) {
    /* use the defaults */
  }
  const mode = String(cfg.mode || 'omit').toLowerCase();
  const versionText = String(cfg.version || '2025070800');
  const version = Number(versionText);
  const verItem = Number.isFinite(version) && version > 0
    ? K.ITEM('s32', version)
    // Version is XrpcInt ([XmlText] int); sending it as str also parses, it is just
    // nonstandard
    : K.ITEM('str', versionText);

  if (mode === 'omit') return null;
  if (mode === 'empty') {
    return K.ATTR({}, { version: verItem, patch: K.ITEM('str', '') });
  }
  if (mode === 'legacy') {
    return K.ATTR({}, { version: verItem, patch: K.ITEM('s32', 0) });
  }
  if (mode === 'version-only') {
    return K.ATTR({}, { version: verItem });
  }

  if (mode === 'csv') {
    try {
      const p = IO.Resolve(String(cfg.file || 'data/mst_patch.csv'));
      if (IO.Exists(p)) {
        const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
        const patch = (raw || '').replace(/^\uFEFF/, '');
        if (patch.trim().length > 0) {
          enqueue(`mst_patch: sending master data patch of ${patch.length} characters\n`);
          return K.ATTR({}, { version: verItem, patch: K.ITEM('str', patch) });
        }
      }
      enqueue('!! mst_patch: mode=csv but data/mst_patch.csv is missing or empty, so an empty patch is used\n');
    } catch (e) {
      enqueue(`!! mst_patch: failed to read the patch: ${e}\n`);
    }
    return K.ATTR({}, { version: verItem, patch: K.ITEM('str', '') });
  }

  const sql = mode === 'sql' ? String(cfg.sql || '') : '';
  return K.ATTR({}, { version: verItem, patch: K.ITEM('str', sql) });
}
