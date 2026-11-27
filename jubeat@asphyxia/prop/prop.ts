declare const BigInt: any; // CORE typecheck targets es2017
// jubeat prop (L44, model dates 2015022000 - 2016032999) handlers for Asphyxia CORE.
//
// Request/response layout follows bemaniutils' bemani/backend/jubeat/prop.py, and was checked
// against the property paths referenced by prop's jubeat.dll / course_db.dll / league_db.dll
// (data/player/{info,last,item,history,fc_challenge,news,rivallist,lab_edit_seq,free_first_play,
// event_info,jbox,career,league,new_music,eapass_privilege,bonus_music,bistro,navi,cabinet_survey,
// kaitou_bisco,gift_list}, data/course_list, data/league_list, ...).
//
// Storage (separate from the festo and qubell collections):
//   prop_profile  one per card
//   prop_score    one per (musicId, seq)
//   prop_course   one per course id
//   prop_league   one per weekly league id

import { PROP_COURSES } from "./courses";

// ---------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------
const fill = (n: number, v: number): number[] => new Array(n).fill(v);
const s32a = (v: number[]) => K.ARRAY("s32", v);
const fix = (v: any, n: number, def: number): number[] => {
  const a = Array.isArray(v) ? v.slice(0, n) : [];
  while (a.length < n) a.push(def);
  return a;
};
const ok = (v: any): boolean => v !== undefined && v !== null && !(typeof v === "number" && isNaN(v));

const FLAG_PLAYED = 0x1, FLAG_CLEARED = 0x2, FLAG_FC = 0x4, FLAG_EX = 0x8;

// Course ratings as the game sends/expects them.
const COURSE_RATING_FAILED = 1;

const WEEK = 604800, DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

// Deterministic PRNG so every cabinet agrees on the weekly league / daily FC challenge songs.
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Songs known to exist in prop: everything referenced by the course list.
const SONG_POOL: number[] = Array.from(new Set(
  PROP_COURSES.reduce((a, c) => a.concat(c.music.map(m => m[0])), [] as number[]))).sort((a, b) => a - b);
