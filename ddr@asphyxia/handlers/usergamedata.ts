import { CommonOffset, LastOffset, OptionOffset, Profile } from "../models/profile";
import { formatCode } from "../utils";
import { Score } from "../models/score";
import { Ghost } from "../models/ghost";

enum GameStyle {
  SINGLE,
  DOUBLE,
  VERSUS
}

export const usergamedata: EPR = async (info, data, send) => {
  const mode = $(data).str("data.mode");
  const refId = $(data).str("data.refid");

  switch (mode) {
    case "userload":
      return send.object(await userload(refId));
    case "usernew":
      return send.object(await usernew(refId, data));
    case "usersave":
      return send.object(await usersave(refId, data));
    case "rivalload":
      return send.object(await rivalload(refId, data));
    case "ghostload":
      return send.object(await ghostload(refId, data));
    case "inheritance":
      return send.object(inheritance(refId));
    default:
      return send.deny();
  }
};

const userload = async (refId: string) => {
  let resObj = {
    result: K.ITEM("s32", 0),
    is_new: K.ITEM("bool", false),
    music: [],
    eventdata: []
  };

  if (!refId.startsWith("X000")) {
    const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

    if (!profile) resObj.is_new = K.ITEM("bool", true);

    const scores = await DB.Find<Score>(refId, { collection: "score" });

    for (const score of scores) {
      const note = [];

      for (let i = 0; i < 9; i++) {
        if (score.difficulty !== i) {
          note.push({
            count: K.ITEM("u16", 0),
            rank: K.ITEM("u8", 0),
            clearkind: K.ITEM("u8", 0),
            score: K.ITEM("s32", 0),
            ghostid: K.ITEM("s32", 0)
          });
        } else {
          note.push({
            count: K.ITEM("u16", 1),
            rank: K.ITEM("u8", score.rank),
            clearkind: K.ITEM("u8", score.clearKind),
            score: K.ITEM("s32", score.score),
            ghostid: K.ITEM("s32", score.songId)
          });
        }
      }

      resObj.music.push({
        mcode: K.ITEM("u32", score.songId),
        note
      });
    }

    resObj["grade"] = {
      single_grade: K.ITEM("u32", profile.singleGrade || 0),
      dougle_grade: K.ITEM("u32", profile.doubleGrade || 0)
    };
  }

  return resObj;
};

const usernew = async (refId: string, data: any) => {
  const shopArea = $(data).str("data.shoparea", "");

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    profile = (await DB.Upsert<Profile>(refId, { collection: "profile" }, {
      collection: "profile",
      ddrCode: _.random(1, 99999999),
      shopArea
    })).docs[0];
  }

  return {
    result: K.ITEM("s32", 0),
    seq: K.ITEM("str", formatCode(profile.ddrCode)),
    code: K.ITEM("s32", profile.ddrCode),
    shoparea: K.ITEM("str", profile.shopArea),
  };
};

