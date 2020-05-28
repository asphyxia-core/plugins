import { Profile } from '../models/profile';
import { VersionData } from '../models/version_data';
import { SDVX_AUTOMATION_SONGS } from '../data/vvw';
import { CourseRecord } from '../models/course_record';
import { Item } from '../models/item';
import { Param } from '../models/param';

export const loadScores: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  const records = await DB.Find(refid, { collection: 'music' });

  send.pugFile('templates/load_m.pug', { records });
};

export const save: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');

  await DB.Update<Profile>(
    refid,
    { collection: 'profile' },
    {
      $set: {
        appeal: $(data).number('appeal_id'),

        musicID: $(data).number('music_id'),
        musicType: $(data).number('music_type'),
        sortType: $(data).number('sort_type'),
        headphone: $(data).number('headphone'),
        blasterCount: $(data).number('blaster_count'),

        hiSpeed: $(data).number('hispeed'),
        laneSpeed: $(data).number('lanespeed'),
        gaugeOption: $(data).number('gauge_option'),
        arsOption: $(data).number('ars_option'),
        notesOption: $(data).number('notes_option'),
        earlyLateDisp: $(data).number('early_late_disp'),
        drawAdjust: $(data).number('draw_adjust'),
        effCLeft: $(data).number('eff_c_left'),
        effCRight: $(data).number('eff_c_right'),
        narrowDown: $(data).number('narrow_down'),
      },
      $inc: {
        packets: $(data).number('earned_gamecoin_packet'),
        blocks: $(data).number('earned_gamecoin_block'),
        blasterEnergy: $(data).number('earned_blaster_energy'),
      },
    }
  );

  send.success();
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

  const profile = await DB.FindOne<Profile>(refid, {
    collection: 'profile',
  });

  if (!profile) {
    send.object({ result: K.ITEM('u8', 1) });
    return;
  }

  let versionData = await DB.FindOne<VersionData>(refid, {
    collection: 'version',
  });

  if (!versionData) {
    versionData = {
      collection: 'version',
      version,
      skillBase: 0,
      skillLevel: 0,
      skillName: 0,
    };
    await DB.Insert(refid, versionData);
  }

  const courses = await DB.Find<CourseRecord>(refid, { collection: 'course' });
  const items = await DB.Find<Item>(refid, { collection: 'item' });
  const params = await DB.Find<Param>(refid, { collection: 'param' });

  send.pugFile('templates/load.pug', {
    courses,
    items,
    params,
    mixes: version == 5 ? SDVX_AUTOMATION_SONGS : [],
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
    blocks: 0,
    packets: 0,
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
    blasterCount: 0,
    blasterEnergy: 0,
    headphone: 0,
    musicID: 0,
    musicType: 0,
    sortType: 0,
  };

  await DB.Upsert(refid, { collection: 'profile' }, profile);
  send.object({ result: K.ITEM('u8', 0) });
};
