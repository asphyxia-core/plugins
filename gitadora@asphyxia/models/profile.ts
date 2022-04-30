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
