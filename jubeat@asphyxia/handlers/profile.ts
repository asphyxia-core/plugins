import {getVersion, getVersionName, VersionRange} from "../utils";
import Profile from "../models/profile";
import {Score} from "../models/score";
import {CourseResult} from "../models/course";

export const profile: EPR = async (info, data, send) => {
  let refId = $(data).str("data.player.pass.refid");
  if (!refId) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const name = $(data).str("data.player.name");

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    if (!name) return send.deny();

    const newProfile: Profile = {
      collection: "profile",
      jubeatId: _.random(1, 99999999),
      name: name,

      lastShopname: "NONE",
      lastAreaname: "NONE"
    };

    await DB.Upsert<Profile>(refId, { collection: "profile" }, newProfile);

    profile = newProfile;
  }

  return send.object({
    data: {
      ...version === 5 && require("../templates/gameInfos/saucer.ts")(profile),
      ...version === 6 && require("../templates/gameInfos/fulfill.ts")(profile),

      player: {
        name: K.ITEM("str", profile.name),
        jid: K.ITEM("s32", profile.jubeatId),
        refid: K.ITEM("str", profile.__refid),
        session_id: K.ITEM("s32", 1),
        event_flag: K.ITEM("u64", BigInt(0)),

        ...version === 3 && require("../templates/profiles/knit.ts")(profile),
        ...version === 4 && require("../templates/profiles/copious.ts")(profile),
        ...version === 5 && require("../templates/profiles/saucer.ts")(profile),
        ...version === 6 && require("../templates/profiles/fulfill.ts")(profile),
      }
    }
  });
};

