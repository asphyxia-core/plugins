import Profile from "../../models/profile";

module.exports = (data: Profile) => ({
  info: {
    jubility: K.ITEM("s16", data.saucer?.jubility || 0),
    jubility_yday: K.ITEM("s16", data.saucer?.jubilityYday || 0),
    tune_cnt: K.ITEM("s32", data.saucer?.tuneCount || 0),
    save_cnt: K.ITEM("s32", data.saucer?.saveCount || 0),
    saved_cnt: K.ITEM("s32", data.saucer?.savedCount || 0),
    fc_cnt: K.ITEM("s32", data.saucer?.fcCount || 0),
    ex_cnt: K.ITEM("s32", data.saucer?.exCount || 0),
    clear_cnt: K.ITEM("s32", data.saucer?.clearCount || 0),
    pf_cnt: K.ITEM("s32", 0),
    match_cnt: K.ITEM("s32", data.saucer?.matchCount || 0),
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
    title: K.ITEM("s16", data.saucer?.title || 0),
    parts: K.ITEM("s16", data.saucer?.parts || 0),
    theme: K.ITEM("s8", data.saucer?.theme || 0),
    marker: K.ITEM("s8", data.saucer?.marker || 0),
    rank_sort: K.ITEM("s8", data.rankSort || 1),
    combo_disp: K.ITEM("s8", data.comboDisp || 1),
    music_id: K.ITEM("s32", data.musicId || 0),
    seq_id: K.ITEM("s8", data.seqId || 0),
    sort: K.ITEM("s8", data.saucer?.sort || 0),
    category: K.ITEM("s8", data.saucer?.category || 0)
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

  bistro: {
    info: {
      delicious_rate: K.ITEM("float", 1.0),
      favorite_rate: K.ITEM("float", 1.0)
    },

    chef: {
      id: K.ITEM("s32", 0),
      ability: K.ITEM("u8", 0),
      remain: K.ITEM("u8", 0),
      rate: K.ARRAY("u8", [0, 0, 0, 0])
    },

    carry_over: K.ITEM("s32", data.saucer?.bistro?.carry_over || 0),

    route: Array(9).fill(0).map((v, i) => (K.ATTR({ no: String(i) }, {
      music: {
        id: K.ITEM("s32", 0),
        price_s32: K.ITEM("s32", 0)
      },

      gourmates: {
        id: K.ITEM("s32", 0),
        favorite: K.ARRAY("u8", Array(30).fill(0)),
        satisfaction_s32: K.ITEM("s32", 0)
      }
    })))
  },

  rivallist: K.ATTR({ count: "0" }),

  only_now_music: K.ATTR({ count: "0" }),
  requested_music: K.ATTR({ count: "0" }),
  lab_edit_seq: K.ATTR({ count: "0" }),
  kac_music: K.ATTR({ count: "0" }),
});
