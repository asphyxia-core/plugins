module.exports = () => ({
  termver: K.ITEM("u8", 0),
  season_etime: K.ITEM("u32", 0),
  white_music_list: K.ARRAY("s32", Array(32).fill(-1)),
  open_music_list: K.ARRAY("s32", Array(32).fill(0)),

  collabo_info: {
    collabo: [
      K.ATTR({ type: "1" }, { state: K.ITEM("u8", 0) }),
      K.ATTR({ type: "2" }, { state: K.ITEM("u8", 0) }),
      K.ATTR({ type: "3" }, { state: K.ITEM("u8", 0) }),
      K.ATTR({ type: "4" }, { state: K.ITEM("u8", 0) }),
      K.ATTR({ type: "5" }, { state: K.ITEM("u8", 0) }),
      K.ATTR({ type: "8" }, { state: K.ITEM("u8", 0) })
    ],

    policy_break: {
      is_report_end: K.ITEM("bool", true)
    }
  },

  lab: {
    is_open: K.ITEM("bool", false)
  },

  share_music: K.ATTR({ count: "0" }),
  bonus_music: K.ATTR({ count: "0" })
});
