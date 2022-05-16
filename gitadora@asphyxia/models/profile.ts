import { PLUGIN_VER } from "../const";
import { SecretMusicEntry } from "./secretmusicentry";

export interface Profile {
  collection: 'profile';

  game: 'gf' | 'dm';
  version: string;
  pluginVer: number
  id: number;

  play: number;
  playtime: number;
  playterm: number;
  session_cnt: number;
  extra_stage: number;
  extra_play: number;
  extra_clear: number;
  encore_play: number;
  encore_clear: number;
  pencore_play: number;
  pencore_clear: number;
  max_clear_diff: number;
  max_full_diff: number;
  max_exce_diff: number;
  clear_num: number;
  full_num: number;
  exce_num: number;
  no_num: number;
  e_num: number;
  d_num: number;
  c_num: number;
  b_num: number;
  a_num: number;
  s_num: number;
  ss_num: number;
  last_category: number;
  last_musicid: number;
  last_seq: number;
  disp_level: number;
  progress: number;
  disp_state: number;
  skill: number;
  all_skill: number;
  extra_gauge: number;
  encore_gauge: number;
  encore_cnt: number;
  encore_success: number;
  unlock_point: number;
  max_skill: number;
  max_all_skill: number;
  clear_diff: number;
  full_diff: number;
  exce_diff: number;
  clear_music_num: number;
  full_music_num: number;
  exce_music_num: number;
  clear_seq_num: number;
  classic_all_skill: number;
  secretmusic: {
    music: SecretMusicEntry[];    
  }
}

export function getDefaultProfile (game: 'gf' | 'dm', version: string, id: number): Profile {
  return {
    collection: 'profile',
    pluginVer: PLUGIN_VER,

    game,
    version,
    id,

    play: 0,
    playtime: 0,
    playterm: 0,
    session_cnt: 0,
    extra_stage: 0,
    extra_play: 0,
    extra_clear: 0,
    encore_play: 0,
    encore_clear: 0,
    pencore_play: 0,
    pencore_clear: 0,
    max_clear_diff: 0,
    max_full_diff: 0,
    max_exce_diff: 0,
    clear_num: 0,
    full_num: 0,
    exce_num: 0,
    no_num: 0,
    e_num: 0,
    d_num: 0,
    c_num: 0,
    b_num: 0,
    a_num: 0,
    s_num: 0,
    ss_num: 0,
    last_category: 0,
    last_musicid: -1,
    last_seq: 0,
    disp_level: 0,
    progress: 0,
    disp_state: 0,
    skill: 0,
    all_skill: 0,
    extra_gauge: 0,
    encore_gauge: 0,
    encore_cnt: 0,
    encore_success: 0,
    unlock_point: 0,
    max_skill: 0,
    max_all_skill: 0,
    clear_diff: 0,
    full_diff: 0,
    exce_diff: 0,
    clear_music_num: 0,
    full_music_num: 0,
    exce_music_num: 0,
    clear_seq_num: 0,
    classic_all_skill: 0,
    secretmusic: {
      music: []     
    }
  }
};