const pickSongs = (seed: number, n: number): number[] => {
  const rnd = mulberry32(seed), pool = SONG_POOL.slice(), out: number[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
};

const currentLeagueId = () => Math.floor(nowSec() / WEEK);
const leagueSongs = (leagueId: number) => pickSongs(leagueId * 7919 + 1, 3);
const currentDayId = () => Math.floor(nowSec() / DAY);
const fcChallenge = (dayId: number) => { const s = pickSongs(dayId * 104729 + 2, 2); return { today: s[0], whim: s[1] }; };

// ---------------------------------------------------------------------------------------------
// models
// ---------------------------------------------------------------------------------------------
export interface PProfile {
  collection: "prop_profile";
  jid: number;
  name: string;
  saved: boolean;
  jubility: number; jubility_yday: number;
  tune_cnt: number; save_cnt: number; saved_cnt: number; fc_cnt: number; ex_cnt: number;
  pf_cnt: number; clear_cnt: number; match_cnt: number; beat_cnt: number; mynews_cnt: number;
  total_best_score: number;
  bonus_tune_points: number; is_bonus_tune_played: boolean;
  last: {
    play_time: number; shopname: string; areaname: string;
    music_id: number; seq_id: number; sort: number; category: number; expert_option: number;
    marker: number; theme: number; title: number; parts: number;
    rank_sort: number; combo_disp: number; matching: number; hazard: number; hard: number;
    emblem: number[];
    last_course_id: number;
    league_class: number; league_subclass: number;
  };
  music_list: number[]; theme_list: number; marker_list: number[];
  title_list: number[]; parts_list: number[]; emblem_list: number[];
  theme_list_new: number; marker_list_new: number[];
  career: { level: number; point: number; param: number[]; is_unlocked: boolean };
  jbox_point: number; jbox_normal_index: number; jbox_premium_index: number;
  navi_flag: number; kaitou_bisco_read_flag: number;
  events: { [type: string]: boolean };
  league_class: number; league_subclass: number;
  league_is_checked: boolean; league_is_first_play: boolean;
  league_eval_id: number;           // last league week that promotion/demotion was applied for
  fc_day: number; fc_played: number[]; // FC challenge [today, whim] played on fc_day
}

export interface PScore {
  collection: "prop_score";
  musicId: number; seq: number;
  score: number; clear: number; combo: number;
  playCnt: number; clearCnt: number; fcCnt: number; exCnt: number;
  bar: number[];
  time: number;
}

export interface PCourse {
  collection: "prop_course";
  courseId: number;
  rating: number;
  scores: number[];
}

export interface PLeague {
  collection: "prop_league";
  leagueId: number;
  score: number[];
  clear: number[];
}

const newProfile = (name: string, jid: number): PProfile => ({
  collection: "prop_profile",
  jid, name, saved: false,
  jubility: 0, jubility_yday: 0,
  tune_cnt: 0, save_cnt: 0, saved_cnt: 0, fc_cnt: 0, ex_cnt: 0,
  pf_cnt: 0, clear_cnt: 0, match_cnt: 0, beat_cnt: 0, mynews_cnt: 0, total_best_score: 0,
  bonus_tune_points: 0, is_bonus_tune_played: false,
  last: {
    play_time: 0, shopname: "", areaname: "",
    music_id: 0, seq_id: 0, sort: 0, category: 0, expert_option: 0,
    marker: 0, theme: 0, title: 0, parts: 0, rank_sort: 0, combo_disp: 0,
    matching: 0, hazard: 0, hard: 0, emblem: [0, 0, 0, 0, 0],
    last_course_id: -1, league_class: 1, league_subclass: 5,
  },
  music_list: fill(32, -1), theme_list: -1, marker_list: fill(2, -1),
  title_list: fill(160, -1), parts_list: fill(160, -1), emblem_list: fill(96, 0),
  theme_list_new: -1, marker_list_new: fill(2, -1),
  career: { level: 1, point: 0, param: fill(10, -1), is_unlocked: false },
  jbox_point: 0, jbox_normal_index: 2, jbox_premium_index: 1,
  navi_flag: 0, kaitou_bisco_read_flag: 0,
  events: {},
  league_class: 1, league_subclass: 5, league_is_checked: true, league_is_first_play: true,
  league_eval_id: 0,
  fc_day: 0, fc_played: [0, 0],
});

// ---------------------------------------------------------------------------------------------
// global "info" node (shopinfo.regist, gametop.get_info, and inside every profile)
// ---------------------------------------------------------------------------------------------
const EVENTS = [5, 6, 9, 14, 15, 16, 17, 18, 19];

export const propInfo = () => ({
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

// ---------------------------------------------------------------------------------------------
// league promotion / demotion
// ---------------------------------------------------------------------------------------------
// Class 1-4 (Amateur, Regular, Master, Legend), subclass 5 (lowest) .. 1 (highest); Legend has
// only subclass 1. Rank 0..15 is the linear order of those.
const classToRank = (c: number, s: number): number => {
  c = Math.min(4, Math.max(1, c | 0)); s = Math.min(5, Math.max(1, s | 0));
  return c === 4 ? 15 : (c - 1) * 5 + (5 - s);
};
const rankToClass = (r: number): [number, number] => {
  r = Math.min(15, Math.max(0, r | 0));
  return r === 15 ? [4, 1] : [Math.floor(r / 5) + 1, 5 - (r % 5)];
};

const shiftClass = (p: PProfile, delta: number) => {
  const [nc, ns] = rankToClass(classToRank(p.league_class, p.league_subclass) + delta);
  if (nc === p.league_class && ns === p.league_subclass) return;
  // Remember the class the player last saw, so the game can show the change.
  if (p.league_is_checked) {
    p.last.league_class = p.league_class;
    p.last.league_subclass = p.league_subclass;
  }
  p.league_class = nc; p.league_subclass = ns;
  p.league_is_checked = false;
};

const leagueTotal = (l: PLeague) => fix(l.score, 3, 0).reduce((a, b) => a + b, 0);

// Lazily apply the weekly league evaluation (bemaniutils does this from a weekly cron job):
// top 30% of last week's participants are promoted, the bottom ~30% demoted, and players who
// have been absent for every second week since they last played are demoted.
const evaluateLeague = async (refid: string, p: PProfile): Promise<boolean> => {
  const cur = currentLeagueId();
  if ((p.league_eval_id | 0) >= cur) return false;
  const mine = await DB.Find<PLeague>(refid, { collection: "prop_league" });
  const played = new Set(mine.map(l => l.leagueId));
  const from = Math.max((p.league_eval_id | 0) + 1, cur - 52);
  for (let w = from; w <= cur; w++) {
    const prev = w - 1;
    let lastPlayed = 0;
    played.forEach(id => { if (id < w && id > lastPlayed) lastPlayed = id; });
    if (lastPlayed === 0) continue; // never played a league before this week
    if (played.has(prev)) {
      const all = await DB.Find<PLeague>(null, { collection: "prop_league", leagueId: prev });
      const sorted = all.map(l => ({ refid: (l as any).__refid, total: leagueTotal(l) }))
        .sort((a, b) => b.total - a.total);
      const promoted = Math.ceil(sorted.length * 0.3);
      const rest = sorted.slice(promoted);
      const demoted = Math.ceil(rest.length * 0.42);
      const idx = sorted.findIndex(x => x.refid === refid);
      if (idx >= 0 && idx < promoted) shiftClass(p, +1);
      else if (idx >= promoted && demoted > 0 && idx >= sorted.length - demoted) shiftClass(p, -1);
    } else {
      const weeksDifferent = (w - lastPlayed) - 1;
      if (weeksDifferent >= 2 && weeksDifferent % 2 === 0) shiftClass(p, -1);
    }
  }
  p.league_eval_id = cur;
  return true;
};

// ---------------------------------------------------------------------------------------------
// profile -> response
// ---------------------------------------------------------------------------------------------
const formatProfile = (p: PProfile) => {
  const l = p.last;
  const emblem = fix(l.emblem, 5, 0);
  if (emblem[1] === 0) emblem[1] = 2; // default main part, as bemaniutils does
  const career = p.career || { level: 1, point: 0, param: fill(10, -1), is_unlocked: false };
  const fc = fcChallenge(currentDayId());
  const fcPlayed = p.fc_day === currentDayId() ? fix(p.fc_played, 2, 0) : [0, 0];

  return {
    data: {
      info: propInfo(),
      player: {
        name: K.ITEM("str", p.name),
        jid: K.ITEM("s32", p.jid),
        session_id: K.ITEM("s32", 1),
        event_flag: K.ITEM("u64", BigInt(0)),
        info: {
          jubility: K.ITEM("s16", p.jubility | 0),
          jubility_yday: K.ITEM("s16", p.jubility_yday | 0),
          tune_cnt: K.ITEM("s32", p.tune_cnt | 0),
          save_cnt: K.ITEM("s32", p.save_cnt | 0),
          saved_cnt: K.ITEM("s32", p.saved_cnt | 0),
          fc_cnt: K.ITEM("s32", p.fc_cnt | 0),
          ex_cnt: K.ITEM("s32", p.ex_cnt | 0),
          clear_cnt: K.ITEM("s32", p.clear_cnt | 0),
          pf_cnt: K.ITEM("s32", p.pf_cnt | 0),
          match_cnt: K.ITEM("s32", p.match_cnt | 0),
          beat_cnt: K.ITEM("s32", p.beat_cnt | 0),
          mynews_cnt: K.ITEM("s32", p.mynews_cnt | 0),
          bonus_tune_points: K.ITEM("s32", p.bonus_tune_points | 0),
          is_bonus_tune_played: K.ITEM("bool", !!p.is_bonus_tune_played),
          // true would mark this as a carried-over profile and skip the tutorial; there is no
          // older-version data to inherit from here.
          inherit: K.ITEM("bool", false),
          mtg_entry_cnt: K.ITEM("s32", 123),
          mtg_hold_cnt: K.ITEM("s32", 456),
          mtg_result: K.ITEM("u8", 10),
        },
        last: {
          play_time: K.ITEM("s64", BigInt(l.play_time || 0)),
          shopname: K.ITEM("str", l.shopname || ""),
          areaname: K.ITEM("str", l.areaname || ""),
          expert_option: K.ITEM("s8", l.expert_option | 0),
          category: K.ITEM("s8", l.category | 0),
          sort: K.ITEM("s8", l.sort | 0),
          music_id: K.ITEM("s32", l.music_id | 0),
          seq_id: K.ITEM("s8", l.seq_id | 0),
          settings: {
            marker: K.ITEM("s8", l.marker | 0),
            theme: K.ITEM("s8", l.theme | 0),
            title: K.ITEM("s16", l.title | 0),
            parts: K.ITEM("s16", l.parts | 0),
            rank_sort: K.ITEM("s8", l.rank_sort | 0),
            combo_disp: K.ITEM("s8", l.combo_disp | 0),
            matching: K.ITEM("s8", l.matching | 0),
            hazard: K.ITEM("s8", l.hazard | 0),
            hard: K.ITEM("s8", l.hard | 0),
            emblem: K.ARRAY("s16", emblem),
          },
        },
        item: {
          music_list: s32a(fix(p.music_list, 32, -1)),
          secret_list: s32a(fill(32, -1)),          // force-unlock all secret songs
          theme_list: K.ITEM("s16", ok(p.theme_list) ? p.theme_list : -1),
          marker_list: s32a(fix(p.marker_list, 2, -1)),
          title_list: s32a(fix(p.title_list, 160, -1)),
          parts_list: s32a(fix(p.parts_list, 160, -1)),
          emblem_list: s32a(fix(p.emblem_list, 96, 0)),
          new: {
            secret_list: s32a(fill(32, -1)),
            theme_list: K.ITEM("s16", ok(p.theme_list_new) ? p.theme_list_new : -1),
            marker_list: s32a(fix(p.marker_list_new, 2, -1)),
          },
        },
        history: K.ATTR({ count: "0" }),
        lab_edit_seq: K.ATTR({ count: "0" }),
        cabinet_survey: { read_flag: K.ITEM("u32", 0) },
        kaitou_bisco: { read_flag: K.ITEM("u32", p.kaitou_bisco_read_flag | 0) },
        navi: { flag: K.ITEM("u32", p.navi_flag | 0) },
        event_info: {
          event: Object.keys(p.events || {}).map(t =>
            K.ATTR({ type: t }, { state: K.ITEM("u8", p.events[t] ? 0x2 : 0x0) })),
        },
        fc_challenge: {
          today: { music_id: K.ITEM("s32", fc.today), state: K.ITEM("u8", fcPlayed[0] ? 0x40 : 0) },
          whim: { music_id: K.ITEM("s32", fc.whim), state: K.ITEM("u8", fcPlayed[1] ? 0x40 : 0) },
        },
        news: { checked: K.ITEM("s16", 0), checked_flag: K.ITEM("u32", 0) },
        rivallist: K.ATTR({ count: "0" }),
        free_first_play: {
          is_available: K.ITEM("bool", false),
          point: K.ITEM("s32", 0),
          point_used: K.ITEM("s32", 0),
          come_come_jbox: {
            is_valid: K.ITEM("bool", false),
            end_time_if_paired: K.ITEM("s64", BigInt(0)),
          },
        },
        jbox: {
          point: K.ITEM("s32", p.jbox_point | 0),
          emblem: {
            normal: { index: K.ITEM("s16", p.jbox_normal_index || 2) },
            premium: { index: K.ITEM("s16", p.jbox_premium_index || 1) },
          },
        },
        career: {
          level: K.ITEM("s16", career.level || 1),
          point: K.ITEM("s32", career.point | 0),
          param: s32a(fix(career.param, 10, -1)),
          is_unlocked: K.ITEM("bool", !!career.is_unlocked),
        },
        league: {
          is_first_play: K.ITEM("bool", p.league_is_first_play !== false),
          class: K.ITEM("s32", p.league_class || 1),
          subclass: K.ITEM("s32", p.league_subclass || 5),
        },
        new_music: {},
        eapass_privilege: { emblem_list: {} },
        bonus_music: {
          music: {},
          event_id: K.ITEM("s32", -1),
          till_time: K.ITEM("str", ""),
        },
        bistro: {
          chef: { id: K.ITEM("s32", 1) },
          carry_over: K.ITEM("s32", 0),
          route_list: { route_count: K.ITEM("u8", 0) },
          extension: K.ITEM("bool", false),
        },
        gift_list: {},
      },
    },
  };
};

// ---------------------------------------------------------------------------------------------
// DB access
// ---------------------------------------------------------------------------------------------
const findProfile = (refid: string) =>
  DB.FindOne<PProfile>(refid, { collection: "prop_profile" });

const saveProfile = async (refid: string, p: PProfile) => {
  const { __refid, _id, createdAt, updatedAt, ...plain } = p as any;
  await DB.Update<PProfile>(refid, { collection: "prop_profile" }, { $set: plain });
};

const nextJid = async (): Promise<number> => {
  // 8-digit id, unique across every jubeat collection this plugin keeps
  for (let i = 0; i < 20; i++) {
    const jid = 10000000 + Math.floor(Math.random() * 89999999);
    const hit = await DB.FindOne<PProfile>(null, { collection: "prop_profile", jid });
    if (!hit) return jid;
  }
  return 10000000 + Math.floor(Math.random() * 89999999);
};

const createProfile = async (refid: string, name: string) => {
  await DB.Upsert<PProfile>(refid, { collection: "prop_profile" }, newProfile(name, await nextJid()));
  return findProfile(refid);
};

// Profile lookups by jid, also used for get_mdata / get_course / get_league.
const profileByJid = (jid: number) => DB.FindOne<PProfile>(null, { collection: "prop_profile", jid });

// ---------------------------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------------------------
export const shopinfoRegist = (info: EamuseInfo, data: any, send: EamuseSend) =>
  send.object({
    data: {
      cabid: K.ITEM("u32", 1),
      locationid: K.ITEM("str", $(data).str("shop.locationid") || "nowhere"),
      tax_phase: K.ITEM("u8", 1),
      facility: { exist: K.ITEM("u32", 1) },
      info: propInfo(),
    },
  }, { compress: true });

export const gametopGetInfo = (info: EamuseInfo, data: any, send: EamuseSend) =>
  send.object({ data: { info: propInfo() } }, { compress: true });

export const gametopRegist = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const refid = $(data).str("data.player.refid");
  const name = $(data).str("data.player.name") || "なし";
  if (!refid) return send.deny();
  let p = await findProfile(refid);
  if (!p) p = await createProfile(refid, name);
  console.log(`[jubeat/prop] gametop.regist -> jid ${p.jid} name ${p.name}`);
  return send.object(formatProfile(p), { compress: true });
};

export const gametopGetPdata = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const refid = $(data).str("data.player.refid");
  if (!refid) return send.deny();
  let p = await findProfile(refid);
  if (!p) {
    // CORE already reports this card as registered for L44 when it has a festo or qubell
    // profile, so prop never calls gametop.regist for it. Create the prop profile here,
    // reusing the name from the other version.
    const q: any = await DB.FindOne<any>(refid, { collection: "qubell_profile" });
    const f: any = await DB.FindOne<any>(refid, { collection: "profile" });
    const name = (q && q.name) || (f && f.name) || "なし";
    p = await createProfile(refid, String(name));
    console.log(`[jubeat/prop] gametop.get_pdata: created profile, name=${p.name} jid=${p.jid}`);
  }
  if (await evaluateLeague(refid, p)) await saveProfile(refid, p);
  return send.object(formatProfile(p), { compress: true });
};

export const gametopGetMdata = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const jid = $(data).number("data.player.jid");
  const part = Math.min(3, Math.max(1, $(data).number("data.player.mdata_ver", 1)));
  if (!jid) return send.deny();
  const p = await profileByJid(jid);
  if (!p) return send.status(109);

  // The game fetches scores in three parts (mdata_ver 1..3). Split songs deterministically by
  // sorted music id so each response stays small.
  const scores = await DB.Find<PScore>(p.__refid, { collection: "prop_score" });
  const byMusic: { [id: string]: PScore[] } = {};
  for (const s of scores) {
    if (s.seq < 0 || s.seq > 2) continue; // prop only has basic/advanced/extreme
    (byMusic[String(s.musicId)] = byMusic[String(s.musicId)] || []).push(s);
  }
  const ids = Object.keys(byMusic).sort((a, b) => parseInt(a) - parseInt(b));
  const per = Math.ceil(ids.length / 3);
  const mine = ids.length < 50 ? (part === 1 ? ids : []) : ids.slice((part - 1) * per, part * per);

  const musicdata = mine.map(id => {
    const play = [0, 0, 0], clr = [0, 0, 0], fc = [0, 0, 0], ex = [0, 0, 0], pts = [0, 0, 0], flags = [0, 0, 0];
    const bars: any[] = [];
    for (const s of byMusic[id]) {
      play[s.seq] = s.playCnt | 0; clr[s.seq] = s.clearCnt | 0; fc[s.seq] = s.fcCnt | 0; ex[s.seq] = s.exCnt | 0;
      pts[s.seq] = s.score | 0;
      let f = FLAG_PLAYED;
      if (s.clearCnt > 0) f |= FLAG_CLEARED;
      if (s.fcCnt > 0) f |= FLAG_FC;
      if (s.exCnt > 0) f |= FLAG_EX;
      flags[s.seq] = f;
      if (s.bar && s.bar.length) bars.push(K.ARRAY("u8", s.bar, { seq: String(s.seq) }));
    }
    return K.ATTR({ music_id: id }, {
      play_cnt: s32a(play), clear_cnt: s32a(clr), fc_cnt: s32a(fc), ex_cnt: s32a(ex),
      score: s32a(pts), clear: K.ARRAY("s8", flags),
      ...(bars.length ? { bar: bars } : {}),
    });
  });

  return send.object({
    data: { player: { jid: K.ITEM("s32", jid), mdata_list: { musicdata } } },
  }, { compress: true });
};

