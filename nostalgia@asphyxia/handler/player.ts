// import { EAHandler } from '../../util/EAHandler';
// import { get, _.isArray } from 'lodash';
// import { Logger } from '../../util/Logger';
import { Profile } from '../models/profile';
import { Scores } from '../models/scores';
import { permitted_list } from './common';
// import { getValue, getArray, getAttr, getStr, getBigInt } from '../../util/Helper';


// export const event_list = {
//   event: {
//     '@attr': {
//       index: 1,
//     },
//     'status': K.ITEM('s8', 1),
//     'start_time': K.ITEM('u64', BigInt(0)),
//     'end_time': K.ITEM('u64', BigInt(0)),
//   },
// };

const getEventInfo = () => {
  const event: any[] = [];
  for (let i = 1; i <= 17; ++i) {
    event.push({
      type: K.ITEM('s32', 4),
      index: K.ITEM('s32', i),
      status: K.ITEM('s8', 1),
      start_time: K.ITEM('u64', BigInt(0)),
      end_time: K.ITEM('u64', BigInt(0)),
      param1: K.ITEM('u64', BigInt(0)),
      param2: K.ITEM('u64', BigInt(0)),
    });
  }
  return event;
};

const getPlayerData = async (refid: string, name?: string) => {
  const p = await readProfile(refid);

  if (name && name.length > 0) {
    p.name = name;
    await writeProfile(refid, p);
  }

  const param: any[] = [];
  for (const t in p.params) {
    const para = p.params[t];
    param.push(K.ATTR({type: t}, {
      count: K.ITEM('s32', para.length),
      params_array: K.ARRAY('s32', para),
    }));
  }

  const brooch: any[] = [];
  for (const b in p.brooches) {
    const bData = p.brooches[b];
    brooch.push(K.ATTR({ index: b }, {
      watch_count: K.ITEM('s32', bData.watch),
      level: K.ITEM('s8', bData.level),
      invested_steps: K.ITEM('s32', bData.steps),
      is_new_brooch: K.ITEM('bool', bData.new),
    }));
  }

  // Unlock brooches
  for (let i = 101; i <= 124; ++i) {
    brooch.push(K.ATTR({ index: `${i}` }, {
      'watch_count': K.ITEM('s32', 0),
      'level': K.ITEM('s8', 1),
      'invested_steps': K.ITEM('s32', 0),
      'is_new_brooch': K.ITEM('bool', 0),
    }));
  }

  const kentei_record: any[] = [];
  for (const k in p.kentei) {
    const kentei = p.kentei[k];

    kentei_record.push({
      stage_prog: K.ITEM('s8', kentei.stage),
      kentei_index: K.ITEM('s32', parseInt(k, 10)),
      score: K.ARRAY('s32', kentei.score),
      clear_rate: K.ITEM('s32', kentei.rate),
      clear_flag: K.ITEM('u32', kentei.flag),
      play_count: K.ITEM('s32', kentei.count),
    });
  }

  const island_progress: any[] = [];
  for (const i in p.islands) {
    const island = p.islands[i];

    const container: any[] = [];
    for (const c in island.containers) {
      const cont = island.containers[c];

      const reward: any[] = [];
      for (const r in cont.rewards) {
        const rew = cont.rewards[r];

        reward.push({
          reward_index: K.ITEM('s32', parseInt(r, 10)),
          point: K.ITEM('s32', rew),
        });
      }

      container.push({
        container_no: K.ITEM('s32', parseInt(c, 10)),
        movie_prog: K.ITEM('s8', cont.prog),
        reward,
      });
    }

    island_progress.push(K.ATTR({ index: i }, {
      lookUnlockWin: K.ITEM('s32', island.look),
      select_container: K.ITEM('s32', island.select),
      travelledTime: K.ITEM('u32', island.time),
      container,
    }));
  }

  return {
    name: K.ITEM('str', p.name),
    play_count: K.ITEM('s32', p.playCount),
    today_play_count: K.ITEM('s32', p.todayPlayCount),
    permitted_list,
    event_info_list: { event: getEventInfo() },
    music_list: {
      flag: [
        K.ARRAY('s32', p.musicList.type_0, { sheet_type: '0' }),
        K.ARRAY('s32', p.musicList.type_1, { sheet_type: '1' }),
        K.ARRAY('s32', p.musicList.type_2, { sheet_type: '2' }),
        K.ARRAY('s32', p.musicList.type_3, { sheet_type: '3' }),
      ],
    },
    free_for_play_music_list: {
      flag: [
        K.ARRAY('s32', p.musicList2.type_0, { sheet_type: '0' }),
        K.ARRAY('s32', p.musicList2.type_1, { sheet_type: '1' }),
        K.ARRAY('s32', p.musicList2.type_2, { sheet_type: '2' }),
        K.ARRAY('s32', p.musicList2.type_3, { sheet_type: '3' }),
      ],
    },
    last: {
      music_index: K.ITEM('s32', p.music),
      sheet_type: K.ITEM('s8', p.sheet),
      brooch_index: K.ITEM('s32', p.brooch),
      hi_speed_level: K.ITEM('s32', p.hispeed),
      beat_guide: K.ITEM('s8', p.beatGuide),
      headphone_volume: K.ITEM('s8', p.headphone),
      judge_bar_pos: K.ITEM('s32', p.judgeBar),
      music_group: K.ITEM('s32', p.group),
      hands_mode: K.ITEM('s8', p.mode),
      near_setting: K.ITEM('s8', p.near),
      judge_delay_offset: K.ITEM('s8', p.offset),
      bingo_index: K.ITEM('s32', p.bingo),
      total_skill_value: K.ITEM('u64', BigInt(p.skill)),
      key_beam_level: K.ITEM('s8', p.keyBeam),
      orbit_type: K.ITEM('s8', p.orbit),
      note_height: K.ITEM('s8', p.noteHeight),
      note_width: K.ITEM('s8', p.noteWidth),
      judge_width_type: K.ITEM('s8', p.judgeWidth),
      beat_guide_volume: K.ITEM('s8', p.beatVolume),
      beat_guide_type: K.ITEM('s8', p.beatType),
      key_volume_offset: K.ITEM('s8', p.keyVolume),
      bgm_volume_offset: K.ITEM('s8', p.bgmVolume),
      note_disp_type: K.ITEM('s8', p.note),
      slow_fast: K.ITEM('s8', p.sf),
      judge_effect_adjust: K.ITEM('s8', p.judgeFX),
      simple_bg: K.ITEM('s8', p.simple),
    },
    brooch_list: {
      brooch,
    },
    extra_param: { param },
    present_list: {},
    various_music_list: {
      data: [
        K.ATTR({ list_type: '0'  }, {
          cond_flag: K.ITEM('s32', 0),
          flag: K.ITEM('s32', 0, { sheet_type: '0' }),
        }),
      ],
    },
    island_progress_list: { island_progress },
    player_information_list: {},
    kentei_record_list: { kentei_record },
    linkage_data_list: {},
    travel: {
      money: K.ITEM('s32', p.money),
      fame: K.ITEM('s32', p.fame),
      fame_index: K.ITEM('s32', p.fameId),
      island_id: K.ITEM('s32', p.island),
    },
  };
};

