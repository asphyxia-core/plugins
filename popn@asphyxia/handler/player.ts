import { Profile } from '../models/profile';
import { Scores } from '../models/scores';
import { getInfo, M39_EXTRA_DATA } from './common';
import { getVersion } from './utils';

const getPlayer = async (refid: string, version: string, name?: string) => {
  const profile = await readProfile(refid);

  if (name && name.length > 0) {
    profile.name = name;
    await writeProfile(refid, profile);
  }

  let player: any = {
    result: K.ITEM('s8', 0),
    account: {
      name: K.ITEM('str', profile.name),
      g_pm_id: K.ITEM('str', 'ASPHYXIAPLAY'),

      // Fixed stats
      total_play_cnt: K.ITEM('s16', 100),
      today_play_cnt: K.ITEM('s16', 50),
      consecutive_days: K.ITEM('s16', 365),
      total_days: K.ITEM('s16', 366),
      interval_day: K.ITEM('s16', 1),

      // TODO: do these
      my_best: K.ARRAY('s16', Array(10).fill(-1)),
      latest_music: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
    },

    netvs: {
      record: K.ARRAY('s16', [0, 0, 0, 0, 0, 0]),
      dialog: [
        K.ITEM('str', 'dialog#0'),
        K.ITEM('str', 'dialog#1'),
        K.ITEM('str', 'dialog#2'),
        K.ITEM('str', 'dialog#3'),
        K.ITEM('str', 'dialog#4'),
        K.ITEM('str', 'dialog#5'),
      ],
      ojama_condition: K.ARRAY('s8', Array(74).fill(0)),
      set_ojama: K.ARRAY('s8', [0, 0, 0]),
      set_recommend: K.ARRAY('s8', [0, 0, 0]),
      netvs_play_cnt: K.ITEM('u32', 0),
    },

    eaappli: {
      relation: K.ITEM('s8', 0),
    },

    stamp: [],
    item: [],
    chara_param: [],
    medal: [],
  };

  const profileStamps = profile.stamps[version] || { '0': 0 };

  for (const stamp in profileStamps) {
    player.stamp.push({
      stamp_id: K.ITEM('s16', parseInt(stamp, 10)),
      cnt: K.ITEM('s16', profileStamps[stamp]),
    });
  }

  const profileCharas = profile.charas[version] || {};

  for (const chara_id in profileCharas) {
    player.chara_param.push({
      chara_id: K.ITEM('u16', parseInt(chara_id, 10)),
      friendship: K.ITEM('u16', profileCharas[chara_id]),
    });
  }

  const profileMedals = profile.medals[version] || {};

  for (const medal_id in profileMedals) {
    const medal = profileMedals[medal_id];
    player.medal.push({
      medal_id: K.ITEM('s16', parseInt(medal_id, 10)),
      level: K.ITEM('s16', medal.level),
      exp: K.ITEM('s32', medal.exp),
      set_count: K.ITEM('s32', medal.set_count),
      get_count: K.ITEM('s32', medal.get_count),
    });
  }

  const profileItems = profile.items[version] || {};

  for (const key in profileItems) {
    const keyData = key.split(':');
    const type = parseInt(keyData[0], 10);
    const id = parseInt(keyData[1], 10);

    const item: any = {
      type: K.ITEM('u8', type),
      id: K.ITEM('u16', id),
      param: K.ITEM('u16', profileItems[key]),
      is_new: K.ITEM('bool', 0),
    };

    if (version != 'v23') {
      item.get_time = K.ITEM('u64', BigInt(0));
    }

    player.item.push(item);
  }

  // EXTRA DATA
  if (M39_EXTRA_DATA[version]) {
    for (const field in M39_EXTRA_DATA[version]) {
      const fieldMetaData = M39_EXTRA_DATA[version][field];
      if (fieldMetaData.isArray) {
        _.set(
          player,
          `${fieldMetaData.path}.${field}`,
          K.ARRAY(
            fieldMetaData.type as any,
            _.get(profile, `extras.${version}.${field}`, fieldMetaData.default)
          )
        );
      } else {
        _.set(
          player,
          `${fieldMetaData.path}.${field}`,
          K.ITEM(
            fieldMetaData.type as any,
            _.get(profile, `extras.${version}.${field}`, fieldMetaData.default)
          )
        );
      }
    }
  }

  // Extra Fixed Data
  if (version == 'v24') {
    player = {
      ...player,
      navi_data: {
        raisePoint: K.ARRAY('s32', [-1, -1, -1, -1, -1]),
        navi_param: {
          navi_id: K.ITEM('u16', 0),
          friendship: K.ITEM('s32', 0),
        },
      },

      area: {
        area_id: K.ITEM('u32', 0),
        chapter_index: K.ITEM('u8', 0),
        gauge_point: K.ITEM('u16', 0),
        is_cleared: K.ITEM('bool', 0),
        diary: K.ITEM('u32', 0),
      },

      mission: [
        {
          mission_id: K.ITEM('u32', 170),
          gauge_point: K.ITEM('u32', 0),
          mission_comp: K.ITEM('u32', 0),
        },
        {
          mission_id: K.ITEM('u32', 157),
          gauge_point: K.ITEM('u32', 0),
          mission_comp: K.ITEM('u32', 0),
        },
        {
          mission_id: K.ITEM('u32', 47),
          gauge_point: K.ITEM('u32', 0),
          mission_comp: K.ITEM('u32', 0),
        },
      ],
    };
  }

  return player;
};

