import { getVersion } from './utils';

const PHASE23 = [
  { id: 0, p: 16 },
  { id: 1, p: 3 },
  { id: 2, p: 1 },
  { id: 3, p: 2 },
  { id: 4, p: 1 },
  { id: 5, p: 1 },
  { id: 6, p: 1 },
  { id: 7, p: 4 },
  { id: 8, p: 3 },
  { id: 9, p: 4 },
  { id: 10, p: 4 },
  { id: 11, p: 1 },
  { id: 13, p: 4 },
];

const PHASE24 = [
  { id: 3, p: 1 },
  // { id: 5, p: 1 },
  { id: 6, p: 1 },
  { id: 16, p: 1 },
  { id: 17, p: 1 },
  { id: 18, p: 1 },
  { id: 19, p: 1 },
  { id: 20, p: 1 },
];

export const getInfo = (req) => {
  const version = getVersion(req);

  if (version == 'v23') {
    return getInfo23();
  } else if (version == 'v24') {
    return getInfo24();
  }
}

const getInfo23 = () => {
  const result: any = {
    phase: [],
    area: [],
    goods: [],
  };

  for (const phase of PHASE23) {
    result.phase.push({
      event_id: K.ITEM('s16', phase.id),
      phase: K.ITEM('s16', phase.p),
    });
  }

  for (let i = 1; i <= 100; ++i) {
    result.area.push({
      area_id: K.ITEM('s16', i),
      end_date: K.ITEM('u64', BigInt(0)),
      medal_id: K.ITEM('s16', i),
      is_limit: K.ITEM('bool', 0),
    });
  }

  for (let i = 1; i <= 420; ++i) {
    result.goods.push({
      goods_id: K.ITEM('s16', i),
      price: K.ITEM('s32', i <= 80 ? 60 : 100),
      goods_type: K.ITEM('s16', 0),
    });
  }

  return result;
};

const getInfo24 = () => {
  const result: any = {
    phase: [],
    goods: [],
  };

  for (const phase of PHASE24) {
    result.phase.push({
      event_id: K.ITEM('s16', phase.id),
      phase: K.ITEM('s16', phase.p),
    });
  }

  for (let i = 3; i <= 96; ++i) {
    result.goods.push({
      item_id: K.ITEM('s32', i),
      item_type: K.ITEM('s16', 3),
      price: K.ITEM('s32', 60),
      goods_type: K.ITEM('s16', 0),
    });
  }

  return result;
};