export const regist_playdata: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const name = $(data).str('name');
  console.debug(`nos op2 regist: ${name}`);

  send.object(await getPlayerData(refid, name));
};

export const get_playdata: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  send.object(await getPlayerData(refid));
};

// export const set_stage_result: EPR = async (info, data, send) => {
//   return send.object();
// };

export const set_total_result: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const p = await readProfile(refid);

  p.playCount = $(data).number('play_count', p.playCount);
  p.todayPlayCount = $(data).number('today_play_count', p.todayPlayCount);

  const last = $(data).element('last');

  p.music = last.number('music_index', p.music);
  p.sheet = last.number('sheet_type', p.sheet);
  p.brooch = last.number('brooch_index', p.brooch);
  p.hispeed = last.number('hi_speed_level', p.hispeed);
  p.beatGuide = last.number('beat_guide', p.beatGuide);
  p.headphone = last.number('headphone_volume', p.headphone);
  p.judgeBar = last.number('judge_bar_pos', p.judgeBar);
  p.group = last.number('music_group', p.group);
  p.mode = last.number('hands_mode', p.mode);
  p.near = last.number('near_setting', p.near);
  p.offset = last.number('judge_delay_offset', p.offset);
  p.bingo = last.number('bingo_index', p.bingo);
  p.skill = `${last.bigint('total_skill_value') || p.skill}`;
  p.keyBeam = last.number('key_beam_level', p.keyBeam);
  p.orbit = last.number('orbit_type', p.orbit);
  p.noteHeight = last.number('note_height', p.noteHeight);
  p.noteWidth = last.number('note_width', p.noteWidth);
  p.judgeWidth = last.number('judge_width_type', p.judgeWidth);
  p.beatVolume = last.number('beat_guide_volume', p.beatVolume);
  p.beatType = last.number('beat_guide_type', p.beatType);
  p.keyVolume = last.number('key_volume_offset', p.keyVolume);
  p.bgmVolume = last.number('bgm_volume_offset', p.bgmVolume);
  p.note = last.number('note_disp_type', p.note);
  p.sf = last.number('slow_fast', p.sf);
  p.judgeFX = last.number('judge_effect_adjust', p.judgeFX);
  p.simple = last.number('simple_bg', p.simple);

  p.money = $(data).number('travel.money', p.money);
  p.fame = $(data).number('travel.fame', p.fame);
  p.fameId = $(data).number('travel.fame_index', p.fameId);
  p.island = $(data).number('travel.island_id', p.island);

  let flags = _.get($(data).obj, 'music_list.flag', []);
  if (!_.isArray(flags)) flags = [flags];
  for (const flag of flags) {
    const sheet = _.get(flag, '@attr.sheet_type', -1);
    if (sheet == '0') {
      p.musicList.type_0 = _.get(flag, '@content', p.musicList.type_0);
    } else if (sheet == '1') {
      p.musicList.type_1 = _.get(flag, '@content', p.musicList.type_1);
    } else if (sheet == '2') {
      p.musicList.type_2 = _.get(flag, '@content', p.musicList.type_2);
    } else if (sheet == '3') {
      p.musicList.type_3 = _.get(flag, '@content', p.musicList.type_3);
    }
  }

  let freeFlags = _.get($(data).obj, 'free_for_play_music_list.flag', []);
  if (!_.isArray(freeFlags)) freeFlags = [freeFlags];
  for (const flag of freeFlags) {
    const sheet = _.get(flag, '@attr.sheet_type', -1);
    if (sheet == '0') {
      p.musicList2.type_0 = _.get(flag, '@content', p.musicList2.type_0);
    } else if (sheet == '1') {
      p.musicList2.type_1 = _.get(flag, '@content', p.musicList2.type_1);
    } else if (sheet == '2') {
      p.musicList2.type_2 = _.get(flag, '@content', p.musicList2.type_2);
    } else if (sheet == '3') {
      p.musicList2.type_3 = _.get(flag, '@content', p.musicList2.type_3);
    }
  }

  // KENTEI
  let kenteis = $(data).elements('kentei_result_list.kentei_result');
  for (const kentei of kenteis) {
    const index = kentei.number('kentei_index', -1);
    if (index < 0) continue;

    const clearRate = kentei.number('clear_rate', 0);
    const oldClearRate = _.get(p, `kentei.${index}.rate`, 0);
    const isHigh = clearRate >= oldClearRate;

    p.kentei[index] = {
      rate: isHigh ? clearRate : oldClearRate,
      score: isHigh ? kentei.number('score', 0) : _.get(p, `kentei.${index}.score`, 0),
      stage: Math.max(kentei.number('stage_prog', 0), _.get(p, `kentei.${index}.stage`, 0)),
      flag: Math.max(kentei.number('clear_flag', 0), _.get(p, `kentei.${index}.flag`, 0)),
      count: Math.max(kentei.number('play_count', 0), _.get(p, `kentei.${index}.count`, 0)),
    };
  }

  // PARAMS
  let params = $(data).elements('extra_param.param');
  for (const param of params) {
    const type = param.attr().type;
    const parray = param.numbers('params_array');
    if (type == null || parray == null) continue;

    p.params[type] = parray;
  }

  // BROOCHES
  let broochs = $(data).elements('brooch_list.brooch');
  for (const brooch of broochs) {
    const index = parseInt(_.get(brooch, '@attr.index', '-1'));
    if (index < 0) continue;

    p.brooches[index] = {
      watch: brooch.number('watch_count', 0),
      level: brooch.number('level', 1),
      steps: brooch.number('invested_steps', 0),
      new: brooch.number('is_new_brooch', 0),
    };
  }

  // ISLAND
  let islands = $(data).elements('island_progress_list.island_progress');
  for (const island of islands) {
    const index = parseInt(_.get(island, '@attr.index', '-1'));
    if (index < 0) continue;

    const containers: Profile['islands']['0']['containers'] = {};
    let conts = $(data).elements('container');
    for (const cont of conts) {
      const index = cont.number('container_no', -1);
      if (index < 0) continue;

      const rewards: { [key: string]: number } = {};
      let rews = $(data).elements('reward');
      for (const rew of rews) {
        const index = rew.number('reward_index', -1);
        if (index < 0) continue;
        rewards[index] = rew.number('point', 0);
      }

      containers[index] = {
        prog: cont.number('movie_prog', 1),
        rewards,
      };
    }

    p.islands[index] = {
      look: island.number('lookUnlockWin', 0),
      select: island.number('select_container', 0),
      time: island.number('travelledTime', 0),
      containers,
    };
  }

  await writeProfile(refid, p);

  const scoreData = await readScores(refid);
  // Save Scores
  let stages = $(data).elements('stageinfo.stage');
  for (const stage of stages) {
    const mid = stage.attr().music_index
    const type = stage.attr().sheet_type

    const key = `${mid}:${type}`;
    const c = stage.element('common');
    const o = _.get(scoreData, `scores.${key}`, {});
    const isHigh = c.number('score', 0) >= _.get(o, 'score', 0);
    scoreData.scores[key] = {
      score: Math.max(c.number('score', 0), _.get(o, 'score', 0)),
      grade: Math.max(c.number('grade_basic', 0), _.get(o, 'grade', 0)),
      recital: Math.max(c.number('grade_recital', 0), _.get(o, 'recital', 0)),
      mode: isHigh ? c.number('hands_mode', 0) : _.get(o, 'mode', 0),
      count: Math.max(c.number('play_count', 0), _.get(o, 'count', 1)),
      clear: c.number('clear_count', _.get(o, 'clear', 0)),
      multi: c.number('multi_count', _.get(o, 'multi', 0)),
      flag: Math.max(c.number('clear_flag', 0), _.get(o, 'flag', 0)),
    };
  }

  // Save Recitals
  const rInfo = $(data).element('recital_info.recital');
  if (rInfo){
    const rIndex = rInfo.number('recital_index', -1);
    if (rIndex >= 0) {
      const r = rInfo.element('result');
      const o = _.get(scoreData, `recitals.${rIndex}`);
      const isHigh = r.number('total_score', 0) >= _.get(o, 'score', 0);
      scoreData.recitals[rIndex] = {
        count: Math.max(rInfo.number('recital_count', 0), _.get(o, 'count', 1)),
        hall: isHigh ? rInfo.number('hall_index') : _.get(o, 'hall', 0),
        cat: isHigh ? rInfo.numbers('cat_index') : _.get(o, 'cat', [3, 7, 9, 5, 16]),
        audience: isHigh ? r.number('audience') : _.get(o, 'audience', 0),
        money: isHigh ? r.number('money') : _.get(o, 'money', 0),
        fame: isHigh ? r.number('fame') : _.get(o, 'fame', 0),
        player: isHigh ? r.number('player_fame') : _.get(o, 'player', 0),
        score: isHigh ? r.number('total_score', 0) : _.get(o, 'score', 0),
        start: (isHigh ? r.number('recital_start_time', 0) : _.get(o, 'start', 0)).toString(),
        end: (isHigh ? r.number('recital_end_time', 0) : _.get(o, 'end', 0)).toString(),
      };
    }
  }

  await writeScores(refid, scoreData);

  send.success()
};