export const saveProfile: EPR = async (info, { data }, send) => {
  console.log(U.toXML({
    call: K.ATTR({ model: info.model }, {
      [info.module]: K.ATTR({ method: info.method }, { data })
    })
  }));

  const refId = $(data).str("player.refid");
  if (!refId) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  if (!profile) return send.deny();

  let lastMarker = 0;
  let lastTheme = 0;
  let lastTitle = 0;
  let lastParts = 0;
  let lastSort = 0;
  let lastFilter = 0;
  let lastCategory = 0;
  let lastMselStat = 0;

  const result = $(data).element("result");

  if (result) {
    const tunes = result.elements("tune");
    const historys = {};
    const historyNode = $(data).elements("player.history.tune");

    if (historyNode) {
      for (const history of historyNode) {
        historys[history.attr().log_id] = {
          timestamp: history.bigint("timestamp"),
          isHard: history.bool("player.result.is_hard_mode")
        };
      }
    }

    for (const tune of tunes) {
      const tuneId = tune.attr().id;

      profile.musicId = tune.number("music");
      profile.seqId = parseInt(tune.attr("player.score").seq);
      lastMarker = tune.number("marker");
      lastTheme = tune.number("theme");
      lastTitle = tune.number("title");
      lastParts = tune.number("parts");
      lastSort = tune.number("sort");
      lastFilter = tune.number("filter");
      lastCategory = tune.number("category");
      lastMselStat = tune.number("msel_stat");
      profile.rankSort = tune.number("rank_sort");
      profile.comboDisp = tune.number("combo_disp");

      await updateScore(refId, {
        musicId: tune.number("music"),
        seq: parseInt(tune.attr("player.score").seq),
        score: tune.number("player.score"),
        clear: parseInt(tune.attr("player.score").clear),
        isHard: historys[tuneId]?.isHard || false,
        bestScore: tune.number("player.best_score"),
        bestClear: tune.number("player.best_clear"),
        playCount: tune.number("player.play_cnt"),
        clearCount: tune.number("player.clear_cnt"),
        fullcomboCount: tune.number("player.fc_cnt"),
        excellentCount: tune.number("player.exc_cnt"),
        ...tune.element("player.mbar") && { mbar: tune.numbers("player.mbar") }
      });
    }
  }

  profile.lastPlayTime = Number($(data).bigint("player.time_gameend"));
  profile.lastShopname = $(data).str("player.shopname");
  profile.lastAreaname = $(data).str("player.areaname");

  if (version === 3) {
    if (!profile.knit) profile.knit = {};
    profile.knit.jubility = $(data).number("player.info.jubility");
    profile.knit.jubilityYday = $(data).number("player.info.jubility_yday");
    profile.knit.acvProg = $(data).number("player.info.acv_prog");
    profile.knit.acvPoint = $(data).number("player.info.acv_point");
    profile.knit.acvWool = $(data).number("player.info.acv_wool");
    profile.knit.acvRouteProg = $(data).numbers("player.info.acv_route_prog");
    profile.knit.tuneCount = $(data).number("player.info.tune_cnt");
    profile.knit.saveCount = $(data).number("player.info.save_cnt");
    profile.knit.savedCount = $(data).number("player.info.saved_cnt");
    profile.knit.fcCount = $(data).number("player.info.fc_cnt");
    profile.knit.fcSeqCount = $(data).number("player.info.fc_seq_cnt");
    profile.knit.exCount = $(data).number("player.info.exc_cnt");
    profile.knit.exSeqCount = $(data).number("player.info.exc_seq_cnt");
    profile.knit.matchCount = $(data).number("player.info.match_cnt");
    profile.knit.conSelCount = $(data).number("player.info.con_sel_cnt");

    profile.knit.marker = lastMarker;
    profile.knit.theme = lastTheme;
    profile.knit.title = lastTitle;
    profile.knit.sort = lastSort;
    profile.knit.filter = lastFilter;
    profile.knit.mselStat = lastMselStat;
    profile.knit.conSuggestId = $(data).number("player.info.con_suggest_id");

    profile.knit.secretList = $(data).numbers("player.item.secret_list");
    profile.knit.themeList = $(data).number("player.item.theme_list");
    profile.knit.markerList = $(data).numbers("player.item.marker_list");
    profile.knit.titleList = $(data).numbers("player.item.title_list");

    profile.knit.secretListNew = $(data).numbers("player.item.secret_new");
    profile.knit.themeListNew = $(data).number("player.item.theme_new");
    profile.knit.markerListNew = $(data).numbers("player.item.marker_new");
    profile.knit.titleListNew = $(data).numbers("player.item.title_new");
  }

  if (version === 4) {
    if (!profile.copious) profile.copious = {};
    profile.copious.jubility = $(data).number("player.info.jubility");
    profile.copious.jubilityYday = $(data).number("player.info.jubility_yday");
    profile.copious.acvState = $(data).number("player.info.acv_state");
    profile.copious.acvPoint = $(data).number("player.info.acv_point");
    profile.copious.acvOwn = $(data).number("player.info.acv_own");
    profile.copious.acvThrow = $(data).numbers("player.info.acv_throw");
    profile.copious.tuneCount = $(data).number("player.info.tune_cnt");
    profile.copious.saveCount = $(data).number("player.info.save_cnt");
    profile.copious.savedCount = $(data).number("player.info.saved_cnt");
    profile.copious.fcCount = $(data).number("player.info.fc_cnt");
    profile.copious.fcSeqCount = $(data).number("player.info.fc_seq_cnt");
    profile.copious.exCount = $(data).number("player.info.exc_cnt");
    profile.copious.exSeqCount = $(data).number("player.info.exc_seq_cnt");
    profile.copious.matchCount = $(data).number("player.info.match_cnt");
    profile.copious.totalBestScore = $(data).number("player.info.total_best_score");

    profile.copious.marker = lastMarker;
    profile.copious.theme = lastTheme;
    profile.copious.title = lastTitle;
    profile.copious.parts = lastParts;
    profile.copious.sort = lastSort;
    profile.copious.category = lastCategory;
    profile.copious.mselStat = lastMselStat;

    profile.copious.secretList = $(data).numbers("player.item.secret_list");
    profile.copious.themeList = $(data).number("player.item.theme_list");
    profile.copious.markerList = $(data).numbers("player.item.marker_list");
    profile.copious.titleList = $(data).numbers("player.item.title_list");
    profile.copious.partsList = $(data).numbers("player.item.parts_list");

    profile.copious.secretListNew = $(data).numbers("player.item.secret_new");
    profile.copious.themeListNew = $(data).number("player.item.theme_new");
    profile.copious.markerListNew = $(data).numbers("player.item.marker_new");
    profile.copious.titleListNew = $(data).numbers("player.item.title_new");
  }

  if (version === 5) {
    if (!profile.saucer) profile.saucer = {};
    profile.saucer.jubility = $(data).number("player.info.jubility");
    profile.saucer.jubilityYday = $(data).number("player.info.jubility_yday");
    profile.saucer.tuneCount = $(data).number("player.info.tune_cnt");
    profile.saucer.clearCount = $(data).number("player.info.clear_cnt");
    profile.saucer.saveCount = $(data).number("player.info.save_cnt");
    profile.saucer.savedCount = $(data).number("player.info.saved_cnt");
    profile.saucer.fcCount = $(data).number("player.info.fc_cnt");
    profile.saucer.exCount = $(data).number("player.info.exc_cnt");
    profile.saucer.matchCount = $(data).number("player.info.match_cnt");
    profile.saucer.totalBestScore = $(data).number("player.info.total_best_score");

    profile.saucer.marker = lastMarker;
    profile.saucer.theme = lastTheme;
    profile.saucer.title = lastTitle;
    profile.saucer.parts = lastParts;
    profile.saucer.sort = lastSort;
    profile.saucer.category = lastCategory;

    profile.saucer.secretList = $(data).numbers("player.item.secret_list");
    profile.saucer.themeList = $(data).number("player.item.theme_list");
    profile.saucer.markerList = $(data).numbers("player.item.marker_list");
    profile.saucer.titleList = $(data).numbers("player.item.title_list");
    profile.saucer.partsList = $(data).numbers("player.item.parts_list");

    profile.saucer.secretListNew = $(data).numbers("player.item.secret_new");
    profile.saucer.themeListNew = $(data).number("player.item.theme_new");
    profile.saucer.markerListNew = $(data).numbers("player.item.marker_new");
    profile.saucer.titleListNew = $(data).numbers("player.item.title_new");

    if (!profile.saucer.bistro) profile.saucer.bistro = {};
    profile.saucer.bistro.carry_over = $(data).number("player.bistro.carry_over");
  }

  if (version === 6) {
    if (!profile.fulfill) profile.fulfill = {};
    profile.fulfill.jubility = $(data).number("player.info.jubility");
    profile.fulfill.jubilityYday = $(data).number("player.info.jubility_yday");
    profile.fulfill.tuneCount = $(data).number("player.info.tune_cnt");
    profile.fulfill.saveCount = $(data).number("player.info.save_cnt");
    profile.fulfill.savedCount = $(data).number("player.info.saved_cnt");
    profile.fulfill.fcCount = $(data).number("player.info.fc_cnt");
    profile.fulfill.exCount = $(data).number("player.info.exc_cnt");
    profile.fulfill.clearCount = $(data).number("player.info.clear_cnt");
    profile.fulfill.matchCount = $(data).number("player.info.match_cnt");
    profile.fulfill.expertOption = $(data).number("player.info.expert_option");
    profile.fulfill.matching = $(data).number("player.info.matching");
    profile.fulfill.hazard = $(data).number("player.info.hazard");
    profile.fulfill.hard = $(data).number("player.info.hard");
    profile.fulfill.extraPoint = $(data).number("player.info.extra_point");
    profile.fulfill.isExtraPlayed = $(data).bool("player.info.is_extra_played");
    profile.fulfill.totalBestScore = $(data).number("player.info.total_best_score");
    profile.fulfill.clearMaxLevel = $(data).number("player.info.clear_max_level");
    profile.fulfill.fcMaxLevel = $(data).number("player.info.fc_max_level");
    profile.fulfill.exMaxLevel = $(data).number("player.info.exc_max_level");

    profile.fulfill.marker = lastMarker;
    profile.fulfill.theme = lastTheme;
    profile.fulfill.title = lastTitle;
    profile.fulfill.parts = lastParts;
    profile.fulfill.sort = lastSort;
    profile.fulfill.category = lastCategory;

    profile.fulfill.secretList = $(data).numbers("player.item.secret_list");
    profile.fulfill.themeList = $(data).number("player.item.theme_list");
    profile.fulfill.markerList = $(data).numbers("player.item.marker_list");
    profile.fulfill.titleList = $(data).numbers("player.item.title_list");
    profile.fulfill.partsList = $(data).numbers("player.item.parts_list");
    profile.fulfill.secretListNew = $(data).numbers("player.item.secret_new");
    profile.fulfill.themeListNew = $(data).number("player.item.theme_new");
    profile.fulfill.markerListNew = $(data).numbers("player.item.marker_new");
    profile.fulfill.titleListNew = $(data).numbers("player.item.title_new");

    const courseNode = $(data).element("course");
    if (courseNode) {
      profile.fulfill.lastCourseId = courseNode.number("course_id");

      await DB.Upsert<CourseResult>(refId, {
        collection: "course_results",
        courseId: courseNode.number("course_id"),
        version: 6
      }, {
        $set: {
          rating: courseNode.number("rating"),
          scores: courseNode.elements("music").map(m => m.number("score"))
        }
      });
    }
  }

  try {
    await DB.Update<Profile>(refId, { collection: "profile" }, profile);

    return send.object({
      data: {
        player: { session_id: K.ITEM("s32", 1) },
        ...version === 4 && { collabo: { deller: K.ITEM("s32", 0) } }
      }
    });
  } catch (e) {
    console.error(`Profile save failed: ${e.message}`);
    return send.deny();
  }
};

