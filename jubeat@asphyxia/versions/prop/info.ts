// prop's global "info" node (shopinfo.regist, gametop.get_info, and inside every profile),
// and the songs picked for the weekly league and the daily FC challenge.
// Layout from bemaniutils' bemani/backend/jubeat/prop.py (__get_global_info).

import { PROP_COURSES } from "../../data/prop_courses";

const fill = (n: number, v: number): number[] => new Array(n).fill(v);
const s32a = (v: number[]) => K.ARRAY("s32", v);

export const WEEK = 604800;
const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

// Deterministic PRNG so every cabinet agrees on the weekly league / daily FC challenge songs.
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Songs known to exist in prop: everything its course list uses.
const SONG_POOL: number[] = Array.from(new Set(
  PROP_COURSES.reduce((a, c) => a.concat(c.music.map(m => m[0])), [] as number[]))).sort((a, b) => a - b);

const pickSongs = (seed: number, n: number): number[] => {
  const rnd = mulberry32(seed), pool = SONG_POOL.slice(), out: number[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
};

/** League ids are week numbers since the epoch. */
export const currentLeagueId = () => Math.floor(nowSec() / WEEK);
export const leagueSongs = (leagueId: number) => pickSongs(leagueId * 7919 + 1, 3);

export const currentDayId = () => Math.floor(nowSec() / DAY);
export const fcChallenge = (dayId: number) => {
  const s = pickSongs(dayId * 104729 + 2, 2);
  return { today: s[0], whim: s[1] };
};

const EVENTS = [5, 6, 9, 14, 15, 16, 17, 18, 19];

export const info = () => ({
  event_info: {
    event: EVENTS.map(e => K.ATTR({ type: String(e) }, { state: K.ITEM("u8", 0) })),
  },
  share_music: {},
  bonus_music: {},
  only_now_music: {},
  fc_challenge: { today: { music_id: K.ITEM("s32", fcChallenge(currentDayId()).today) } },
  white_music_list: s32a(fill(32, -1)),
  open_music_list: s32a(fill(32, -1)),
  cabinet_survey: { id: K.ITEM("s32", -1), status: K.ITEM("s32", 0) },
  kaitou_bisco: { remaining_days: K.ITEM("s32", 0) },
  league: { status: K.ITEM("u8", 1) },
  bistro: { bistro_id: K.ITEM("u16", 0) },
  jbox: {
    point: K.ITEM("s32", 0),
    emblem: {
      normal: { index: K.ITEM("s16", 2) },
      premium: { index: K.ITEM("s16", 1) },
    },
  },
});
