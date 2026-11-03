/*
 * 曲目与谱面：mst_music 列表、谱面解锁道具、mst_patch 形态。
 * 数据来源 data/musics.json（本机 GameMusic + chart 资源生成）。
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
 * 谱面解锁：游戏用 usr_item 建道具库存（PlayerItemInventory.OnPlayerDataFetched），
 * HasChart() 查的是 "chart.{musicId}.{grade}"（ChartItemIdUtility.ToItemId 的格式）。
 * 每个谱面给 count=1，PlayerMusicChartAccessControl.GetAccessLevel 就返回
 * Playable(20) —— 曲目全出现在选曲列表且可打。
 * data/unlock.json: {"enabled": true, "limit": 0}（limit>0 只给前 N 个谱面，用于二分）
 */
export async function buildChartItems(): Promise<any[]> {
  let enabled = true;
  let limit = 0;
  let grades: number[] | null = null;      // null = 每首只发最低档
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
    /* 默认全开 */
  }
  if (!enabled) return [];

  // 注意：游戏侧对 usr_item 的条数/体积有上限。实测发满 1607 条（321KB）时
  // 只有前 100 多首出现，东方的 4 首只出 1 首 —— 典型的中途截断。
  // 只发每首的最低难度（NOV）即可让曲目进入列表（HasChart 只要求该档持有），
  // 条数降到 323、体积约 65KB。需要更多难度时把 grades 改成 "all" 或指定数组。
  const rows = await loadSongs();
  const out: any[] = [];
  for (const s of rows) {
    // 99900 チュートリアル / 99901 ゲームプレビュー 是教学与预告，不该出现在选曲里
    if (s.id >= 90000) continue;
    const ds = (s.charts || [])
      // lv = 0 是主表里的占位行，代表这一档谱面并不存在（全部 330 行 MXM 都是 0）。
      // 给不存在的难度发道具只会让游戏拿到空的 chart.* 条目，直接跳过。
      .filter((c: any) => typeof c === 'number' || !(typeof c.lv === 'number' && c.lv <= 0))
      .map((c: any) => (typeof c === 'number' ? c : c.d))
      .filter((d: any) => typeof d === 'number')
      .sort((a: number, b: number) => a - b);
    let want = grades ? ds.filter((d: number) => grades!.includes(d)) : ds.slice(0, 1);
    if (!want.length && ds.length) want = ds.slice(0, 1);   // 配置写错时的兜底
    for (const grade of want) {
      // 必须发全 4 个字段：删掉 income / expense 后游戏侧会把整条 item 丢掉
      // （实测：只发 item_id+count 时，游戏里曲目数直接回落到 38 首 = 一个都没解锁）。
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
 * 生成 mst_music 下的 <music> 节点数组。
 * data/music.json 控制：{"enabled": true, "limit": 3}（limit=0 表示全部）
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
    /* 默认全开 */
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
 * 生成 mst_patch。可由 data/patch.json 切换形态，改完不用重启核心（每次请求都重读）。
 *
 *   mode = "omit"         不给 mst_patch（当前默认；配合客户端补丁屏蔽更新器异常）
 *   mode = "empty"        带 mst_patch，patch 为空字符串
 *   mode = "version-only" 只给 version，不给 patch
 *   mode = "csv"          patch 用 data/mst_patch.csv（主数据补丁，见下）
 *   mode = "sql"          patch 用 data/patch.json 里的 sql 字段（老字段名，其实也是 CSV）
 *   mode = "legacy"       patch 给 s32 0（能进游戏但会刷 PATCH 错误）
 *
 * ## mode = "csv" 是什么
 *
 * 游戏内容更新器每次启动都会：
 *   `RestoreDatabase()`（从 bundle 的 CSV 重新导入主表）→ `ApplyPatch(patch)`。
 * `ApplyPatch` 的实现是 `QueryMasterPatch.ApplyDatabasePatch`，吃的是**CSV 文本**：
 *   第 1 行  = 表名（必须等于 C# 类型名，如 CharacterCardMaster）
 *   第 2 行  = 列名（必须全部是该表的 ColumnName，主键列不能少）
 *   第 3 行起 = 数据行，按主键 UPDATE 或 INSERT
 *   空行     = 这张表结束
 *
 * 这就给了服务端一个**直接写游戏内存主表**的口子。用它把 bundle 导入时丢掉的行补回来
 * （CharacterCardMaster 只写进了 1 行 → 游戏只认识 1 张卡），
 * 文件由 `py tools\gen_mst_patch.py` 从 recon/out/db/*.csv 生成。
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
    /* 用默认值 */
  }
  const mode = String(cfg.mode || 'omit').toLowerCase();
  const versionText = String(cfg.version || '2025070800');
  const version = Number(versionText);
  const verItem = Number.isFinite(version) && version > 0
    ? K.ITEM('s32', version)
    // Version 是 XrpcInt（[XmlText] int），发 str 也能解析，只是不合规范
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
          enqueue(`mst_patch: 下发主数据补丁 ${patch.length} 字符\n`);
          return K.ATTR({}, { version: verItem, patch: K.ITEM('str', patch) });
        }
      }
      enqueue('!! mst_patch: mode=csv 但 data/mst_patch.csv 不存在或为空，退回空补丁\n');
    } catch (e) {
      enqueue(`!! mst_patch: 读取补丁失败: ${e}\n`);
    }
    return K.ATTR({}, { version: verItem, patch: K.ITEM('str', '') });
  }

  const sql = mode === 'sql' ? String(cfg.sql || '') : '';
  return K.ATTR({}, { version: verItem, patch: K.ITEM('str', sql) });
}