export const gametopGetCourse = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const jid = $(data).number("data.player.jid");
  const p = jid ? await profileByJid(jid) : null;
  const results = p ? await DB.Find<PCourse>(p.__refid, { collection: "prop_course" }) : [];
  const valid = new Set(PROP_COURSES.map(c => c.id));

  const course = PROP_COURSES.map(c => {
    const ids = [0, 0, 0], bronze = [0, 0, 0], silver = [0, 0, 0], gold = [0, 0, 0];
    c.norma.slice(0, 3).forEach((n, i) => { ids[i] = n[0]; bronze[i] = n[1]; silver[i] = n[2]; gold[i] = n[3]; });
    return {
      id: K.ITEM("s32", c.id),
      name: K.ITEM("str", c.name),
      level: K.ITEM("u8", c.level),
      norma: {
        norma_id: s32a(ids),
        bronze_value: s32a(bronze),
        silver_value: s32a(silver),
        gold_value: s32a(gold),
      },
      music_list: {
        music: c.music.map((m, i) => K.ATTR({ index: String(i) }, {
          music_id: K.ITEM("s32", m[0]),
          seq: K.ITEM("u8", m[1]),
        })),
      },
    };
  });

  return send.object({
    data: {
      course_list: { course },
      player_list: {
        player: {
          jid: K.ITEM("s32", jid | 0),
          result_list: {
            result: results.filter(r => valid.has(r.courseId)).map(r => ({
              id: K.ITEM("s32", r.courseId),
              rating: K.ITEM("u8", r.rating | 0),
              score: s32a(fix(r.scores, 5, 0)),
            })),
          },
        },
      },
      last_course_id: K.ITEM("s32", p && ok(p.last.last_course_id) ? p.last.last_course_id : -1),
    },
  }, { compress: true });
};

