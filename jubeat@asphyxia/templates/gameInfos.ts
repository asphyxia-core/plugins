import {emoList, shopList, FestoCourse, courseCategories} from "../static/data"

/*
if pos_index is not (1230 ~ 1236 or 1204 ~ 1205) and pos_index > 1200:
  then all festo songs
*/
var pick_up_array = new Array(64).fill(-1);
for(var i=0; i<=36; i++){
  pick_up_array[i] = 0;
}
pick_up_array[37] = -3211264;
pick_up_array[38] = -2080769;

module.exports = () => ({
  info: {
    white_music_list: K.ARRAY("s32", new Array(64).fill(-1)),
    white_marker_list: K.ARRAY("s32", new Array(16).fill(-1)),
    white_theme_list: K.ARRAY("s32", new Array(16).fill(-1)),
    open_music_list: K.ARRAY("s32", new Array(64).fill(-1)),
    add_default_music_list: K.ARRAY("s32", new Array(64).fill(-1)),
    hot_music_list: K.ARRAY("s32", pick_up_array),

    expert_option: {
      is_available: K.ITEM("bool", true),
    },

    konami_logo_50th: {
      is_available: K.ITEM("bool", true),
    },

    all_music_matching: {
      is_available: K.ITEM("bool", false),
    },

    tsumtsum: {
      is_available: K.ITEM("bool", false),
    },

    nagatanien: {
      is_available: K.ITEM("bool", false),
    },

    digdig: {
      stage_list: {
        stage: [
          K.ATTR({ number: "1" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "2" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "3" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "4" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "5" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "6" }, { state: K.ITEM("u8", 1) }),
          K.ATTR({ number: "7" }, { state: K.ITEM("u8", 1) }),
        ],
      },
    },

    department: {
      shop_list: {
        shop: shopList.map((shop, i) =>
          K.ATTR(
            { id: String(i + 1) },
            {
              tex_id: K.ITEM("s32", shop.tex_id),
              type: K.ITEM("s8", shop.type),
              emo_id: K.ITEM("s32", shop.emo_id),
              priority: K.ITEM("s32", shop.priority),
              etime: K.ITEM("u64", BigInt(0)),
              item_list: { item: [] },
            }
          )
        ),
      },
    },

    course_list: {
      course: FestoCourse.map((course, i) =>
        K.ATTR(
          {
            release_code: "2022052400",
            version_id: "0",
            id: String(i + 1),
            course_type: String(course.course_type),
          },
          {
            difficulty: K.ITEM("s32", course.difficulty),
            etime: K.ITEM("u64", BigInt(course.etime)),
            name: K.ITEM("str", course.name),

            tune_list: {
              tune: course.tune_list.map((tune, i) =>
                K.ATTR(
                  { no: String(i + 1) },
                  {
                    seq_list: {
                      seq: tune.map((seq) => ({
                        music_id: K.ITEM("s32", seq[0]),
                        difficulty: K.ITEM("s32", seq[1]),
                        is_secret: K.ITEM("bool", seq[2]),
                      })),
                    },
                  }
                )
              ),
            },
            clear: K.ATTR({type:String(course.clear_type)},{
              ex_option:{
                is_hard: K.ITEM("bool", course.is_hard),
                hazard_type: K.ITEM("s32", course.hazard_type),
              },
              score: K.ITEM("s32", course.score),
              reward_list:[],
            })
          }
        )
      ),
      category_list: {
        category: courseCategories.map((categorie, i) =>
          K.ATTR(
            { id: String(i + 1)},
            {
              is_secret: K.ITEM("bool", false),
              level_min: K.ITEM("s32", categorie[0]),
              level_max: K.ITEM("s32", categorie[1]),
            }
          )
        )
      },
    },
    emo_list: {
      emo: emoList.map((emo, i) =>
        K.ATTR(
          { id: String(i + 1) },
          {
            tex_id: K.ITEM("s32", emo.tex_id),
            is_exchange: K.ITEM("bool", emo.is_exchange),
          }
        )
      ),
    },
  },
});