export const get_musicdata: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const scoreData = await readScores(refid);

  const recital_record: any[] = [];
  const music: any[] = [];

  for (const r in scoreData.recitals) {
    const reci = scoreData.recitals[r];
    recital_record.push({
      recital_index: K.ITEM('s32', parseInt(r, 10)),
      recital_count: K.ITEM('s32', reci.count),
      hall_index: K.ITEM('s8', reci.hall),
      cat_index: K.ARRAY('s16', reci.cat),
      audience: K.ITEM('s32', reci.audience),
      money: K.ITEM('s32', reci.money),
      fame: K.ITEM('s32', reci.fame),
      player_fame: K.ITEM('s32', reci.player),
      total_score: K.ITEM('s32', reci.score),
      total_base_score: K.ITEM('s32', reci.score),
      best_start_time: K.ITEM('u64', BigInt(reci.start)),
      best_end_time: K.ITEM('u64', BigInt(reci.end)),
    });
  }

  for (const m in scoreData.scores) {
    const mdata = m.split(':');
    const musi = scoreData.scores[m];

    music.push(K.ATTR({
        music_index: mdata[0],
        sheet_type: mdata[1],
      }, {
      'score': K.ITEM('s32', musi.score),
      'grade_basic': K.ITEM('u32', musi.grade),
      'grade_recital': K.ITEM('u32', musi.recital),
      'play_count': K.ITEM('s32', musi.count),
      'clear_count': K.ITEM('s32', musi.clear),
      'multi_count': K.ITEM('s32', musi.multi),
      'hands_mode': K.ITEM('s8', musi.mode),
      'clear_flag': K.ITEM('s32', musi.flag),
    }));
  }

  send.object({
    recital_record,
    music,
  });
};