export const gametopGetLeague = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const jid = $(data).number("data.player.jid");
  const p = jid ? await profileByJid(jid) : null;
  if (p && await evaluateLeague(p.__refid, p)) await saveProfile(p.__refid, p);

  const leagueId = currentLeagueId();
  const mine = p ? await DB.FindOne<PLeague>(p.__refid, { collection: "prop_league", leagueId }) : null;
  const cls = p ? (p.league_class || 1) : 1;

  return send.object({
    data: {
      league_list: {
        league: K.ATTR({ index: "0" }, {
          id: K.ITEM("s32", leagueId),
          stime: K.ITEM("u64", BigInt(leagueId * WEEK * 1000)),
          etime: K.ITEM("u64", BigInt((leagueId + 1) * WEEK * 1000)),
          music_list: {
            music: leagueSongs(leagueId).map((m, i) => K.ATTR({ index: String(i) }, {
              music_id: K.ITEM("s32", m),
              seq: K.ITEM("u8", cls === 1 ? 1 : 2),
            })),
          },
          player_list: {
            player: {
              jid: K.ITEM("s32", jid | 0),
              result: {
                score: s32a(fix(mine && mine.score, 3, 0)),
                clear: K.ARRAY("s8", fix(mine && mine.clear, 3, 0)),
              },
            },
          },
        }),
      },
      last_class: K.ITEM("s32", p ? (p.last.league_class || 1) : 1),
      last_subclass: K.ITEM("s32", p ? (p.last.league_subclass || 5) : 5),
      is_checked: K.ITEM("bool", p ? p.league_is_checked !== false : true),
    },
  }, { compress: true });
};

