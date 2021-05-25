import Profile from "../../models/profile";

module.exports = (data: Profile) => ({
  info: {
    jubility: K.ITEM("s16", data.copious?.jubility || 0),
    jubility_yday: K.ITEM("s16", data.copious?.jubilityYday || 0),
    acv_point: K.ITEM("s32", data.copious?.acvPoint || 0),
    acv_state: K.ITEM("s8", data.copious?.acvState || 0),
    acv_throw: K.ARRAY("s32", data.copious?.acvThrow || [0, 0, 0]),
    acv_own: K.ITEM("s32", data.copious?.acvOwn || 0),
    tune_cnt: K.ITEM("s32", data.copious?.tuneCount || 0),
    save_cnt: K.ITEM("s32", data.copious?.saveCount || 0),
    saved_cnt: K.ITEM("s32", data.copious?.savedCount || 0),
    fc_cnt: K.ITEM("s32", data.copious?.fcCount || 0),
    ex_cnt: K.ITEM("s32", data.copious?.exCount || 0),
    match_cnt: K.ITEM("s32", data.copious?.matchCount || 0),
    beat_cnt: K.ITEM("s32", 0),
    mynews_cnt: K.ITEM("s32", 0),
    mtg_entry_cnt: K.ITEM("s32", 0),
    mtg_hold_cnt: K.ITEM("s32", 0),
    mtg_result: K.ITEM("u8", 0)
  },

  last: {
    play_time: K.ITEM("s64", BigInt(0)),
    shopname: K.ITEM("str", data.lastShopname),
    areaname: K.ITEM("str", data.lastAreaname),
    title: K.ITEM("s16", data.copious?.title || 0),
    parts: K.ITEM("s16", data.copious?.parts || 0),
    theme: K.ITEM("s8", data.copious?.theme || 0),
    marker: K.ITEM("s8", data.copious?.marker || 0),
    rank_sort: K.ITEM("s8", data.rankSort || 1),
    combo_disp: K.ITEM("s8", data.comboDisp || 1),
    music_id: K.ITEM("s32", data.musicId || 0),
    seq_id: K.ITEM("s8", data.seqId || 0),
    sort: K.ITEM("s8", data.copious?.sort || 0),
    category: K.ITEM("s8", data.copious?.category || 0),
    msel_stat: K.ITEM("s8", data.copious?.mselStat || 0)
  },

  item: {
    secret_list: K.ARRAY("s32", data.copious?.secretList || Array(12).fill(0)),
    theme_list: K.ITEM("s16", data.copious?.themeList || 0),
    marker_list: K.ARRAY("s32", data.copious?.markerList || [0, 0]),
    title_list: K.ARRAY("s32", data.copious?.titleList || Array(32).fill(0)),
    parts_list: K.ARRAY("s32", data.copious?.partsList || Array(96).fill(0)),

    new: {
      secret_list: K.ARRAY("s32", data.copious?.secretListNew || Array(12).fill(0)),
      theme_list: K.ITEM("s16", data.copious?.themeListNew || 0),
      marker_list: K.ARRAY("s32", data.copious?.markerListNew || [0, 0]),
      title_list: K.ARRAY("s32", data.copious?.titleListNew || Array(32).fill(0))
    }
  },

  challenge: {
    today: {
      music_id: K.ITEM("s32", 0)
    },
    onlynow: {
      magic_no: K.ITEM("s32", 0),
      cycle: K.ITEM("s16", 0)
    }
  },

  news: {
    checked: K.ITEM("s16", 0)
  },

  rivallist: K.ATTR({ count: "0" })
});
