/// <reference lib="es2020.bigint" />

import {
  MusicScoreEntry,
  ProfileDocument,
  ScoreDocument,
  UnlockMusicEntry,
} from '../models';
import {
  avatarResponse,
  createProfile,
  dancerGradeResponse,
  mergeScore,
  mergeUnlocks,
  musicScoreKey,
  nowMs,
  nowS64,
  playInfoResponse,
  playOptionResponse,
  readAvatar,
  readDeltaGroup,
  readMusicScore,
  readMusicUnlockGauges,
  readNumber,
  readPlayInfo,
  readPlayOption,
  readString,
  readUnlocks,
  readViewFlags,
  stageResultResponse,
} from '../utils';
import { loadLocalMdb } from '../mdb';

async function findProfile(refid: string): Promise<ProfileDocument | null> {
  return (
    (await DB.FindOne<ProfileDocument>(refid, { collection: 'profile' })) ||
    null
  );
}

async function upsertProfile(
  refid: string,
  profile: ProfileDocument
): Promise<void> {
  profile.updatedAt = nowMs();
  await DB.Upsert<ProfileDocument>(
    refid,
    { collection: 'profile' },
    { $set: profile }
  );
}

async function effectiveUnlocks(
  profile: ProfileDocument
): Promise<UnlockMusicEntry[]> {
  if (!U.GetConfig('unlock_all_songs')) {
    return profile.unlockedMusics || [];
  }
  const catalog = await loadLocalMdb();
  return mergeUnlocks(
    profile.unlockedMusics || [],
    catalog ? catalog.unlocks : []
  );
}

function unlockMusicResponse(entries: UnlockMusicEntry[]): any {
  return {
    music: entries.map(entry =>
      K.ATTR(
        { music_id: `${entry.musicId}` },
        { fumen_type: entry.fumens.map(fumen => K.ITEM('str', fumen)) }
      )
    ),
  };
}

function profileResponse(
  profile: ProfileDocument,
  unlocks: UnlockMusicEntry[]
): any {
  return {
    result: K.ITEM('s32', 0),
    now_date: K.ITEM('s64', nowS64()),
    userid: {
      code: K.ITEM('s32', profile.userCode),
      dancer_id: K.ITEM('str', profile.dancerId),
    },
    profile: {
      name: K.ITEM('str', profile.name),
    },
    privacy: {
      publish_setting: K.ITEM('s32', profile.privacy.publishSetting),
    },
    dancer_grade: dancerGradeResponse(profile.dancerGrade),
    delta_group: {
      delta: (profile.deltaGroup || []).map(delta => ({
        name: K.ITEM('str', delta.name),
        income: K.ITEM('s32', delta.income),
        expense: K.ITEM('s32', delta.expense),
      })),
    },
    avatar: avatarResponse(profile.avatar),
    playoption: playOptionResponse(profile.playOption),
    playinfo: playInfoResponse(profile.playInfo),
    unlock_music: unlockMusicResponse(unlocks),
    follow_data: {
      follower_num: K.ITEM('s32', 0),
      data: [],
    },
    view_flags: {
      view_flag: (profile.viewFlags || []).map(entry => ({
        view_id: K.ITEM('str', entry.viewId),
        flag: K.ITEM('s32', entry.flag),
      })),
    },
    music_unlock_gauges: {
      music_unlock_gauge: (profile.musicUnlockGauges || []).map(entry => ({
        event_id: K.ITEM('str', entry.eventId),
        progress: K.ITEM('s32', entry.progress),
      })),
    },
  };
}

export const getPlayData: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(reader, 'userid.ref_id');
  if (!refid) {
    console.error('[Dance Around] get_playdata is missing userid.ref_id');
    return send.deny();
  }

  const profile = await findProfile(refid);
  if (!profile) {
    return send.object(
      {
        result: K.ITEM('s32', 1),
        now_date: K.ITEM('s64', nowS64()),
      },
      { status: 0 }
    );
  }

  await DB.Update<ProfileDocument>(
    refid,
    { collection: 'profile' },
    { $inc: { loginCount: 1 }, $set: { updatedAt: nowMs() } }
  );

  return send.object(
    profileResponse(profile, await effectiveUnlocks(profile)),
    { status: 0 }
  );
};

export const signup: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(reader, 'userid.ref_id');
  if (!refid) {
    console.error('[Dance Around] sign_up is missing userid.ref_id');
    return send.deny();
  }

  const name = readString(reader, 'profile.name', 'PLAYER');
  const dataId = readString(reader, 'userid.data_id');
  const cardNumber = readString(reader, 'userid.card_no');
  const existing = await findProfile(refid);
  const profile =
    existing || createProfile(refid, name, dataId, cardNumber, info.model);
  profile.name = name || profile.name;
  profile.dataId = dataId || profile.dataId;
  profile.cardNumber = cardNumber || profile.cardNumber;
  await upsertProfile(refid, profile);
  console.log(
    `[Dance Around] registered player ${profile.name} (${profile.dancerId})`
  );
  return send.success();
};

