declare const BigInt: any; // CORE typecheck targets es2017
// prop's profile, in the layout of bemaniutils' bemani/backend/jubeat/prop.py (format_profile,
// unformat_profile), checked against the property paths prop's jubeat.dll reads
// (data/player/{info,last,item,history,fc_challenge,news,rivallist,lab_edit_seq,free_first_play,
// event_info,jbox,career,league,new_music,eapass_privilege,bonus_music,bistro,navi,cabinet_survey,
// kaitou_bisco,gift_list}).

import Profile from "../../models/profile";
import { VersionInfo } from "../types";
import { findPlayer, loadPlayer, playerByJid } from "../../handlers/player";
import { legacyMdata, saveResultTunes, versionScores } from "../../handlers/scores";
import { PropData, loadProp, saveProp } from "./data";
import { currentDayId, fcChallenge, info as globalInfo } from "./info";
import { evaluateLeague, saveLeagueResult } from "./league";
import { saveCourseResult } from "./course";

const fill = (n: number, v: number): number[] => new Array(n).fill(v);
const s32a = (v: number[]) => K.ARRAY("s32", v);
const fix = (v: any, n: number, def: number): number[] => {
  const a = Array.isArray(v) ? v.slice(0, n) : [];
  while (a.length < n) a.push(def);
  return a;
};
const ok = (v: any): boolean => v !== undefined && v !== null && !(typeof v === "number" && isNaN(v));

// ---------------------------------------------------------------------------------------------
// profile -> response
// ---------------------------------------------------------------------------------------------
const format = (player: Profile, p: PropData) => {
  const l = p.last;
  const emblem = fix(l.emblem, 5, 0);
  if (emblem[1] === 0) emblem[1] = 2; // default main part, as bemaniutils does
  const career = p.career;
  const fc = fcChallenge(currentDayId());
  const fcPlayed = p.fc_day === currentDayId() ? fix(p.fc_played, 2, 0) : [0, 0];

  return {
    data: {
      info: globalInfo(),
      player: {
        name: K.ITEM("str", player.name),
        jid: K.ITEM("s32", player.jubeatId),
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
// request -> profile (gameend.regist)
// ---------------------------------------------------------------------------------------------
const unformat = (d: KDataReader, p: PropData) => {
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
    p.career.level = num(C + "level", p.career.level);
    p.career.point = num(C + "point", p.career.point);
    p.career.param = nums(C + "param", 10, p.career.param, -1);
    p.career.is_unlocked = d.bool(C + "is_unlocked");
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
};

// ---------------------------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------------------------
export const regist: EamusePluginRoute = async (info, data, send) => {
  const refid = $(data).str("data.player.refid");
  if (!refid) return send.deny();
  const player = await loadPlayer(refid, $(data).str("data.player.name"));
  const p = await loadProp(refid);
  if (await evaluateLeague(refid, p)) await saveProp(refid, p);
  return send.object(format(player, p), { compress: true });
};

// Same as regist: the game skips regist for cards CORE already knows.
export const getPdata = regist;

export const getMdata = (version: VersionInfo): EamusePluginRoute => async (info, data, send) => {
  const jid = $(data).number("data.player.jid");
  if (!jid) return send.deny();
  const player = await playerByJid(jid);
  if (!player) return send.status(109);
  const part = Math.min(3, Math.max(1, $(data).number("data.player.mdata_ver", 1)));
  const musicdata = legacyMdata(await versionScores(player.__refid, version), part);
  return send.object({
    data: { player: { jid: K.ITEM("s32", jid), mdata_list: { musicdata } } },
  }, { compress: true });
};

export const gameendRegist: EamusePluginRoute = async (info, data, send) => {
  const refid = $(data).str("data.player.refid");
  if (!refid || !(await findPlayer(refid))) return send.deny();
  const d = $(data);
  const p = await loadProp(refid);
  unformat(d, p);

  const plays = await saveResultTunes(refid, d);
  const fc = fcChallenge(currentDayId());
  if (p.fc_day !== currentDayId()) { p.fc_day = currentDayId(); p.fc_played = [0, 0]; }
  for (const play of plays) {
    p.last.music_id = play.musicId; p.last.seq_id = play.seq;
    if (play.musicId === fc.today) p.fc_played[0] = 1;
    if (play.musicId === fc.whim) p.fc_played[1] = 1;
  }

  await saveCourseResult(refid, d, p);
  await saveLeagueResult(refid, d, p);
  await saveProp(refid, p);
  console.log(`[jubeat] prop gameend.regist: ${plays.length} tune(s) saved`);
  return send.object({
    data: { player: { session_id: K.ITEM("s32", 1), end_final_session_id: K.ITEM("s32", 1) } },
  }, { compress: true });
};
