import Profile from "../../models/profile";

module.exports = (data: Profile) => ({
  info: {
    jubility: K.ITEM("s16", data.knit?.jubility || 0),
    jubility_yday: K.ITEM("s16", data.knit?.jubilityYday || 0),
    acv_prog: K.ITEM("s8", data.knit?.acvProg || 0),
    acv_wool: K.ITEM("s8", data.knit?.acvWool || 0),
    acv_route_prog: K.ARRAY("s8", data.knit?.acvRouteProg || [0, 0, 0, 0]),
    acv_point: K.ITEM("s32", data.knit?.acvPoint || 0),
    tune_cnt: K.ITEM("s32", data.knit?.tuneCount || 0),
    save_cnt: K.ITEM("s32", data.knit?.saveCount || 0),
    saved_cnt: K.ITEM("s32", data.knit?.savedCount || 0),
    fc_cnt: K.ITEM("s32", data.knit?.fcCount || 0),
    ex_cnt: K.ITEM("s32", data.knit?.exCount || 0),
    match_cnt: K.ITEM("s32", data.knit?.matchCount || 0),
    beat_cnt: K.ITEM("s32", 0),
    mynews_cnt: K.ITEM("s32", 0),
    con_sel_cnt: K.ITEM("s32", data.knit?.conSelCount || 0),
    tag_cnt: K.ITEM("s32", 0),
    mtg_entry_cnt: K.ITEM("s32", 0),
    tag_entry_cnt: K.ITEM("s32", 0),
    mtg_hold_cnt: K.ITEM("s32", 0),
    tag_hold_cnt: K.ITEM("s32", 0),
    mtg_result: K.ITEM("u8", 0)
  },

  last: {
    play_time: K.ITEM("s64", BigInt(0)),
    shopname: K.ITEM("str", data.lastShopname),
    areaname: K.ITEM("str", data.lastAreaname),
    title: K.ITEM("s16", data.knit?.title || 0),
    theme: K.ITEM("s8", data.knit?.theme || 0),
    marker: K.ITEM("s8", data.knit?.marker || 0),
    rank_sort: K.ITEM("s8", data.rankSort || 1),
    combo_disp: K.ITEM("s8", data.comboDisp || 1),
    music_id: K.ITEM("s32", data.musicId || 0),
    seq_id: K.ITEM("s8", data.seqId || 0),
    sort: K.ITEM("s8", data.knit?.sort || 0),
    filter: K.ITEM("s32", data.knit?.filter || 0),
    msel_stat: K.ITEM("s8", data.knit?.mselStat || 0),
    con_suggest_id: K.ITEM("s8", data.knit?.conSuggestId || 0)
  },

  item: {
    secret_list: K.ARRAY("s32", data.knit?.secretList || [0, 0]),
    theme_list: K.ITEM("s16", data.knit?.themeList || 0),
    marker_list: K.ARRAY("s32", data.knit?.markerList || [0, 0]),
    title_list: K.ARRAY("s32", data.knit?.titleList || Array(24).fill(0)),

    new: {
      secret_list: K.ARRAY("s32", data.knit?.secretListNew || [0, 0]),
      theme_list: K.ITEM("s16", data.knit?.themeListNew || 0),
      marker_list: K.ARRAY("s32", data.knit?.markerListNew || [0, 0]),
      title_list: K.ARRAY("s32", data.knit?.titleListNew || Array(24).fill(0))
    }
  },

  today_music: {
    music_id: K.ITEM("s32", 0)
  },

  news: {
    checked: K.ITEM("s16", 0)
  },

  friendlist: K.ATTR({ count: "0" }),

  mylist: K.ATTR({ count: "0" }),

  collabo: {
    success: K.ITEM("bool", true),
    completed: K.ITEM("bool", true)
  }
});
