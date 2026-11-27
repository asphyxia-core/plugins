import { Score } from "../models/score";
import { VersionInfo } from "../versions/types";

/** Clear flags, numbered the same way by every version. */
export const Flag = {
  PLAYED: 0x1,
  CLEARED: 0x2,
  FULL_COMBO: 0x4,
  EXCELLENT: 0x8,
};

const fix = (v: any, n: number, def: number): number[] => {
  const a = Array.isArray(v) ? v.slice(0, n) : [];
  while (a.length < n) a.push(def);
  return a;
};

/** Every record a version can show: its songs, normal mode, basic to extreme. */
export async function versionScores(refid: string, version: VersionInfo): Promise<Score[]> {
  const all = await DB.Find<Score>(refid, { collection: "score" });
  return all.filter(s => !s.isHardMode && s.seq >= 0 && s.seq <= 2 &&
    (version.maxMusicId === undefined || s.musicId <= version.maxMusicId));
}

const chart = (musicId: number, seq: number) => ({ collection: "score" as const, musicId, seq, isHardMode: false });

/**
 * Saves one normal-mode play from a version that reports single plays (prop,
 * Qubell, clan): counts go up by the play's flags, the best score and its
 * ghost are kept, and clear flags accumulate.
 */
export async function addPlay(refid: string, musicId: number, seq: number, score: number, clear: number, bar?: number[]) {
  const old = await DB.FindOne<Score>(refid, chart(musicId, seq));
  const best = old ? old.score | 0 : 0;
  await DB.Upsert<Score>(refid, chart(musicId, seq), {
    $set: {
      score: Math.max(best, score),
      clear: (old ? old.clear | 0 : 0) | clear,
      bar: bar && bar.length && (score >= best || !(old && old.bar && old.bar.length)) ? bar : (old && old.bar) || [],
      playCount: (old ? old.playCount | 0 : 0) + 1,
      clearCount: (old ? old.clearCount | 0 : 0) + (clear & Flag.CLEARED ? 1 : 0),
      fullcomboCount: (old ? old.fullcomboCount | 0 : 0) + (clear & Flag.FULL_COMBO ? 1 : 0),
      excellentCount: (old ? old.excellentCount | 0 : 0) + (clear & Flag.EXCELLENT ? 1 : 0),
    },
  });
}

/** Adds records kept elsewhere (an old save) to the shared ones: best of both, counts summed. */
export async function mergeRecord(refid: string, r: {
  musicId: number; seq: number; score: number; clear: number; bar?: number[];
  playCount: number; clearCount: number; fullcomboCount: number; excellentCount: number;
}) {
  const old = await DB.FindOne<Score>(refid, chart(r.musicId, r.seq));
  const better = !old || (r.score | 0) > (old.score | 0);
  await DB.Upsert<Score>(refid, chart(r.musicId, r.seq), {
    $set: {
      score: Math.max(old ? old.score | 0 : 0, r.score | 0),
      clear: (old ? old.clear | 0 : 0) | (r.clear | 0),
      bar: (better && r.bar && r.bar.length) ? r.bar : (old && old.bar) || r.bar || [],
      playCount: (old ? old.playCount | 0 : 0) + (r.playCount | 0),
      clearCount: (old ? old.clearCount | 0 : 0) + (r.clearCount | 0),
      fullcomboCount: (old ? old.fullcomboCount | 0 : 0) + (r.fullcomboCount | 0),
      excellentCount: (old ? old.excellentCount | 0 : 0) + (r.excellentCount | 0),
    },
  });
}

/**
 * Saves the `data.result.tune` plays of a prop / Qubell / clan `gameend.regist`.
 * Returns the saved plays in order, for the profile's last-played song.
 */
export async function saveResultTunes(refid: string, d: KDataReader) {
  const saved: { musicId: number; seq: number }[] = [];
  for (const tune of d.elements("data.result.tune") || []) {
    const musicId = tune.number("music");
    const attr = tune.attr("player.score") || {};
    const seq = parseInt(attr.seq);
    if (!musicId || isNaN(seq)) continue;
    await addPlay(refid, musicId, seq, tune.number("player.score") | 0, parseInt(attr.clear) | 0, tune.numbers("player.mbar"));
    saved.push({ musicId, seq });
  }
  return saved;
}

/**
 * `mdata_list` for versions before festo. The game asks three times
 * (mdata_ver 1 to 3); songs are split by music id so each answer stays small.
 */
export function legacyMdata(scores: Score[], part: number) {
  const byMusic: { [id: string]: Score[] } = {};
  for (const s of scores) (byMusic[String(s.musicId)] = byMusic[String(s.musicId)] || []).push(s);
  const ids = Object.keys(byMusic).sort((a, b) => parseInt(a) - parseInt(b));
  const per = Math.ceil(ids.length / 3);
  const mine = ids.length < 50 ? (part === 1 ? ids : []) : ids.slice((part - 1) * per, part * per);

  return mine.map(id => {
    const play = [0, 0, 0], clr = [0, 0, 0], fc = [0, 0, 0], ex = [0, 0, 0], pts = [0, 0, 0], flags = [0, 0, 0];
    const bars: any[] = [];
    for (const s of byMusic[id]) {
      play[s.seq] = s.playCount | 0; clr[s.seq] = s.clearCount | 0;
      fc[s.seq] = s.fullcomboCount | 0; ex[s.seq] = s.excellentCount | 0;
      pts[s.seq] = s.score | 0;
      let f = Flag.PLAYED;
      if (s.clearCount > 0 || (s.clear & Flag.CLEARED)) f |= Flag.CLEARED;
      if (s.fullcomboCount > 0 || (s.clear & Flag.FULL_COMBO)) f |= Flag.FULL_COMBO;
      if (s.excellentCount > 0 || (s.clear & Flag.EXCELLENT)) f |= Flag.EXCELLENT;
      flags[s.seq] = f;
      if (s.bar && s.bar.length) bars.push(K.ARRAY("u8", fix(s.bar, 30, 0), { seq: String(s.seq) }));
    }
    return K.ATTR({ music_id: id }, {
      play_cnt: K.ARRAY("s32", play), clear_cnt: K.ARRAY("s32", clr),
      fc_cnt: K.ARRAY("s32", fc), ex_cnt: K.ARRAY("s32", ex),
      score: K.ARRAY("s32", pts), clear: K.ARRAY("s8", flags),
      ...(bars.length ? { bar: bars } : {}),
    });
  });
}

/** Music ids by total plays across all players, most played first. */
export async function mostPlayed(version: VersionInfo, count: number): Promise<number[]> {
  const plays: { [id: string]: number } = {};
  for (const s of await DB.Find<Score>(null, { collection: "score" })) {
    if (version.maxMusicId !== undefined && s.musicId > version.maxMusicId) continue;
    plays[String(s.musicId)] = (plays[String(s.musicId)] || 0) + (s.playCount | 0);
  }
  return Object.keys(plays).sort((a, b) => plays[b] - plays[a]).slice(0, count).map(id => parseInt(id));
}
