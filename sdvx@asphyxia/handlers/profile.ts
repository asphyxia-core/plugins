import { Profile } from '../models/profile';
import { VersionData } from '../models/version_data';

export const loadScores: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  const records = await DB.Find(refid, { collection: 'music' });

  send.pugFile('templates/load_m.pug', { records });
};

export const load: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');

  let version = 0;
  switch (info.method) {
    case 'sv4_load':
      version = 4;
      break;
    case 'sv5_load':
      version = 5;
      break;
  }

  const profile = await DB.FindOne(refid, { collection: 'profile' });
  let versionData: VersionData = await DB.FindOne(refid, {
    collection: 'version',
  });

  if (!versionData) {
    versionData = {
      collection: 'version',
      version,
      items: {},
      params: {},
      skill: {
        base: 0,
        level: 0,
        name: 0,
      },
    };
    await DB.Insert(refid, versionData);
  }

  if (!profile) {
    send.object({ result: K.ITEM('u8', 1) });
    return;
  }

  const courses = await DB.Find(refid, { collection: 'course' });

  send.pugFile('templates/load.pug', {
    courses,
    ...profile,
    ...versionData,
  });
};

export const create: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  const name = $(data).str('name', 'GUEST');

  const profile: Profile = {
    pluginVer: 1,

    collection: 'profile',
    name,
    appeal: 0,
    akaname: 0,
    currency: {
      blocks: 0,
      packets: 0,
    },
    settings: {
      arsOption: 0,
      drawAdjust: 0,
      earlyLateDisp: 0,
      effCLeft: 0,
      effCRight: 1,
      gaugeOption: 0,
      hiSpeed: 0,
      laneSpeed: 0,
      narrowDown: 0,
      notesOption: 0,
    },
    state: {
      blasterCount: 0,
      blasterEnergy: 0,
      headphone: 0,
      lastMusicID: 0,
      lastMusicType: 0,
      sortType: 0,
    },
  };

  await DB.Upsert(refid, { collection: 'profile' }, profile);
  send.object({ result: K.ITEM('u8', 0) });
};
