// prop's player data, kept in version data. The jubeat ID and name are the shared profile's.

import { loadVersionData, saveVersionData } from "../../handlers/version_data";

export const PROP = 7;

const fill = (n: number, v: number): number[] => new Array(n).fill(v);

export interface PropData {
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
    /** The league class the player last saw, so the game can show a change. */
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
  /** Last league week that promotions were applied for. */
  league_eval_id: number;
  /** FC challenge [today, whim] played on `fc_day`. */
  fc_day: number; fc_played: number[];
}

const defaults = (): PropData => ({
  saved: false,
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

export async function loadProp(refid: string): Promise<PropData> {
  const d: any = { ...defaults(), ...(await loadVersionData(refid, PROP)) };
  d.last = { ...defaults().last, ...(d.last || {}) };
  d.career = { ...defaults().career, ...(d.career || {}) };
  return d;
}

export const saveProp = (refid: string, p: PropData) => saveVersionData(refid, PROP, p);