export const gametopGetMeeting = (info: EamuseInfo, data: any, send: EamuseSend) =>
  send.object({
    data: {
      meeting: { single: K.ATTR({ count: "0" }), tag: K.ATTR({ count: "0" }) },
      reward: { total: K.ITEM("s32", -1), point: K.ITEM("s32", -1) },
    },
  }, { compress: true });

export const gameendRegist = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const refid = $(data).str("data.player.refid");
  if (!refid) return send.deny();
  const p = await findProfile(refid);
  if (!p) return send.deny();
  const d = $(data);
  const num = (path: string, def: number) => { const v = d.number(path); return ok(v) ? v : def; };
  const nums = (path: string, n: number, cur: number[], def: number) => {
    const v = d.numbers(path); return (v && v.length) ? fix(v, n, def) : cur;
  };

  p.saved = true;
  p.last.play_time = num("data.info.time_gameend", p.last.play_time);
  p.last.shopname = d.str("data.info.shopname") || p.last.shopname;
  p.last.areaname = d.str("data.info.areaname") || p.last.areaname;

  if (d.element("data.player.info")) {
    const I = "data.player.info.";
    p.jubility = num(I + "jubility", p.jubility); p.jubility_yday = num(I + "jubility_yday", p.jubility_yday);
    p.tune_cnt = num(I + "tune_cnt", p.tune_cnt); p.save_cnt = num(I + "save_cnt", p.save_cnt);
    p.saved_cnt = num(I + "saved_cnt", p.saved_cnt); p.fc_cnt = num(I + "fc_cnt", p.fc_cnt);
    p.ex_cnt = num(I + "ex_cnt", p.ex_cnt); p.pf_cnt = num(I + "pf_cnt", p.pf_cnt);
    p.clear_cnt = num(I + "clear_cnt", p.clear_cnt); p.match_cnt = num(I + "match_cnt", p.match_cnt);
    p.beat_cnt = num(I + "beat_cnt", p.beat_cnt); p.mynews_cnt = num(I + "mynews_cnt", p.mynews_cnt);
    p.total_best_score = num(I + "total_best_score", p.total_best_score);
    p.bonus_tune_points = num(I + "bonus_tune_points", p.bonus_tune_points);
    p.is_bonus_tune_played = d.bool(I + "is_bonus_tune_played");
  }

  if (d.element("data.player.last")) {
    const L = "data.player.last.";
    p.last.expert_option = num(L + "expert_option", p.last.expert_option);
    p.last.sort = num(L + "sort", p.last.sort);
    p.last.category = num(L + "category", p.last.category);
    const S = L + "settings.";
    p.last.matching = num(S + "matching", p.last.matching); p.last.hazard = num(S + "hazard", p.last.hazard);
    p.last.hard = num(S + "hard", p.last.hard); p.last.marker = num(S + "marker", p.last.marker);
    p.last.theme = num(S + "theme", p.last.theme); p.last.title = num(S + "title", p.last.title);
    p.last.parts = num(S + "parts", p.last.parts); p.last.rank_sort = num(S + "rank_sort", p.last.rank_sort);
    p.last.combo_disp = num(S + "combo_disp", p.last.combo_disp);
    p.last.emblem = nums(S + "emblem", 5, fix(p.last.emblem, 5, 0), 0);
  }

  if (d.element("data.player.item")) {
    // secret_list is not stored: it is force-unlocked on load, so the game echoes all bits back.
    const T = "data.player.item.";
    p.music_list = nums(T + "music_list", 32, p.music_list, -1);
    p.theme_list = num(T + "theme_list", p.theme_list);
    p.marker_list = nums(T + "marker_list", 2, p.marker_list, -1);
    p.title_list = nums(T + "title_list", 160, p.title_list, -1);
    p.parts_list = nums(T + "parts_list", 160, p.parts_list, -1);
    p.emblem_list = nums(T + "emblem_list", 96, p.emblem_list, 0);
    p.theme_list_new = num(T + "new.theme_list", p.theme_list_new);
    p.marker_list_new = nums(T + "new.marker_list", 2, p.marker_list_new, -1);
  }

  if (d.element("data.player.career")) {
    const C = "data.player.career.";
    const c = p.career || { level: 1, point: 0, param: fill(10, -1), is_unlocked: false };
    c.level = num(C + "level", c.level);
    c.point = num(C + "point", c.point);
    c.param = nums(C + "param", 10, c.param, -1);
    c.is_unlocked = d.bool(C + "is_unlocked");
    p.career = c;
  }

  if (d.element("data.player.jbox")) {
    p.jbox_point = num("data.player.jbox.point", p.jbox_point);
    const jbType = num("data.player.jbox.emblem.type", 0), jbIndex = num("data.player.jbox.emblem.index", 0);
    if (jbType === 1) p.jbox_normal_index = jbIndex;
    else if (jbType === 2) p.jbox_premium_index = jbIndex;
  }

  p.events = p.events || {};
  for (const ev of d.elements("data.player.event_info.event") || []) {
    const t = ev.attr("").type;
    if (t !== undefined) p.events[String(t)] = ev.bool("is_completed");
  }

  p.navi_flag = num("data.player.navi.flag", p.navi_flag);
  p.kaitou_bisco_read_flag = num("data.player.kaitou_bisco.read_flag", p.kaitou_bisco_read_flag);

  // scores
  const fc = fcChallenge(currentDayId());
  if (p.fc_day !== currentDayId()) { p.fc_day = currentDayId(); p.fc_played = [0, 0]; }
  let saved = 0;
  for (const tune of d.elements("data.result.tune") || []) {
    const musicId = tune.number("music");
    const sa = tune.attr("player.score") || {};
    const seq = parseInt(sa.seq), flags = parseInt(sa.clear) | 0, combo = parseInt(sa.combo) | 0;
    const points = tune.number("player.score") | 0;
    const bar = tune.numbers("player.mbar");
    if (!musicId || isNaN(seq)) continue;
    p.last.music_id = musicId; p.last.seq_id = seq;
    if (musicId === fc.today) p.fc_played[0] = 1;
    if (musicId === fc.whim) p.fc_played[1] = 1;

    const old = await DB.FindOne<PScore>(refid, { collection: "prop_score", musicId, seq });
    const ns: PScore = old || {
      collection: "prop_score", musicId, seq, score: 0, clear: 0, combo: 0,
      playCnt: 0, clearCnt: 0, fcCnt: 0, exCnt: 0, bar: [], time: 0,
    };
    ns.playCnt = (ns.playCnt | 0) + 1;
    if (flags & FLAG_CLEARED) ns.clearCnt = (ns.clearCnt | 0) + 1;
    if (flags & FLAG_FC) ns.fcCnt = (ns.fcCnt | 0) + 1;
    if (flags & FLAG_EX) ns.exCnt = (ns.exCnt | 0) + 1;
    // keep the ghost of the best score
    if (bar && bar.length && (points >= (ns.score | 0) || !(ns.bar && ns.bar.length))) ns.bar = bar;
    ns.score = Math.max(ns.score | 0, points);
    ns.clear = (ns.clear | 0) | flags;
    ns.combo = Math.max(ns.combo | 0, combo);
    await DB.Upsert<PScore>(refid, { collection: "prop_score", musicId, seq }, {
      $set: {
        musicId, seq, score: ns.score, clear: ns.clear, combo: ns.combo,
        playCnt: ns.playCnt, clearCnt: ns.clearCnt, fcCnt: ns.fcCnt, exCnt: ns.exCnt,
        bar: ns.bar, time: Date.now(),
      },
    });
    saved++;
  }

  // course save
  if (d.element("data.player.course")) {
    const courseId = d.number("data.player.course.course_id");
    const rating = num("data.player.course.rating", COURSE_RATING_FAILED);
    const scores = [0, 0, 0, 0, 0];
    for (const m of d.elements("data.player.course.music") || []) {
      const idx = parseInt(m.attr("").index);
      if (!isNaN(idx) && idx >= 0 && idx < 5) scores[idx] = m.number("score") | 0;
    }
    if (ok(courseId)) {
      const old = await DB.FindOne<PCourse>(refid, { collection: "prop_course", courseId });
      const sum = (a: number[]) => fix(a, 5, 0).reduce((x, y) => x + y, 0);
      const better = !old || rating > (old.rating | 0) || (rating === (old.rating | 0) && sum(scores) > sum(old.scores));
      if (better) {
        await DB.Upsert<PCourse>(refid, { collection: "prop_course", courseId }, {
          $set: { courseId, rating: Math.max(rating, old ? old.rating | 0 : 0), scores },
        });
      }
      p.last.last_course_id = courseId;
    }
  }

  // league save
  if (d.element("data.player.league")) {
    const leagueId = d.number("data.player.league.league_id");
    p.league_is_checked = d.bool("data.player.league.is_checked");
    p.league_is_first_play = d.bool("data.player.league.is_first_play");
    const score = [0, 0, 0], clear = [0, 0, 0];
    for (const m of d.elements("data.player.league.music") || []) {
      const idx = parseInt(m.attr("").index);
      if (isNaN(idx) || idx < 0 || idx > 2) continue;
      score[idx] = m.number("score") | 0;
      clear[idx] = parseInt((m.attr("score") || {}).clear) | 0;
    }
    if (ok(leagueId)) {
      const old = await DB.FindOne<PLeague>(refid, { collection: "prop_league", leagueId });
      if (!old || leagueTotal(old) < score.reduce((a, b) => a + b, 0)) {
        await DB.Upsert<PLeague>(refid, { collection: "prop_league", leagueId }, { $set: { leagueId, score, clear } });
      }
    }
  }

  await saveProfile(refid, p);
  console.log(`[jubeat/prop] gameend.regist jid ${p.jid}: ${saved} tune(s) saved`);
  return send.object({
    data: { player: { session_id: K.ITEM("s32", 1), end_final_session_id: K.ITEM("s32", 1) } },
  }, { compress: true });
};