export const loadScore: EPR = async (info, data, send) => {
  const jubeatId = $(data).number("data.player.jid");
  if (!jubeatId) return send.deny();

  const profile = await DB.FindOne<Profile>(null, { collection: "profile", jubeatId });
  if (!profile) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const scores = await DB.Find<Score>(profile.__refid, { collection: "score" });
  const scoreData: { [musicId: number]: { score: number[], clear: number[], playCnt: number[], clearCnt: number[], fcCnt: number[], exCnt: number[], bar: number[][] } } = {};

  for (const score of scores) {
    if (!scoreData[score.musicId]) {
      scoreData[score.musicId] = {
        playCnt: [0, 0, 0],
        clearCnt: [0, 0, 0],
        fcCnt: [0, 0, 0],
        exCnt: [0, 0, 0],
        clear: [0, 0, 0],
        score: [0, 0, 0],
        bar: [Array(30).fill(0), Array(30).fill(0), Array(30).fill(0)]
      };
    }

    const data = scoreData[score.musicId];
    data.playCnt[score.seq] = score.playCount;
    data.clearCnt[score.seq] = score.clearCount;
    data.fcCnt[score.seq] = score.fullcomboCount;
    data.exCnt[score.seq] = score.excellentCount;
    data.clear[score.seq] = score.clear;
    data.score[score.seq] = score.score;
    data.bar[score.seq] = score.bar;
  }

  return send.object({
    data: {
      player: {
        jid: K.ITEM("s32", jubeatId),

        ...version >= 3 && {
          playdata: K.ATTR({ count: String(Object.keys(scoreData).length) }, {
            musicdata: Object.keys(scoreData).map(musicId => K.ATTR({ music_id: String(musicId) }, {
              score: K.ARRAY("s32", scoreData[musicId].score),
              clear: K.ARRAY("s8", scoreData[musicId].clear),
              play_cnt: K.ARRAY("s32", scoreData[musicId].playCnt),
              clear_cnt: K.ARRAY("s32", scoreData[musicId].clearCnt),
              fc_cnt: K.ARRAY("s32", scoreData[musicId].fcCnt),
              ex_cnt: K.ARRAY("s32", scoreData[musicId].exCnt),
              bar: scoreData[musicId].bar.map((bar, seq) => K.ARRAY("u8", bar, { seq: String(seq) }))
            }))
          })
        }
      }
    }
  });
};