async function mergeScoreEntries(
  refid: string,
  incoming: MusicScoreEntry[]
): Promise<void> {
  if (!incoming.length) {
    return;
  }
  const document = (await DB.FindOne<ScoreDocument>(refid, {
    collection: 'scores',
  })) || {
    collection: 'scores' as const,
    schemaVersion: 1,
    entries: [],
    updatedAt: 0,
  };

  const scores: { [key: string]: MusicScoreEntry } = {};
  for (const entry of document.entries || []) {
    scores[musicScoreKey(entry)] = entry;
  }
  for (const entry of incoming) {
    if (entry.musicId <= 0) {
      continue;
    }
    const key = musicScoreKey(entry);
    scores[key] = mergeScore(scores[key], entry);
  }

  document.entries = Object.keys(scores)
    .map(key => scores[key])
    .sort(
      (a, b) => a.musicId - b.musicId || a.fumenType.localeCompare(b.fumenType)
    );
  document.updatedAt = nowMs();
  await DB.Upsert<ScoreDocument>(
    refid,
    { collection: 'scores' },
    { $set: document }
  );
}

export const savePlayData: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(
    reader,
    'data.userid.ref_id',
    readString(reader, 'userid.ref_id')
  );
  if (!refid) {
    console.error('[Dance Around] save_playdata is missing data.userid.ref_id');
    return send.deny();
  }

  const profile =
    (await findProfile(refid)) ||
    createProfile(refid, 'PLAYER', '', '', info.model);
  profile.privacy = {
    publishSetting: readNumber(
      reader,
      'data.privacy.publish_setting',
      profile.privacy.publishSetting
    ),
  };
  profile.dancerGrade = {
    grade: readNumber(
      reader,
      'data.dancer_grade.grade',
      profile.dancerGrade.grade
    ),
    gvGauge: readNumber(
      reader,
      'data.dancer_grade.gv_gauge',
      profile.dancerGrade.gvGauge
    ),
    achievedGv: readNumber(
      reader,
      'data.dancer_grade.achieve_gv',
      profile.dancerGrade.achievedGv
    ),
    receivedGv: 0,
    increaseGv: 0,
  };
  profile.avatar = readAvatar(reader, 'data.avatar');
  profile.playOption = readPlayOption(reader, 'data.playoption');
  profile.playInfo = readPlayInfo(reader, 'data.playinfo', info.model);
  profile.unlockedMusics = mergeUnlocks(
    profile.unlockedMusics || [],
    readUnlocks(reader, 'data.unlock_music.music')
  );
  profile.viewFlags = readViewFlags(reader, 'data.view_flags.view_flag');
  profile.musicUnlockGauges = readMusicUnlockGauges(
    reader,
    'data.music_unlock_gauges.music_unlock_gauge'
  );
  profile.deltaGroup = readDeltaGroup(reader, 'data.delta_group.delta');
  await upsertProfile(refid, profile);

  const stagedata = reader.elements('data.stagedata.data').map(readMusicScore);
  await mergeScoreEntries(refid, stagedata);
  console.log(
    `[Dance Around] saved profile ${profile.dancerId}; ${stagedata.length} stage result(s)`
  );
  return send.success();
};

export const saveMusicScore: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(
    reader,
    'data.userid.ref_id',
    readString(reader, 'userid.ref_id')
  );
  if (!refid) {
    console.error(
      '[Dance Around] save_musicscore is missing data.userid.ref_id'
    );
    return send.deny();
  }

  const scoreReader = reader.element('data');
  const score = readMusicScore(scoreReader);
  await mergeScoreEntries(refid, [score]);
  console.log(
    `[Dance Around] saved score ${score.musicId}/${score.fumenType}: ${score.score}`
  );
  return send.success();
};

export const getMusicScore: EPR = async (info, data, send) => {
  const refid = readString($(data), 'userid.ref_id');
  if (!refid) {
    console.error('[Dance Around] get_musicscore is missing userid.ref_id');
    return send.deny();
  }

  const document = await DB.FindOne<ScoreDocument>(refid, {
    collection: 'scores',
  });
  const entries = document ? document.entries || [] : [];
  return send.object(
    {
      scoredata: {
        music: entries.map(score => ({
          ...stageResultResponse(score),
          play_cnt: K.ITEM('s32', score.playCount),
          play_date: K.ITEM('s64', BigInt(score.playDate)),
          bestscore_date: K.ITEM('s64', BigInt(score.bestScoreDate)),
          pcb_id: K.ITEM('str', score.pcbId),
          loc_id: K.ITEM('str', score.locationId),
          shopname: K.ITEM('str', score.shopName),
          rec_cnt: K.ITEM('s32', score.recordCount),
          gv_score: K.ITEM('s32', score.gvScore),
        })),
      },
    },
    { status: 0 }
  );
};
