/// <reference lib="es2020.bigint" />

declare const Buffer: any;

import { MotionDocument, MotionEntry, ProfileDocument } from '../models';
import {
  avatarResponse,
  createProfile,
  dancerGradeResponse,
  makeUuid,
  motionInfoResponse,
  nowMs,
  readAvatar,
  readNumber,
  readStageResult,
  readString,
} from '../utils';

function readMotionIds(reader: KDataReader): string[] {
  const values = reader
    .elements('motion_id_list.motion_id')
    .map(item => readString(item, ''));
  for (const dataItem of reader.elements('data_item')) {
    values.push(
      ...dataItem
        .elements('motion_id_list.motion_id')
        .map(item => readString(item, ''))
    );
  }
  return values.filter(
    (value, index) => !!value && values.indexOf(value) === index
  );
}

async function findProfile(refid: string): Promise<ProfileDocument> {
  return (
    (await DB.FindOne<ProfileDocument>(refid, { collection: 'profile' })) ||
    createProfile(refid, 'PLAYER')
  );
}

export const saveMotionData: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(reader, 'userid.ref_id');
  if (!refid) {
    console.error('[Dance Around] save_motiondata is missing userid.ref_id');
    return send.deny();
  }

  const motionReader = reader.element('motiondata');
  const full = motionReader.buffer('motion_full', Buffer.alloc(0));
  const preview = motionReader.buffer('motion_prev', Buffer.alloc(0));
  const entry: MotionEntry = {
    motionId: makeUuid(),
    active: true,
    publishSetting: readNumber(motionReader, 'publish_setting'),
    playCount: 1,
    totalGv: 0,
    playResult: readStageResult(motionReader),
    playDate: readNumber(motionReader, 'play_date', nowMs()),
    locationId: readString(motionReader, 'loc_id'),
    shopName: readString(motionReader, 'shopname'),
    avatar: readAvatar(motionReader, 'avatar'),
    motionFullBase64: full.toString('base64'),
    motionPreviewBase64: preview.toString('base64'),
    createdAt: nowMs(),
  };

  const configuredLimit = Number(U.GetConfig('motion_history_limit'));
  const historyLimit = Number.isFinite(configuredLimit)
    ? Math.max(0, Math.min(100, Math.floor(configuredLimit)))
    : 20;
  if (historyLimit > 0) {
    const document = (await DB.FindOne<MotionDocument>(refid, {
      collection: 'motions',
    })) || {
      collection: 'motions' as const,
      schemaVersion: 1,
      entries: [],
      updatedAt: 0,
    };
    document.entries = [entry, ...(document.entries || [])].slice(
      0,
      historyLimit
    );
    document.updatedAt = nowMs();
    await DB.Upsert<MotionDocument>(
      refid,
      { collection: 'motions' },
      { $set: document }
    );
  }

  console.log(
    `[Dance Around] accepted motion ${entry.motionId} (${full.length}/${preview.length} bytes)`
  );
  return send.object(
    {
      motion_id: K.ITEM('str', entry.motionId),
    },
    { status: 0 }
  );
};

export const getMotionInfoList: EPR = async (info, data, send) => {
  const reader = $(data);
  const refid = readString(reader, 'userid.ref_id');
  if (!refid) {
    console.error('[Dance Around] get_motioninfolist is missing userid.ref_id');
    return send.deny();
  }

  const document = await DB.FindOne<MotionDocument>(refid, {
    collection: 'motions',
  });
  const entries = document ? document.entries || [] : [];
  return send.object(
    {
      data: entries.map(motionInfoResponse),
    },
    { status: 0 }
  );
};

export const checkPlayableMotionData: EPR = async (info, data, send) => {
  const reader = $(data);
  const requested = readMotionIds(reader);
  const refid = readString(reader, 'ref_id');
  const document = refid
    ? await DB.FindOne<MotionDocument>(refid, { collection: 'motions' })
    : null;
  const available = new Set(
    (document ? document.entries || [] : []).map(entry => entry.motionId)
  );
  return send.object(
    {
      data: requested.map(motionId => ({
        motion_id: K.ITEM('str', motionId),
        is_playable: K.ITEM('bool', available.has(motionId)),
      })),
    },
    { status: 0 }
  );
};

interface LocatedMotion {
  refid: string;
  entry: MotionEntry;
  profile: ProfileDocument;
}

async function locateMotions(motionIds: string[]): Promise<LocatedMotion[]> {
  if (!motionIds.length) {
    return [];
  }
  const wanted = new Set(motionIds);
  const result: LocatedMotion[] = [];
  const documents = await DB.Find<MotionDocument>(null, {
    collection: 'motions',
  });
  for (const document of documents) {
    const refid = (document as any).__refid as string;
    if (!refid) {
      continue;
    }
    const profile = await findProfile(refid);
    for (const entry of document.entries || []) {
      if (wanted.has(entry.motionId)) {
        result.push({ refid, entry, profile });
      }
    }
  }
  return result;
}

export const getMotionData: EPR = async (info, data, send) => {
  const requested = readMotionIds($(data));
  const located = await locateMotions(requested);
  return send.object(
    {
      data: located.map(item => ({
        info: motionInfoResponse(item.entry),
        userid: {
          dancer_id: K.ITEM('str', item.profile.dancerId),
        },
        profile: {
          name: K.ITEM('str', item.profile.name),
        },
        privacy: {
          publish_setting: K.ITEM('s32', item.profile.privacy.publishSetting),
        },
        dancer_grade: dancerGradeResponse(item.profile.dancerGrade),
        avatar: avatarResponse(item.entry.avatar),
        motiondata: {
          motion_full: K.ITEM(
            'bin',
            Buffer.from(item.entry.motionFullBase64, 'base64')
          ),
          motion_prev: K.ITEM(
            'bin',
            Buffer.from(item.entry.motionPreviewBase64, 'base64')
          ),
        },
      })),
    },
    { status: 0 }
  );
};