const updateScore = async (refId: string, data: any): Promise<boolean> => {
  try {
    await DB.Upsert<Score>(refId, {
      collection: "score",
      musicId: data.musicId,
      seq: data.seq,
      isHardMode: data.isHard
    }, {
      $set: {
        musicId: data.musicId,
        seq: data.seq,
        score: data.bestScore,
        clear: data.bestClear,
        musicRate: 0,
        ...data.mbar && { bar: data.mbar, },
        playCount: data.playCount,
        clearCount: data.clearCount,
        fullcomboCount: data.fullcomboCount,
        excellentCount: data.excellentCount,
        isHardMode: data.isHard
      }
    });

    return true;
  } catch (e) {
    console.error("Score saving failed: ", e.stack);
    return false;
  }
};

export const getCourse: EPR = async (info, data, send) => {
  const version = getVersion(info);
  if (version === 0) return send.deny();

  const jubeatId = $(data).number("data.player.jid");
  if (!jubeatId) return send.deny();

  const profile = await DB.FindOne<Profile>(null, { collection: "profile", jubeatId });
  if (!profile) return send.deny();

  if (version === 6) {
    const results = await DB.Find<CourseResult>(profile.__refid, { collection: "course_results", version: 6 });

    const { courses } = require("../data/fulfill_courses.json");

    const validCourseIds: number[] = courses.map(course => course.course_id);

    return send.object({
      data: {
        course_list: {
          course: courses.map(course => ({
            id: K.ITEM("s32", course.course_id),
            name: K.ITEM("str", course.course_name),
            level: K.ITEM("u8", course.course_level),

            norma: {
              norma_id: K.ARRAY("s32", course.norma.norma_id),
              bronze_value: K.ARRAY("s32", course.norma.bronze),
              silver_value: K.ARRAY("s32", course.norma.silver),
              gold_value: K.ARRAY("s32", course.norma.gold)
            },

            music_list: {
              music: course.music_list.map(music => (K.ATTR({ index: music.index }, {
                music_id: K.ITEM("s32", music.music_id),
                seq: K.ITEM("u8", music.seq_id)
              })))
            }
          }))
        },

        player_list: {
          player: {
            jid: K.ITEM("s32", jubeatId),

            result_list: {
              result: results.filter(e => validCourseIds.find(valid => valid === e.courseId)).map(result => ({
                id: K.ITEM("s32", result.courseId),
                rating: K.ITEM("u8", result.rating),
                score: K.ARRAY("s32", result.scores)
              }))
            }
          }
        },

        last_course_id: K.ITEM("s32", profile.fulfill?.lastCourseId || 0)
      }
    });
  }

  return send.deny();
};

export const meeting: EPR = (info, data, send) => {
  return send.object({
    data: {
      meeting: {
        single: K.ATTR({ count: "0" }),
        tag: K.ATTR({ count: "0" }),
      },
      reward: {
        total: K.ITEM("s32", 0),
        point: K.ITEM("s32", 0)
      }
    }
  });
};

export const getCollabo: EPR = (info, data, send) => {
  const version = getVersion(info);
  if (version === 0) return send.deny();

  if (version === 3) {
    return send.object({
      data: {
        collabo: {
          played: {
            iidx: K.ITEM("s8", 1),
            popn: K.ITEM("s8", 1),
            ddr: K.ITEM("s8", 1),
            reflec: K.ITEM("s8", 1),
            gfdm: K.ITEM("s8", 1),
          }
        }
      }
    });
  }

  if (version === 4) {
    return send.object({
      data: {
        player: {
          collabo: {
            reward: K.ITEM("s32", 0),
            dellar: K.ITEM("s32", 0),
            music_id: K.ITEM("s32", 0),
            wonder_state: K.ITEM("u32", 2),
            yellow_state: K.ITEM("u32", 2),
          }
        }
      }
    });
  }
};
