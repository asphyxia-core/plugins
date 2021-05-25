import Profile from "../../models/profile";

module.exports = (data: Profile) => ({
  info: {
    jubility: K.ITEM("s16", data.fulfill?.jubility || 0),
    jubility_yday: K.ITEM("s16", data.fulfill?.jubilityYday || 0),
    tune_cnt: K.ITEM("s32", data.fulfill?.tuneCount || 31),
    save_cnt: K.ITEM("s32", data.fulfill?.saveCount || 0),
    saved_cnt: K.ITEM("s32", data.fulfill?.savedCount || 0),
    fc_cnt: K.ITEM("s32", data.fulfill?.fcCount || 0),
    ex_cnt: K.ITEM("s32", data.fulfill?.exCount || 0),
    clear_cnt: K.ITEM("s32", data.fulfill?.clearCount || 0),
    pf_cnt: K.ITEM("s32", 0),
    match_cnt: K.ITEM("s32", data.fulfill?.matchCount || 0),
    beat_cnt: K.ITEM("s32", 0),
    mynews_cnt: K.ITEM("s32", 0),
    mtg_entry_cnt: K.ITEM("s32", 0),
    mtg_hold_cnt: K.ITEM("s32", 0),
    mtg_result: K.ITEM("u8", 0),
    extra_point: K.ITEM("s32", data.fulfill?.extraPoint || 0),
    is_extra_played: K.ITEM("bool", data.fulfill?.isExtraPlayed || false)
  },

  last: {
    play_time: K.ITEM("s64", BigInt(0)),
    shopname: K.ITEM("str", data.lastShopname),
    areaname: K.ITEM("str", data.lastAreaname),
    title: K.ITEM("s16", data.fulfill?.title || 0),
    parts: K.ITEM("s16", data.fulfill?.parts || 0),
    theme: K.ITEM("s8", data.fulfill?.theme || 0),
    marker: K.ITEM("s8", data.fulfill?.marker || 0),
    rank_sort: K.ITEM("s8", data.rankSort || 1),
    combo_disp: K.ITEM("s8", data.comboDisp || 1),
    music_id: K.ITEM("s32", data.musicId || 0),
    seq_id: K.ITEM("s8", data.seqId || 0),
    sort: K.ITEM("s8", data.fulfill?.sort || 0),
    category: K.ITEM("s8", data.fulfill?.category || 0),
    expert_option: K.ITEM("s8", data.fulfill?.category || 0),
    matching: K.ITEM("s8", data.fulfill?.category || 1),
    hazard: K.ITEM("s8", data.fulfill?.category || 0),
    hard: K.ITEM("s8", data.fulfill?.category || 0)
  },

  item: {
    secret_list: K.ARRAY("s32", Array(32).fill(-1)),
    theme_list: K.ITEM("s16", -1),
    marker_list: K.ARRAY("s32", Array(2).fill(-1)),
    title_list: K.ARRAY("s32", Array(96).fill(-1)),
    parts_list: K.ARRAY("s32", Array(96).fill(-1)),

    new: {
      secret_list: K.ARRAY("s32", Array(32).fill(0)),
      theme_list: K.ITEM("s16", 0),
      marker_list: K.ARRAY("s32", Array(2).fill(0)),
      title_list: K.ARRAY("s32", Array(96).fill(0))
    }
  },

  history: K.ATTR({ count: "0" }),

  challenge: {
    today: {
      music_id: K.ITEM("s32", 0),
      state: K.ITEM("u8", 0)
    }
  },

  news: {
    checked: K.ITEM("s16", 0)
  },

  macchiato: {
    pack_id: K.ITEM("s32", 0),
    bean_num: K.ITEM("u16", 0),
    daily_milk_num: K.ITEM("s32", 1200),
    is_received_daily_milk: K.ITEM("bool", true),
    today_tune_cnt: K.ITEM("s32", 0),
    daily_milk_bonus: K.ARRAY("s32", [100, 100, 1000, 200, 200, 200, 200, 200, 1000]),
    daily_play_burst: K.ITEM("s32", 300),

    sub_menu_is_completed: K.ITEM("bool", true),
    compensation_milk: K.ITEM("s32", 0),

    macchiato_music_list: K.ATTR({ count: "0" }, {
      music: []
    }),

    sub_pack_id: K.ITEM("s32", 0),

    sub_macchiato_music_list: K.ATTR({ count: "0" }, {
      music: []
    }),

    season_music_list: K.ATTR({ count: "0" }),

    match_cnt: K.ITEM("s32", 0),

    achievement_list: K.ATTR({ count: "0" }, {
      achievement: []
    }),

    cow_list: K.ATTR({ count: "0" }),
  },

  rivallist: K.ATTR({ count: "0" }),

  only_now_music: K.ATTR({ count: "0" }),
  lab_edit_seq: K.ATTR({ count: "0" }),
  kac_music: K.ATTR({ count: "0" }),

  memorial: {
    latest_event_id: K.ITEM("u8", 1),
    player_event_id: K.ITEM("u8", 1),
    flag: K.ITEM("u32", 0),
    params: K.ARRAY("u32", Array(15).fill(0))
  }
});