export const M39_EXTRA_DATA: {
  [ver: string]: {
    [field: string]: {
      path: string;
      type: string;
      default: any;
      isArray?: true;
    };
  };
} = {  
  v23: {
    tutorial: { type: 's8', path: 'account', default: 0 },
    area_id: { type: 's16', path: 'account', default: 0 },
    lumina: { type: 's16', path: 'account', default: 300 },
    medal_set: { type: 's16', path: 'account', default: [0, 0, 0, 0], isArray: true },
    read_news: { type: 's16', path: 'account', default: 0 },
    staff: { type: 's8', path: 'account', default: 0 },
    item_type: { type: 's16', path: 'account', default: 0 },
    item_id: { type: 's16', path: 'account', default: 0 },
    is_conv: { type: 's8', path: 'account', default: 0 },
    active_fr_num: { type: 'u8', path: 'account', default: 0 },
    nice: { type: 's16', path: 'account', default: Array(30).fill(-1), isArray: true },
    favorite_chara: { type: 's16', path: 'account', default: Array(20).fill(-1), isArray: true },
    special_area: { type: 's16', path: 'account', default: Array(8).fill(0), isArray: true },
    chocolate_charalist: {
      type: 's16',
      path: 'account',
      default: Array(5).fill(-1),
      isArray: true,
    },
    teacher_setting: { type: 's16', path: 'account', default: Array(10).fill(0), isArray: true },
    license_data: { type: 's16', path: 'account', default: [-1, -1], isArray: true },
    welcom_pack: { type: 'bool', path: 'account', default: 1 },
    meteor_flg: { type: 'bool', path: 'account', default: 1 },

    hispeed: { type: 's16', path: 'option', default: 0 },
    popkun: { type: 'u8', path: 'option', default: 0 },
    hidden: { type: 'bool', path: 'option', default: 0 },
    hidden_rate: { type: 's16', path: 'option', default: 0 },
    sudden: { type: 'bool', path: 'option', default: 0 },
    sudden_rate: { type: 's16', path: 'option', default: 0 },
    randmir: { type: 's8', path: 'option', default: 0 },
    gauge_type: { type: 's8', path: 'option', default: 0 },
    ojama_0: { type: 'u8', path: 'option', default: 0 },
    ojama_1: { type: 'u8', path: 'option', default: 0 },
    forever_0: { type: 'bool', path: 'option', default: 0 },
    forever_1: { type: 'bool', path: 'option', default: 0 },
    full_setting: { type: 'bool', path: 'option', default: 0 },
    judge: { type: 'u8', path: 'option', default: 0 },

    ep: { type: 'u16', path: 'info', default: 0 },

    effect_left: { type: 'u16', path: 'customize', default: 0 },
    effect_center: { type: 'u16', path: 'customize', default: 0 },
    effect_right: { type: 'u16', path: 'customize', default: 0 },
    hukidashi: { type: 'u16', path: 'customize', default: 0 },
    comment_1: { type: 'u16', path: 'customize', default: 0 },
    comment_2: { type: 'u16', path: 'customize', default: 0 },

    mode: { type: 'u8', path: 'config', default: 0 },
    chara: { type: 's16', path: 'config', default: -1 },
    music: { type: 's16', path: 'config', default: -1 },
    sheet: { type: 'u8', path: 'config', default: 0 },
    category: { type: 's8', path: 'config', default: -1 },
    sub_category: { type: 's8', path: 'config', default: -1 },
    chara_category: { type: 's8', path: 'config', default: -1 },
    course_id: { type: 's16', path: 'config', default: 0 },
    course_folder: { type: 's8', path: 'config', default: 0 },
    ms_banner_disp: { type: 's8', path: 'config', default: 0 },
    ms_down_info: { type: 's8', path: 'config', default: 0 },
    ms_side_info: { type: 's8', path: 'config', default: 0 },
    ms_raise_type: { type: 's8', path: 'config', default: 0 },
    ms_rnd_type: { type: 's8', path: 'config', default: 0 },

    enemy_medal: { type: 's16', path: 'event', default: 0 },
    hp: { type: 's16', path: 'event', default: 0 },

    valid: { type: 's8', path: 'custom_cate', default: 0 },
    lv_min: { type: 's8', path: 'custom_cate', default: -1 },
    lv_max: { type: 's8', path: 'custom_cate', default: -1 },
    medal_min: { type: 's8', path: 'custom_cate', default: -1 },
    medal_max: { type: 's8', path: 'custom_cate', default: -1 },
    friend_no: { type: 's8', path: 'custom_cate', default: -1 },
    score_flg: { type: 's8', path: 'custom_cate', default: -1 },
  },v24: {
    enemy_medal: { type: 's16', path: 'event', default: 0 },
    hp: { type: 's16', path: 'event', default: 0 },

    tutorial: { type: 's16', path: 'account', default: -1 },
    area_id: { type: 's16', path: 'account', default: 51 },
    lumina: { type: 's16', path: 'account', default: 0 },
    medal_set: { type: 's16', path: 'account', default: [0, 0], isArray: true },
    read_news: { type: 's16', path: 'account', default: 0 },
    staff: { type: 's8', path: 'account', default: 0 },
    is_conv: { type: 's8', path: 'account', default: 0 },
    item_type: { type: 's16', path: 'account', default: 0 },
    item_id: { type: 's16', path: 'account', default: 0 },
    license_data: { type: 's16', path: 'account', default: Array(10).fill(-1), isArray: true },
    active_fr_num: { type: 'u8', path: 'account', default: 0 },
    nice: { type: 's16', path: 'account', default: Array(30).fill(-1), isArray: true },
    favorite_chara: { type: 's16', path: 'account', default: Array(10).fill(-1), isArray: true },
    special_area: { type: 's16', path: 'account', default: Array(8).fill(-1), isArray: true },
    chocolate_charalist: {
      type: 's16',
      path: 'account',
      default: Array(5).fill(-1),
      isArray: true,
    },
    chocolate_sp_chara: { type: 's32', path: 'account', default: 0 },
    chocolate_pass_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_hon_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_giri_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_kokyu_cnt: { type: 's32', path: 'account', default: 0 },
    teacher_setting: { type: 's16', path: 'account', default: Array(10).fill(-1), isArray: true },
    welcom_pack: { type: 'bool', path: 'account', default: 0 },
    meteor_flg: { type: 'bool', path: 'account', default: 0 },
    use_navi: { type: 's16', path: 'account', default: 0 },
    ranking_node: { type: 's32', path: 'account', default: 0 },
    chara_ranking_kind_id: { type: 's32', path: 'account', default: 0 },
    navi_evolution_flg: { type: 's8', path: 'account', default: 0 },
    ranking_news_last_no: { type: 's32', path: 'account', default: 0 },
    power_point: { type: 's32', path: 'account', default: 0 },
    player_point: { type: 's32', path: 'account', default: 0 },
    power_point_list: { type: 's32', path: 'account', default: [0], isArray: true },

    mode: { type: 'u8', path: 'config', default: 0 },
    chara: { type: 's16', path: 'config', default: 0 },
    music: { type: 's16', path: 'config', default: 0 },
    sheet: { type: 'u8', path: 'config', default: 0 },
    category: { type: 's8', path: 'config', default: 0 },
    sub_category: { type: 's8', path: 'config', default: 0 },
    chara_category: { type: 's8', path: 'config', default: 0 }, // check
    story_id: { type: 's16', path: 'config', default: 0 },
    ms_banner_disp: { type: 's8', path: 'config', default: 0 },
    ms_down_info: { type: 's8', path: 'config', default: 0 },
    ms_side_info: { type: 's8', path: 'config', default: 0 },
    ms_raise_type: { type: 's8', path: 'config', default: 0 },
    ms_rnd_type: { type: 's8', path: 'config', default: 0 },
    banner_sort: { type: 's8', path: 'config', default: 0 },
    course_id: { type: 's16', path: 'config', default: 0 },
    course_folder: { type: 's8', path: 'config', default: 0 },
    story_folder: { type: 's8', path: 'config', default: 0 },

    hispeed: { type: 's16', path: 'option', default: 10 },
    popkun: { type: 'u8', path: 'option', default: 0 },
    hidden: { type: 'bool', path: 'option', default: 0 },
    hidden_rate: { type: 's16', path: 'option', default: -1 },
    sudden: { type: 'bool', path: 'option', default: 0 },
    sudden_rate: { type: 's16', path: 'option', default: -1 },
    randmir: { type: 's8', path: 'option', default: 0 },
    gauge_type: { type: 's8', path: 'option', default: 0 },
    ojama_0: { type: 'u8', path: 'option', default: 0 },
    ojama_1: { type: 'u8', path: 'option', default: 0 },
    forever_0: { type: 'bool', path: 'option', default: 0 },
    forever_1: { type: 'bool', path: 'option', default: 0 },
    full_setting: { type: 'bool', path: 'option', default: 0 },
    guide_se: { type: 's8', path: 'option', default: 0 },
    judge: { type: 'u8', path: 'option', default: 0 },
    slow: { type: 's16', path: 'option', default: 0 },
    fast: { type: 's16', path: 'option', default: 0 },

    valid: { type: 's8', path: 'custom_cate', default: 0 },
    lv_min: { type: 's8', path: 'custom_cate', default: 0 },
    lv_max: { type: 's8', path: 'custom_cate', default: 0 },
    medal_min: { type: 's8', path: 'custom_cate', default: 0 },
    medal_max: { type: 's8', path: 'custom_cate', default: 0 },
    friend_no: { type: 's8', path: 'custom_cate', default: 0 },
    score_flg: { type: 's8', path: 'custom_cate', default: 0 },

    ep: { type: 'u16', path: 'info', default: 0 },
    ap: { type: 'u16', path: 'info', default: 0 },

    effect_left: { type: 'u16', path: 'customize', default: 0 },
    effect_center: { type: 'u16', path: 'customize', default: 0 },
    effect_right: { type: 'u16', path: 'customize', default: 0 },
    hukidashi: { type: 'u16', path: 'customize', default: 0 },
    comment_1: { type: 'u16', path: 'customize', default: 0 },
    comment_2: { type: 'u16', path: 'customize', default: 0 },
  },
};