import { IIDX_CPUS } from "../models/arena";
import { GetVersion } from "../util";

export const gssysteminfo: EPR = async (info, data, send) => {
  const version = GetVersion(info);
  if (version < 24) return send.success();

  let result: any = {
    arena_schedule: {
      phase: K.ITEM("u8", U.GetConfig("ArenaPhase")),
      start: K.ITEM("u32", 1605784800),
      end: K.ITEM("u32", 4102326000)
    },
    arena_music_difficult: [],
    maching_class_range: [],
    arena_cpu_define: [],
  }

  switch (version) {
    case 33:
    case 32:
      result.arena_schedule.phase = K.ITEM("u8", 3);
      result.arena_schedule = Object.assign(result.arena_schedule, { season: K.ITEM("u8", 0) }); // arena season for online // 

    case 31:
      result.arena_schedule = Object.assign(result.arena_schedule, { rule_type: K.ITEM("u8", 0) }); // arena rule for online //

    default:
      break;
  }

  for (let s = 0; s < 2; ++s) {
    for (let c = 0; c < 20; ++c) {
      // arena_music_difficult //
      result.arena_music_difficult.push({
        play_style: K.ITEM("s32", s),
        arena_class: K.ITEM("s32", c),
        low_difficult: K.ITEM("s32", 1),
        high_difficult: K.ITEM("s32", 12),
        is_leggendaria: K.ITEM("bool", 1),
        force_music_list_id: K.ITEM("s32", 0),
      });

      // arena_cpu_define //
      result.arena_cpu_define.push({
        play_style: K.ITEM("s32", s),
        arena_class: K.ITEM("s32", c),
        grade_id: K.ITEM("s32", IIDX_CPUS[s][c][0]),
        low_music_difficult: K.ITEM("s32", IIDX_CPUS[s][c][1]),
        high_music_difficult: K.ITEM("s32", IIDX_CPUS[s][c][2]),
        is_leggendaria: K.ITEM("bool", IIDX_CPUS[s][c][3]),
      });

      // maching_class_range //
      result.maching_class_range.push({
        play_style: K.ITEM("s32", s),
        matching_class: K.ITEM("s32", c),
        low_arena_class: K.ITEM("s32", 1),
        high_arena_class: K.ITEM("s32", 20),
      });
    }
  }

  // following datas are made up needs to figure out correct way to do it //
  let music_open = JSON.parse(await IO.ReadFile("data/music_open.json", "utf-8"));
  if (!_.isNil(music_open[version])) {
    result = Object.assign(result, { music_open: [] });

    Object.keys(music_open).forEach(v => {
      Object.keys(music_open[v]).forEach(m => {
        if (Number(v) > version) return;

        result.music_open.push({
          music_id: K.ITEM("s32", Number(m)),
          kind: K.ITEM("s32", music_open[v][m].kind),
        });
      });
    });
  }

  if (version >= 31) {
    result = Object.assign(result, { grade_course: [] });
    let grade = JSON.parse(await IO.ReadFile("data/grade.json", "utf-8")); // following datas are made up needs to figure out correct way to do it //
    if (!_.isNil(grade[version])) {
      Object.keys(grade[version]).forEach(s => {
        Object.keys(grade[version][s]).forEach(c => {
          result.grade_course.push({
            play_style: K.ITEM("s32", Number(s)),
            grade_id: K.ITEM("s32", Number(c)),
            is_valid: K.ITEM("bool", true),
            music_id_0: K.ITEM("s32", grade[version][s][c].music_id[0]),
            class_id_0: K.ITEM("s32", grade[version][s][c].class_id[0]),
            music_id_1: K.ITEM("s32", grade[version][s][c].music_id[1]),
            class_id_1: K.ITEM("s32", grade[version][s][c].class_id[1]),
            music_id_2: K.ITEM("s32", grade[version][s][c].music_id[2]),
            class_id_2: K.ITEM("s32", grade[version][s][c].class_id[2]),
            music_id_3: K.ITEM("s32", grade[version][s][c].music_id[3]),
            class_id_3: K.ITEM("s32", grade[version][s][c].class_id[3]),
            index: K.ITEM("s32", result.grade_course.length),
            cube_num: K.ITEM("s32", 0),
            kind: K.ITEM("s32", grade[version][s][c].kind),
          });
        });
      });
    }
  }

  // following datas are made up needs to figure out correct way to do it //
  if (version >= 33) {
    let legg_open = JSON.parse(await IO.ReadFile("data/legg_open.json", "utf-8"));
    if (!_.isNil(legg_open[version])) {
      result = Object.assign(result, { leggendaria_open: [] });

      Object.keys(legg_open).forEach(v => {
        Object.keys(legg_open[v]).forEach(m => {
          if (Number(v) > version) return;

          result.leggendaria_open.push({
            music_id: K.ITEM("s32", Number(m)),
            kind: K.ITEM("s32", legg_open[v][m].kind),
          });
        });
      });
    }
  }

  let eventData = null;
  switch (version) {
    case 29:
      result = Object.assign(result, {
        CommonBossPhase: K.ATTR({ val: String(3) }),
        Event1InternalPhase: K.ATTR({ val: String(U.GetConfig("ch_event")) }),
        ExtraBossEventPhase: K.ATTR({ val: String(U.GetConfig("ch_extraboss")) }),
        isNewSongAnother12OpenFlg: K.ATTR({ val: String(Number(U.GetConfig("NewSongAnother12"))) }),
        gradeOpenPhase: K.ATTR({ val: String(U.GetConfig("Grade")) }),
        isEiseiOpenFlg: K.ATTR({ val: String(Number(U.GetConfig("Eisei"))) }),
        WorldTourismOpenList: K.ATTR({ val: String(-1) }),
        BPLBattleOpenPhase: K.ATTR({ val: String(2) }),
      });
      break;
    case 30:
      result = Object.assign(result, {
        CommonBossPhase: K.ATTR({ val: String(3) }),
        Event1InternalPhase: K.ATTR({ val: String(U.GetConfig("rs_event")) }),
        ExtraBossEventPhase: K.ATTR({ val: String(U.GetConfig("rs_extraboss")) }),
        isNewSongAnother12OpenFlg: K.ATTR({ val: String(Number(U.GetConfig("NewSongAnother12"))) }),
        gradeOpenPhase: K.ATTR({ val: String(U.GetConfig("Grade")) }),
        isEiseiOpenFlg: K.ATTR({ val: String(Number(U.GetConfig("Eisei"))) }),
        WorldTourismOpenList: K.ATTR({ val: String(-1) }),
        BPLBattleOpenPhase: K.ATTR({ val: String(2) }),
      })
      break;
    case 31:
      let totalMetron = 0;
      eventData = await DB.Find(null, {
        collection: "event_1",
        version: version,
        event_data: "myepo_map",
      });

      if (!_.isNil(eventData)) {
        eventData.forEach((res: any) => {
          totalMetron += Number(res.metron_total_get);
        });
      }

      Object.assign(result, {
        CommonBossPhase: K.ATTR({ val: String(3) }),
        Event1Value: K.ATTR({ val: String(U.GetConfig("ep_event")) }),
        Event1Phase: K.ATTR({ val: String(U.GetConfig("ep_event1")) }),
        Event2Phase: K.ATTR({ val: String(U.GetConfig("ep_event2")) }),
        ExtraBossEventPhase: K.ATTR({ val: String(U.GetConfig("ep_extraboss")) }),
        isNewSongAnother12OpenFlg: K.ATTR({ val: String(Number(U.GetConfig("NewSongAnother12"))) }),
        isKiwamiOpenFlg: K.ATTR({ val: String(Number(U.GetConfig("Eisei"))) }),
        WorldTourismOpenList: K.ATTR({ val: String(-1) }),
        BPLBattleOpenPhase: K.ATTR({ val: String(2) }),
        UnlockLeggendaria: K.ATTR({ val: String(1) }),
        BPLSerialCodePhase: K.ATTR({ val: String(0) }),
        Event1AllPlayerTotalGetMetron: K.ATTR({ val: String(totalMetron) }), // total amount of all users metron //
      });
      break;
    case 32:
      result = Object.assign(result, {
        Event1Value: K.ATTR({ val: String(U.GetConfig("pc_event")) }),
        Event1Phase: K.ATTR({ val: String(U.GetConfig("pc_event1")) }),
        Event2Phase: K.ATTR({ val: String(U.GetConfig("pc_event2")) }),
        ExtraBossEventPhase: K.ATTR({ val: String(U.GetConfig("pc_extraboss")) }),
        isNewSongAnother12OpenFlg: K.ATTR({ val: String(Number(U.GetConfig("NewSongAnother12"))) }),
        isKiwamiOpenFlg: K.ATTR({ val: String(Number(U.GetConfig("Eisei"))) }),
        WorldTourismOpenList: K.ATTR({ val: String(-1) }),
        BPLBattleOpenPhase: K.ATTR({ val: String(2) }),
      });
      break;
    case 33:
      let totalScorePoint = 0, totalMissPoint = 0;
      let extra_boss = await DB.Find(null, {
        collection: "extra_boss",
        version: version,
      });

      if (!_.isNil(extra_boss)) {
        extra_boss.forEach((res: any) => {
          totalScorePoint += Number(res.progress_point_score);
          totalMissPoint += Number(res.progress_point_miss);
        });
      }

      result = Object.assign(result, {
        Event1Phase: K.ATTR({ val: String(U.GetConfig("ss_event1")) }),
        ExtraBossEvent: K.ATTR({ val: String(U.GetConfig("ss_extraboss")) }),
        isNewSongAnother12OpenFlg: K.ATTR({ val: String(Number(U.GetConfig("NewSongAnother12"))) }),
        isKiwamiOpenFlg: K.ATTR({ val: String(Number(U.GetConfig("Eisei"))) }),
        WorldTourismOpenList: K.ATTR({ val: String(-1) }),
        BPLBattleOpenPhase: K.ATTR({ val: String(2) }),
        VocaloidEvent: K.ATTR({ val: String(U.GetConfig("ss_cyber")) }),
        KrankAppendSeason: K.ATTR({ val: String(0) }),
        the4thEvent: K.ATTR({ val: String(1)} ),
        beat: K.ATTR({ val: String(5293) }), // TODO:: Figure out what this value does //
        extraevent_2: {
          "@attr": {
            all_point_score: String(totalScorePoint),
            all_point_miss: String(totalMissPoint),
            season: String(Number(U.GetConfig("ss_extraboss_season"))),
          },
          /* up to 32 entries
          info: K.ATTR({
            gauge_level: String(),
            class_id: String(),
            score_extra: String(),
            miss_extra: String(),
            score_onemore: String(),
            miss_onemore: String()
          }),*/
        }
      });
      break;

    default:
      break;
  }

  return send.object(result);
};