export const lobbyCheck = (info: EamuseInfo, data: any, send: EamuseSend) =>
  send.object({
    data: {
      interval: K.ITEM("s16", 0),
      entry_timeout: K.ITEM("s16", 0),
      entrant_nr: K.ITEM("u32", 0, { time: "0" }),
    },
  }, { compress: true });

export const demodataGetNews = (info: EamuseInfo, data: any, send: EamuseSend) =>
  send.object({ data: { officialnews: K.ATTR({ count: "0" }) } }, { compress: true });

export const demodataGetHitchart = async (info: EamuseInfo, data: any, send: EamuseSend) => {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  // Top 10 songs by total plays across all prop players.
  const plays: { [id: string]: number } = {};
  for (const s of await DB.Find<PScore>(null, { collection: "prop_score" })) {
    plays[String(s.musicId)] = (plays[String(s.musicId)] || 0) + (s.playCnt | 0);
  }
  const top = Object.keys(plays).sort((a, b) => plays[b] - plays[a]).slice(0, 10);
  return send.object({
    data: {
      update: K.ITEM("str", `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`),
      hitchart_lic: K.ATTR({ count: "0" }),
      hitchart_org: K.ATTR({ count: String(top.length) }, {
        rankdata: top.map((id, i) => ({
          music_id: K.ITEM("s32", parseInt(id)),
          rank: K.ITEM("s16", i + 1),
          prev: K.ITEM("s16", i + 1),
        })),
      }),
    },
  }, { compress: true });
};