export const newPlayer: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const version = getVersion(req);
  const name = $(data).str('name');

  send.object(await getPlayer(refid, version, name));
};

export const read: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const version = getVersion(req);

  send.object(await getPlayer(refid, version));
};

export const readScore: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const scoresData = await readScores(refid);
  const version = getVersion(req);
  const result: any = {
    music: [],
  };

  if(version == 'v24') {
    for (const key in scoresData.scores) {
      const keyData = key.split(':');
      const score = scoresData.scores[key];
      const music = parseInt(keyData[0], 10);
      const sheet = parseInt(keyData[1], 10);
      result.music.push({
        music_num: K.ITEM('s16', music),
        sheet_num: K.ITEM('u8', sheet),
        score: K.ITEM('s32', score.score),
        clear_type: K.ITEM('u8', score.clear_type || 0),
        clear_rank: K.ITEM('u8', score.clear_rank || 0),
        cnt: K.ITEM('s16', score.cnt),
      });
    }
  } else if(version == 'v23') {
    for (const key in scoresData.scores) {
      const keyData = key.split(':');
      const score = scoresData.scores[key];
      const music = parseInt(keyData[0], 10);
      const sheet = parseInt(keyData[1], 10);
      result.music.push({
        music_num: K.ITEM('s16', music),
        sheet_num: K.ITEM('u8', sheet),
        score: K.ITEM('s32', score.score),
        clear_type: K.ITEM('u8', score.clearmedal || 0),
        cnt: K.ITEM('s16', score.cnt),
        old_score: K.ITEM('s32', 0),
        old_clear_type: K.ITEM('u8', 0),
      });
    }
  }

  send.object(result);
};

export const writeMusic: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const music = $(data).number('music_num', -1);
  const sheet = $(data).number('sheet_num', -1);
  const clear_type = $(data).number('clear_type');
  const clear_rank = $(data).number('clear_rank');
  const clearmedal = $(data).number('clearmedal');
  const score = $(data).number('score', 0);

  if (music < 0 || sheet < 0) {
    return send.deny();
  }

  const key = `${music}:${sheet}`;

  const scoresData = await readScores(refid);
  if (!scoresData.scores[key]) {
    scoresData.scores[key] = {
      score,
      cnt: 1,
    };
  } else {
    scoresData.scores[key].score = Math.max(score, scoresData.scores[key].score);
    scoresData.scores[key].cnt = scoresData.scores[key].cnt + 1;
  }

  if (clear_type) {
    scoresData.scores[key].clear_type = Math.max(clear_type, scoresData.scores[key].clear_type || 0);
  }

  if (clear_rank) {
    scoresData.scores[key].clear_rank = Math.max(clear_rank, scoresData.scores[key].clear_rank || 0);
  }

  if (clearmedal) {
    scoresData.scores[key].clearmedal = Math.max(clearmedal, scoresData.scores[key].clearmedal || 0);
  }

  writeScores(refid, scoresData);

  const version = getVersion(req);
  if (version == 'v24') {

    const p = await readProfile(refid);

    const settings = [
      'hispeed',
      'popkun',
      'hidden',
      'hidden_rate',
      'sudden',
      'sudden_rate',
      'randmir',
      'ojama_0',
      'ojama_1',
      'forever_0',
      'forever_1',
      'full_setting',
      'guide_se',
      'judge',
      'slow',
      'fast',
      'mode',
    ];

    for (const setting of settings) {
      _.set(
        p,
        `extras.v24.${setting}`,
        _.get(data, `${setting}.@content.0`, _.get(p, `extras.v24.${setting}`, 0))
      );
    }

    _.set(p, `extras.v24.tutorial`, 32767);

    const chara = $(data).number('chara_num');
    if (chara) {
      _.set(p, 'extras.v24.chara', chara);
    }

    const music = $(data).number('music_num');
    if (music) {
      _.set(p, 'extras.v24.music', music);
    }

    const sheet = $(data).number('sheet_num');
    if (sheet) {
      _.set(p, 'extras.v24.sheet', sheet);
    }

    writeProfile(refid, p);
  }

  send.success();
};

