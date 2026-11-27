// Qubell's global "info" node (shopinfo.regist, gametop.get_info, and inside every profile).
// Layout from bemaniutils' bemani/backend/jubeat/qubell.py (__get_global_info).

const fill = (n: number, v: number): number[] => new Array(n).fill(v);
const s32a = (v: number[]) => K.ARRAY("s32", v);

const EVENTS = [5, 6, 15, 19];

export const info = () => ({
  event_info: {
    event: EVENTS.map(e => K.ATTR({ type: String(e) }, { state: K.ITEM("u8", 0) })),
  },
  share_music: {},
  bonus_music: {},
  white_music_list: s32a(fill(64, -1)),
  white_marker_list: s32a(fill(16, -1)),
  white_theme_list: s32a(fill(16, -1)),
  open_music_list: s32a(fill(64, -1)),
  shareable_music_list: s32a(fill(64, -1)),
  jbox: {
    point: K.ITEM("s32", 0),
    emblem: {
      normal: { index: K.ITEM("s16", 2) },
      premium: { index: K.ITEM("s16", 1) },
    },
  },
  born: { status: K.ITEM("s8", 0), year: K.ITEM("s16", 0) },
  digdig: {
    stage_list: {
      stage: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n =>
        K.ATTR({ number: String(n) }, { state: K.ITEM("u8", 1) })),
    },
  },
  collection: { rating_s: {} },
  generic_dig: { map_list: {} },
  expert_option: { is_available: K.ITEM("bool", true) },
  tsumtsum: { is_available: K.ITEM("bool", true) },
  nagatanien: { is_available: K.ITEM("bool", true) },
  all_music_matching: { is_available: K.ITEM("bool", true) },
  question_list: {},
});
