import {Score} from "../models/score"
import Profile from "../models/profile";
import { Course } from "../models/course";
import { COURSE_STATUS } from "../static/data";

export const saveProfile = async (info, {data}, send) => {
    console.log("gameend.regist");
    console.log(data, {depth:null});
    const refId = $(data).str("player.refid");
    if (!refId) return send.deny();

    const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) return send.deny();

    let lastMarker = 0;
    let lastTheme = 0;
    let lastTitle = 0;
    let lastParts = 0;
    let lastSort = 0;
    let lastCategory = 0;

    const courses = $(data).elements("player.course_list.course");
    const tunes = $(data).elements("result.tune");
    const select_course = $(data).elements("player.select_course");
    const course_cleared : { [couseId: number]: { is_cleared: boolean} } = {};

    if(select_course){
      for(const course of select_course){
        course_cleared[course.attr("").id] = course.bool("is_cleared");
      }
    }

    for (const course of courses){
      const courseID = course.attr("").id;
      await updateCourse(refId, {
        courseID: courseID,
        seen: (course.number("status") & COURSE_STATUS.SEEN) != 0,
        played: (course.number("status") & COURSE_STATUS.PLAYED) != 0,
        cleared: course_cleared[courseID] || (course.number("status") & COURSE_STATUS.CLEARED) != 0,
      });
    }

    for (const tune of tunes) {
      profile.musicId = tune.number("music");
      profile.seqId = parseInt(tune.attr("player.score").seq);

      await updateScore(refId, {
        bestmusicRate: tune.number("player.best_music_rate"),
        musicRate: tune.number("player.music_rate"),
        musicId: tune.number("music"),
        seq: parseInt(tune.attr("player.score").seq),
        score: tune.number("player.score"),
        clear: parseInt(tune.attr("player.score").clear),
        isHard: tune.bool("player.is_hard_mode"),
        bestScore: tune.number("player.best_score"),
        bestClear: tune.number("player.best_clear"),
        playCount: tune.number("player.play_cnt"),
        clearCount: tune.number("player.clear_cnt"),
        fullcomboCount: tune.number("player.fc_cnt"),
        excellentCount: tune.number("player.ex_cnt"),
        ...tune.element("player.mbar") && { mbar: tune.numbers("player.mbar") }
      });
    }
    
    lastMarker = $(data).number("player.last.settings.marker");
    lastTheme = $(data).number("player.last.settings.theme");
    lastTitle = $(data).number("player.last.settings.title");
    lastParts = $(data).number("player.last.settings.parts");
    lastSort = $(data).number("player.last.sort");
    lastCategory = $(data).number("player.last.category");
    profile.eventFlag = Number($(data).bigint("player.event_flag"));
    profile.rankSort = $(data).number("player.last.settings.rank_sort");
    profile.comboDisp = $(data).number("player.last.settings.combo_disp");
  
    profile.lastPlayTime = Number($(data).bigint("info.play_time"));
    profile.lastShopname = $(data).str("info.shopname");
    profile.lastAreaname = $(data).str("info.areaname");

    profile.tuneCount = $(data).number("player.info.tune_cnt");
    profile.saveCount = $(data).number("player.info.save_cnt");
    profile.savedCount = $(data).number("player.info.saved_cnt");
    profile.fcCount = $(data).number("player.info.fc_cnt");
    profile.exCount = $(data).number("player.info.ex_cnt");
    profile.clearCount = $(data).number("player.info.clear_cnt");
    profile.matchCount = $(data).number("player.info.match_cnt");
    profile.expertOption = $(data).number("player.last.expert_option");
    profile.matching = $(data).number("player.last.settings.matching");
    profile.hazard =$(data).number("player.last.settings.hazard");
    profile.hard = $(data).number("player.last.settings.hard");
    profile.bonusPoints = $(data).number("player.info.bonus_tune_points");
    profile.isBonusPlayed = $(data).bool("player.info.is_bonus_tune_played");
    profile.totalBestScore = $(data).number("player.info.total_best_score.normal");
    profile.clearMaxLevel = $(data).number("player.info.clear_max_level");
    profile.fcMaxLevel = $(data).number("player.info.fc_max_level");
    profile.exMaxLevel = $(data).number("player.info.ex_max_level");
    profile.navi = Number($(data).bigint("player.navi.flag"));
    profile.isFirstplay = $(data).bool("player.free_first_play.is_applied");
    profile.marker = lastMarker;
    profile.theme = lastTheme;
    profile.title = lastTitle;
    profile.parts = lastParts;
    profile.sort = lastSort;
    profile.category = lastCategory;

    profile.commuList = $(data).numbers("player.item.commu_list");
    profile.secretList = $(data).numbers("player.item.secret_list");
    profile.themeList = $(data).number("player.item.theme_list");
    profile.markerList = $(data).numbers("player.item.marker_list");
    profile.titleList = $(data).numbers("player.item.title_list");
    profile.partsList = $(data).numbers("player.item.parts_list");
    profile.secretListNew = $(data).numbers("player.item.new.secret_list");
    profile.themeListNew =  $(data).numbers("player.item.new.theme_list");
    profile.markerListNew =  $(data).numbers("player.item.new.marker_list");

    try {
        await DB.Update<Profile>(refId, { collection: "profile" }, profile);
    
        return send.object({
          data: {
            player: { session_id: K.ITEM("s32", 1) },
            collabo: { deller: K.ITEM("s32", 0) }
          }
        }, {compress:true});
      } catch (e) {
        console.error(`Profile save failed: ${e.message}`);
        return send.deny();
      }
}

const updateScore = async (refId: string, data: any): Promise<boolean> => {
  try {
    await DB.Upsert<Score>(refId, {
      collection: "score",
      musicId: data.musicId,
      seq: data.seq,
      isHardMode: data.isHard,
    }, {
      $set: {
        musicId: data.musicId,
        seq: data.seq,
        score: data.bestScore,
        clear: data.bestClear,
        musicRate: data.musicRate>data.bestmusicRate?data.musicRate:data.bestmusicRate,
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

const updateCourse = async (refId: string, data: any): Promise<boolean> => {
  try {
    await DB.Upsert<Course>(refId, {
      collection: "course",
      courseId: data.courseID,
    }, {
      $set: {
        courseId: data.courseID,
        seen: data.seen,
        played: data.played,
        cleared: data.cleared
      }
    });

    return true;
  } catch (e) {
    console.error("Course saving failed: ", e.stack);
    return false;
  }
};