async function readProfile(refid: string): Promise<Profile> {
  const profile = await DB.FindOne<Profile>(refid, { collection: 'profile'} )
  return profile || defaultProfile
}

async function writeProfile(refid: string, profile: Profile) {
  await DB.Upsert<Profile>(refid, { collection: 'profile'}, profile)
}

async function readScores(refid: string): Promise<Scores> {
  const score = await DB.FindOne<Scores>(refid, { collection: 'scores'} )
  return score || { collection: 'scores', recitals: {}, scores: {}}
}

async function writeScores(refid: string, scores: Scores) {
  await DB.Upsert<Scores>(refid, { collection: 'scores'}, scores)
}

const defaultProfile: Profile = {
    collection: 'profile',

    name: 'GUEST',
    music: 0,
    sheet: 0,
    brooch: 0,
    hispeed: 0,
    beatGuide: 1,
    headphone: 0,
    judgeBar: 250,
    group: 0,
    mode: 0,
    near: 0,
    offset: 0,
    bingo: 0,
    skill: '0',
    playCount: 0,
    todayPlayCount: 0,
    keyBeam: 0,
    orbit: 0,
    noteHeight: 10,
    noteWidth: 0,
    judgeWidth: 0,
    beatVolume: 0,
    beatType: 0,
    keyVolume: 0,
    bgmVolume: 0,
    note: 0,
    sf: 0,
    judgeFX: 0,
    simple: 0,
    money: 0,
    fame: 0,
    fameId: 0,
    island: 0,
    brooches: {
      '1': {
        level: 1,
        watch: 0,
        steps: 0,
        new: 0,
      },
    },
    islands: {},
    kentei: {},
    params: {
      '1': [0],
    },
    musicList: {
      type_0: Array(32).fill(-1),
      type_1: Array(32).fill(-1),
      type_2: Array(32).fill(-1),
      type_3: Array(32).fill(-1),
    },
    musicList2: {
      type_0: Array(32).fill(-1),
      type_1: Array(32).fill(-1),
      type_2: Array(32).fill(-1),
      type_3: Array(32).fill(-1),
    },
}
