export interface custom {
  collection: "custom";

  version: number;

  // skin //
  frame: number;
  turntable: number;
  note_burst: number;
  menu_music: number;
  lane_cover: number;
  category_vox: number;
  note_skin: number;
  full_combo_splash: number;
  disable_musicpreview: boolean;

  note_beam: number;
  judge_font: number;
  pacemaker_cover: number;
  vefx_lock: boolean;
  effect: number;
  bomb_size: number;
  disable_hcn_color: boolean;
  first_note_preview: number;

  skin_customize_flg: number[];

  note_size: number; // EPOLIS //
  lift_cover: number;
  note_beam_size: number;

  cn_color: number; // Sparkle Shower //
  cn_size: number;

  // appendsettings //
  rank_folder: boolean;
  clear_folder: boolean;
  diff_folder: boolean;
  alpha_folder: boolean;
  rival_folder: boolean;
  rival_battle_folder: boolean;
  rival_info: boolean;
  hide_playcount: boolean;
  disable_graph_cutin: boolean;
  classic_hispeed: boolean;
  rival_played_folder: boolean;
  hide_iidxid: boolean;
  disable_beginner_option: boolean;

  // qpro //
  qpro_head: number;
  qpro_hair: number;
  qpro_face: number;
  qpro_hand: number;
  qpro_body: number;
  qpro_back: number; // EPOLIS //

  // qpro_secret (HEROIC VERSE) //
  qpro_secret_head: string[];
  qpro_secret_hair: string[];
  qpro_secret_face: string[];
  qpro_secret_hand: string[];
  qpro_secret_body: string[];
  qpro_secret_back: string[]; // EPOLIS //
}

export const default_custom = {
  frame: 0,
  turntable: 0,
  note_burst: 0,
  menu_music: 0,
  lane_cover: 0,
  category_vox: 0,
  note_skin: 0,
  full_combo_splash: 0,
  disable_musicpreview: false,

  note_beam: 0,
  judge_font: 0,
  pacemaker_cover: 0,
  vefx_lock: false,
  effect: 0,
  bomb_size: 0,
  disable_hcn_color: false,
  first_note_preview: 0,

  skin_customize_flg: Array<number>(16).fill(-1),
  vskin_customize_flg: Array<number>(6).fill(-1),

  note_size: 0,
  lift_cover: 0,
  note_beam_size: 0,

  cn_color: 0,
  cn_size: 0,

  rank_folder: true,
  clear_folder: true,
  diff_folder: true,
  alpha_folder: true,
  rival_folder: true,
  rival_battle_folder: true,
  rival_info: true,
  hide_playcount: false,
  disable_graph_cutin: false,
  classic_hispeed: false,
  rival_played_folder: true,
  hide_iidxid: false,
  disable_beginner_option: false,

  qpro_head: 0,
  qpro_hair: 0,
  qpro_face: 0,
  qpro_hand: 0,
  qpro_body: 0,
  qpro_back: 0,

  qpro_secret_head: Array<string>(7).fill("-1"),
  qpro_secret_hair: Array<string>(7).fill("-1"),
  qpro_secret_face: Array<string>(7).fill("-1"),
  qpro_secret_hand: Array<string>(7).fill("-1"),
  qpro_secret_body: Array<string>(7).fill("-1"),
  qpro_secret_back: Array<string>(7).fill("-1"),
}