const usersave = async (refId: string, serverData: any) => {
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (profile) {
    const data = $(serverData).element("data");
    const notes = data.elements("note");
    const events = data.elements("event");

    const common = profile.usergamedata.COMMON.strdata.split(",");
    const option = profile.usergamedata.OPTION.strdata.split(",");
    const last = profile.usergamedata.LAST.strdata.split(",");

    if (data.bool("isgameover")) {
      const style = data.number("playstyle");

      if (style === GameStyle.DOUBLE) {
        common[CommonOffset.DOUBLE_PLAYS] = (parseInt(common[CommonOffset.DOUBLE_PLAYS]) + 1) + "";
      } else {
        common[CommonOffset.SINGLE_PLAYS] = (parseInt(common[CommonOffset.SINGLE_PLAYS]) + 1) + "";
      }

      common[CommonOffset.TOTAL_PLAYS] = (+common[CommonOffset.DOUBLE_PLAYS]) + (+common[CommonOffset.SINGLE_PLAYS]) + "";

      const workoutEnabled = !!+common[CommonOffset.WEIGHT_DISPLAY];
      const workoutWeight = +common[CommonOffset.WEIGHT];

      if (workoutEnabled && workoutWeight > 0) {
        let total = 0;

        for (const note of notes) {
          total = total + note.number("calorie", 0);
        }

        last[LastOffset.CALORIES] = total + "";
      }

      for (const event of events) {
        const eventId = event.number("eventid", 0);
        const eventType = event.number("eventtype", 0);
        if (eventId === 0 || eventType === 0) continue;

        const eventCompleted = event.number("comptime") !== 0;
        const eventProgress = event.number("savedata");

        if (!profile.events) profile.events = {};
        profile.events[eventId] = {
          completed: eventCompleted,
          progress: eventProgress
        };
      }

      const gradeNode = data.element("grade");

      if (gradeNode) {
        const single = gradeNode.number("single_grade", 0);
        const double = gradeNode.number("double_grade", 0);

        profile.singleGrade = single;
        profile.doubleGrade = double;
      }
    }

    let scoreData: KDataReader | null;
    let stageNum = 0;

    for (const note of notes) {
      if (note.number("stagenum") > stageNum) {
        scoreData = note;
        stageNum = note.number("stagenum");
      }
    }

    if (scoreData) {
      const songId = scoreData.number("mcode");
      const difficulty = scoreData.number("notetype");
      const rank = scoreData.number("rank");
      const clearKind = scoreData.number("clearkind");
      const score = scoreData.number("score");
      const maxCombo = scoreData.number("maxcombo");
      const ghostSize = scoreData.number("ghostsize");
      const ghost = scoreData.str("ghost");

      option[OptionOffset.SPEED] = scoreData.number("opt_speed").toString(16);
      option[OptionOffset.BOOST] = scoreData.number("opt_boost").toString(16);
      option[OptionOffset.APPEARANCE] = scoreData.number("opt_appearance").toString(16);
      option[OptionOffset.TURN] = scoreData.number("opt_turn").toString(16);
      option[OptionOffset.STEP_ZONE] = scoreData.number("opt_dark").toString(16);
      option[OptionOffset.SCROLL] = scoreData.number("opt_scroll").toString(16);
      option[OptionOffset.ARROW_COLOR] = scoreData.number("opt_arrowcolor").toString(16);
      option[OptionOffset.CUT] = scoreData.number("opt_cut").toString(16);
      option[OptionOffset.FREEZE] = scoreData.number("opt_freeze").toString(16);
      option[OptionOffset.JUMP] = scoreData.number("opt_jump").toString(16);
      option[OptionOffset.ARROW_SKIN] = scoreData.number("opt_arrowshape").toString(16);
      option[OptionOffset.FILTER] = scoreData.number("opt_filter").toString(16);
      option[OptionOffset.GUIDELINE] = scoreData.number("opt_guideline").toString(16);
      option[OptionOffset.GAUGE] = scoreData.number("opt_gauge").toString(16);
      option[OptionOffset.COMBO_POSITION] = scoreData.number("opt_judgepriority").toString(16);
      option[OptionOffset.FAST_SLOW] = scoreData.number("opt_timing").toString(16);

      await DB.Upsert<Score>(refId, {
        collection: "score",
        songId,
        difficulty
      }, {
        $set: {
          rank,
          clearKind,
          score,
          maxCombo
        }
      });

      await DB.Upsert<Ghost>(refId, {
        collection: "ghost",
        songId,
        difficulty
      }, {
        $set: {
          ghostSize,
          ghost
        }
      });
    }

    await DB.Update<Profile>(refId, { collection: "profile" }, {
      $set: {
        "usergamedata.COMMON.strdata": common.join(","),
        "usergamedata.OPTION.strdata": option.join(","),
        "usergamedata.LAST.strdata": last.join(","),
      }
    });
  }

  return {
    result: K.ITEM("s32", 0)
  };
};

const rivalload = (refId: string, data: any) => {
  const loadFlag = $(data).number("data.loadflag");

  const record = [];

  return {
    result: K.ITEM("s32", 0),

    data: {
      recordtype: K.ITEM("s32", loadFlag),
      record
    }
  };
};

const ghostload = (refId: string, data: any) => {
  const ghostdata = {};

  return {
    result: K.ITEM("s32", 0),
    ghostdata
  };
};

const inheritance = (refId: string) => {
  return {
    result: K.ITEM("s32", 0),
    InheritanceStatus: K.ITEM("s32", 1)
  };
};
