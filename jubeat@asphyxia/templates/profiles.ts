import Profile from "../models/profile";
import {Course} from "../models/course";
import {emoList, shopList, FestoCourse, courseCategories, COURSE_STATUS} from "../static/data"

module.exports = async (data: Profile) => ({
  info: {
    tune_cnt: K.ITEM("s32", data?.tuneCount || 0),
    save_cnt: K.ITEM("s32", data?.saveCount || 0),
    saved_cnt: K.ITEM("s32", data?.savedCount || 0),
    fc_cnt: K.ITEM("s32", data?.fcCount || 0),
    ex_cnt: K.ITEM("s32", data?.exCount || 0),
    clear_cnt: K.ITEM("s32", data?.clearCount || 0),
    match_cnt: K.ITEM("s32", data?.matchCount || 0),
    beat_cnt: K.ITEM("s32", 0),
    mynews_cnt: K.ITEM("s32", 0),
    mtg_entry_cnt: K.ITEM("s32", 0),
    mtg_hold_cnt: K.ITEM("s32", 0),
    mtg_result: K.ITEM("u8", 0),
    bonus_tune_points: K.ITEM("s32", data?.bonusPoints || 0),
    is_bonus_tune_played: K.ITEM("bool", data?.isBonusPlayed || false),
    last_play_time: K.ITEM("s64", data?.lastPlayTime || 0),
  },

  last: {
    play_time: K.ITEM("s64", data?.lastPlayTime || 0),
    shopname: K.ITEM("str", data.lastShopname),
    areaname: K.ITEM("str", data.lastAreaname),   
    music_id: K.ITEM("s32", data.musicId || 0),
    seq_id: K.ITEM("s8", data.seqId || 0),
    seq_edit_id: K.ITEM("str", data.seqEditId || ""),
    sort: K.ITEM("s8", data?.sort || 0),
    category: K.ITEM("s8", data?.category || 0),
    expert_option: K.ITEM("s8", data?.expertOption || 0),
    dig_select: K.ITEM("s32", 0),

    settings: {
      marker: K.ITEM("s8", data?.marker || 0),
      theme: K.ITEM("s8", data?.theme || 0),
      title: K.ITEM("s16", data?.title || 0),
      parts: K.ITEM("s16", data?.parts || 0),
      rank_sort: K.ITEM("s8", data?.rankSort || 0),
      combo_disp: K.ITEM("s8", data?.comboDisp || 0),
      emblem: K.ARRAY("s16", data?.emblem || [0, 0, 0, 0, 0]),
      matching: K.ITEM("s8", data?.matching || 0),
      hard: K.ITEM("s8", data?.hard || 0),
      hazard: K.ITEM("s8", data?.hazard || 0),
    },
  },

  item: {
    music_list: K.ARRAY("s32", new Array(64).fill(-1)),
    secret_list: K.ARRAY("s32", new Array(64).fill(-1)),
    theme_list: K.ARRAY("s32", new Array(16).fill(-1)),
    marker_list: K.ARRAY("s32", new Array(16).fill(-1)),
    title_list: K.ARRAY("s32", new Array(160).fill(-1)),
    parts_list: K.ARRAY("s32", data?.partsList || new Array(160).fill(0)),
    emblem_list: K.ARRAY("s32", new Array(96).fill(-1)),
    commu_list: K.ARRAY("s32", data?.commuList || new Array(16).fill(0)),
    new: {
        secret_list: K.ARRAY("s32", new Array(64).fill(0)),
        theme_list: K.ARRAY("s32", new Array(16).fill(0)),
        marker_list: K.ARRAY("s32", new Array(16).fill(0)),
    },
  },

  rivallist: {
    rival: [].map((rival) => ({
      jid: K.ITEM("s32", rival.jubeatId),
      name: K.ITEM("str", rival.name),
      career: {
        level: K.ITEM("s16", 0),
      },
    })),
  },

  lab_edit_seq: K.ATTR({ count: "0" }, { seq: [] }),
  fc_challenge: {
    today: {
      music_id: K.ITEM("s32", -1),
      state: K.ITEM("u8", 0),
    },
    whim: {
      music_id: K.ITEM("s32", -1),
      state: K.ITEM("u8", 0),
    },
  },
  official_news: {
    news_list: { news: [] },
  },
  news: {
    checked: K.ITEM("s16", 0),
    checked_flag: K.ITEM("u32", 0),
  },
  history: K.ATTR({ count: "0" }, { tune: [] }),
  free_first_play: {
    is_available: K.ITEM("bool", data?.isFirstplay || false),
  },
  event_info: { event: [] },
  jbox: {
    point: K.ITEM("s32", 0),
    emblem: {
      normal: { index: K.ITEM("s16", 2) },
      premium: { index: K.ITEM("s16", 1) },
    },
  },
  new_music: {},
  navi: {
    flag: K.ITEM("u64", BigInt(data?.navi || 0)),
  },
  gift_list: {},
  question_list: {},
  team_battle: {},
  server: {},
  course_list: {
      course: await (async () =>{
        let courseData = await DB.Find<Course>(data.__refid, { collection: "course" });
        let courseStatus = {};
        courseData.forEach(course =>{
          courseStatus[course.courseId] |= (course.seen ? COURSE_STATUS.SEEN : 0);
          courseStatus[course.courseId] |= (course.played ? COURSE_STATUS.PLAYED : 0);
          courseStatus[course.courseId] |= (course.cleared ? COURSE_STATUS.CLEARED : 0);
        });
        return FestoCourse.map((course, i) =>
        K.ATTR({ id: String(i + 1) }, { status: K.ITEM("s8", courseStatus[i+1] || 0) })
        );
      })()
     
  },
  category_list: {
    category: courseCategories.map((categorie, i) =>
      K.ATTR(
        { id: String(i + 1)},
        {
          is_display: K.ITEM("bool", true),
        }
      )
    )
  },
  fill_in_category: {
      no_gray_flag_list: K.ARRAY("s32", [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ]),
      all_yellow_flag_list: K.ARRAY("s32", [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ]),
      full_combo_flag_list: K.ARRAY("s32", [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ]),
      excellent_flag_list: K.ARRAY("s32", [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ]),
      normal: {
      no_gray_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      all_yellow_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      full_combo_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      excellent_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      },
      hard: {
      no_gray_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      all_yellow_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      full_combo_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      excellent_flag_list: K.ARRAY("s32", [
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
      ]),
      },
  },
  emo_list: {
      emo: emoList.map((emo, i) => {
          return K.ATTR({ id: String(i + 1) }, { num: K.ITEM("s32", 0) });
      }),
  },
  eamuse_gift_list: { gift: [] },
  department: {
      shop_list: { shop: [] },
  },

  clan_course_list: {},

  team: K.ATTR(
      { id: "0" },
      {
      section: K.ITEM("s32", 0),
      street: K.ITEM("s32", 0),
      house_number_1: K.ITEM("s32", 0),
      house_number_2: K.ITEM("s32", 0),

      move: K.ATTR({
          id: "1",
          section: "1",
          street: "1",
          house_number_1: "1",
          house_number_2: "1",
      }),
      }
  ),

  daily_bonus_list: {},
  ticket_list: {},

  digdig: {
    flag: K.ITEM("u64", BigInt(0)),

    main: {
      stage: K.ATTR(
          { number: "0" },
          {
          point: K.ITEM("s32", 0),
          param: K.ITEM("s32", 0),
          }
      ),
    },

    eternal: {
      ratio: K.ITEM("s32", 0),
      used_point: K.ITEM("s64", BigInt(0)),
      point: K.ITEM("s64", BigInt(0)),

      cube: {
          state: K.ITEM("s8", 0),

          item: [],
      },

      norma: {
          till_time: K.ITEM("s64", BigInt(0)),
          kind: K.ITEM("s32", 0),
          value: K.ITEM("s32", 0),
          param: K.ITEM("s32", 0),
      },

      old: {
          need_point: K.ITEM("s32", 0),
          point: K.ITEM("s32", 0),
          excavated_point: K.ITEM("s32", 0),
          excavated: K.ITEM("s32", 0),
          param: K.ITEM("s32", 0),

          music_list: {},
      },
    },
  },

  unlock: {},

  generic_dig: {},
      
});