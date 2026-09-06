/// <reference lib="es2020.bigint" />

import { nowMs, readNumber, readString } from '../utils';
import { loadLocalMdb, MdbMusic } from '../mdb';

function mdbMusicResponse(music: MdbMusic): any {
  return {
    music_id: K.ITEM('s32', music.music_id),
    title_name: K.ITEM('str', music.title_name),
    title_yomigana: K.ITEM('str', music.title_yomigana),
    artist_name: K.ITEM('str', music.artist_name),
    artist_yomigana: K.ITEM('str', music.artist_yomigana),
    bpm_max: K.ITEM('s32', music.bpm_max),
    bpm_min: K.ITEM('s32', music.bpm_min),
    distribution_date: K.ITEM('str', music.distribution_date),
    release_code: K.ITEM('str', music.release_code),
    volume: K.ITEM('s32', music.volume),
    bg_no: K.ITEM('s32', music.bg_no),
    region: K.ITEM('s32', music.region),
    tags: {
      tag: music.tags.map(tag => K.ITEM('str', tag)),
    },
    limitation_type: K.ITEM('s32', music.limitation_type),
    license: K.ITEM('str', music.license),
    color1: K.ITEM('str', music.color1),
    color2: K.ITEM('str', music.color2),
    color3: K.ITEM('str', music.color3),
    has_mv: K.ITEM('bool', music.has_mv),
    demo_pri: K.ITEM('s32', music.demo_pri),
    fumens: {
      fumen: music.fumens.map(fumen => ({
        fumen_type: K.ITEM('str', fumen.fumen_type),
        level: K.ITEM('s32', fumen.level),
        playable: K.ITEM('s32', fumen.playable),
        has_official_dance: K.ITEM('s32', fumen.has_official_dance),
        backdancer_id: K.ITEM('s32', fumen.backdancer_id),
        price: K.ITEM('s32', fumen.price),
        limitation_type: K.ITEM('s32', fumen.limitation_type),
      })),
    },
    video_flags: {
      JP: K.ITEM('s32', music.video_flags.JP),
      US: K.ITEM('s32', music.video_flags.US),
    },
    motion_flags: {
      JP: K.ITEM('s32', music.motion_flags.JP),
      US: K.ITEM('s32', music.motion_flags.US),
    },
  };
}

export const getCommon: EPR = async (info, data, send) => {
  const catalog = U.GetConfig('unlock_all_songs') ? await loadLocalMdb() : null;
  return send.object(
    {
      mdb: {
        music: catalog ? catalog.musics.map(mdbMusicResponse) : [],
      },
      event: {},
    },
    { status: 0 }
  );
};

export const lockMultiLogin: EPR = async (info, data, send) => {
  return send.object(
    {
      result: K.ITEM('s32', 0),
    },
    { status: 0 }
  );
};

export const savePcbData: EPR = async (info, data, send) => {
  const reader = $(data);
  await DB.Upsert(
    { collection: 'pcb' } as any,
    {
      $set: {
        collection: 'pcb',
        model: info.model,
        locationId: readString(reader, 'pcbinfo.loc_id'),
        region: readNumber(reader, 'pcbinfo.region'),
        locationName: readString(reader, 'pcbinfo.locname'),
        customer: readString(reader, 'pcbinfo.customer'),
        company: readString(reader, 'pcbinfo.company'),
        systemId: readString(reader, 'pcbinfo.system_id'),
        hardwareId: readString(reader, 'pcbinfo.hardware_id'),
        licenseId: readString(reader, 'pcbinfo.license_id'),
        accountId: readString(reader, 'pcbinfo.account_id'),
        boot: readNumber(reader, 'pcbinfo.boot'),
        eacoinStatus: readNumber(reader, 'pcbinfo.eacoin_status'),
        updateProgress: readNumber(reader, 'pcbinfo.update_progress'),
        shopName: readString(reader, 'etc.network.shopname'),
        matchingGroup: readString(reader, 'etc.network.matching_group'),
        updatedAt: nowMs(),
      },
    } as any
  );

  return send.object(
    {
      next_request_interval_sec: K.ITEM('u64', BigInt(300)),
    },
    { status: 0 }
  );
};

export const saveLog: EPR = async (info, data, send) => {
  const reader = $(data);
  const items = reader.elements('logdata');
  await DB.Upsert(
    { collection: 'telemetry' } as any,
    {
      $set: {
        collection: 'telemetry',
        lastModel: info.model,
        lastDataKey: items.length
          ? readString(items[items.length - 1], 'data_key')
          : '',
        updatedAt: nowMs(),
      },
      $inc: { receivedLogBatches: 1, receivedLogItems: items.length },
    } as any
  );
  return send.success();
};