export const write: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const version = getVersion(req);
  const profile = await readProfile(refid);

  const writeData: Partial<Profile> = {};

  if (M39_EXTRA_DATA[version]) {
    const extraFields = M39_EXTRA_DATA[version];
    for (const field in extraFields) {
      const fieldMetaData = extraFields[field];
      let value = _.get(data, `${fieldMetaData.path}.${field}.@content`);
      if ( value == 'undefined' && value == null ) {
        continue;
      }

      if (_.isArray(value) && value.length == 1) {
        value = value[0];
      }

      _.set(writeData, `extras.${version}.${field}`, value);
    }
  }

  const newProfile:Profile = {
    ...profile,
    ...writeData,
  };

  // stamps
  let stamps = _.get(data, 'stamp', []);
  if (!newProfile.stamps[version]) {
    newProfile.stamps[version] = { '0': 0 };
  }

  if (!_.isArray(stamps)) {
    stamps = [stamps];
  }

  for (const stamp of stamps) {
    const id = $(stamp).number('stamp_id');
    const cnt = $(stamp).number('cnt');

    newProfile.stamps[version][id] = cnt;
  }

  // medals
  let medals = _.get(data, 'medal', []);
  if (!newProfile.medals[version]) {
    newProfile.medals[version] = {};
  }

  if (!_.isArray(medals)) {
    medals = [medals];
  }

  for (const medal of medals) {
    const id = $(medal).number('medal_id');
    const level = $(medal).number('level');
    const exp = $(medal).number('exp');
    const set_count = $(medal).number('set_count');
    const get_count = $(medal).number('get_count');

    newProfile.medals[version][id] = {
      level,
      exp,
      set_count,
      get_count,
    };
  }

  // items
  let items = _.get(data, 'item', []);
  if (!newProfile.items[version]) {
    newProfile.items[version] = {};
  }

  if (!_.isArray(items)) {
    items = [items];
  }

  for (const item of items) {
    const type = $(item).number('type');
    const id = $(item).number('id');
    const param = $(item).number('param');

    const key = `${type}:${id}`;

    newProfile.items[version][key] = param;
  }

  // charas
  let charas = _.get(data, 'chara_param', []);
  if (!newProfile.charas[version]) {
    newProfile.charas[version] = {};
  }

  if (!_.isArray(charas)) {
    charas = [charas];
  }

  for (const chara of charas) {
    const id = $(chara).number('chara_id');
    const param = $(chara).number('friendship');

    newProfile.charas[version][id] = param;
  }

  await writeProfile(refid, newProfile);
  send.success();
};

export const start: EPR = async (req, data, send) => {
  const result = {
    play_id: K.ITEM('s32', 1),
    ...getInfo(req),
  };
  await send.object(result);
};

export const buy: EPR = async (req, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const type = $(data).number('type', -1);
  const id = $(data).number('id', -1);
  const param = $(data).number('param', 0);
  const version = getVersion(req);

  if (type < 0 || id < 0) {
    return send.deny();
  }

  const key = `${type}:${id}`;

  const profile = await readProfile(refid);
  if (!profile.items[version]) {
    profile.items[version] = {};
  }
  profile.items[version][key] = param;
  await writeProfile(refid, profile);
  send.success();
};

const defaultProfile:Profile = {
  collection: 'profile',

  name: 'ゲスト',

  stamps: {},
  medals: {},
  items: {},
  charas: {},

  extras: {},
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
  return score || { collection: 'scores', scores: {}}
}

async function writeScores(refid: string, scores: Scores) {
  await DB.Upsert<Scores>(refid, { collection: 'scores'}, scores)
}
