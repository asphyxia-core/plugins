import { Profile } from '../models/profile';
import { VersionData } from '../models/version_data';
import { SDVX_AUTOMATION_SONGS } from '../data/vvw';
import { CourseRecord } from '../models/course_record';
import { Item } from '../models/item';
import { Param } from '../models/param';
import { MusicRecord } from '../models/music_record';

function getVersion(info: EamuseInfo) {
  if (info.module == 'game_3') return 0;
  if (info.method.startsWith('sv4')) return 4;
  if (info.method.startsWith('sv5')) return 5;
  return 0;
}

export const loadScores: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const records = await DB.Find<MusicRecord>(refid, { collection: 'music' });

  send.object({
    music: {
      info: records.map(r => ({
        param: K.ARRAY('u32', [
          r.mid,
          r.type,
          r.score,
          r.clear,
          r.grade,
          0,
          0,
          r.buttonRate,
          r.longRate,
          r.volRate,
          0,
          0,
          0,
          0,
          0,
          0,
        ]),
      })),
    },
  });
};

export const saveScores: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const musicID = $(data).number('music_id');
  const musicType = $(data).number('music_type');

  if (musicID == null || musicType == null) return send.deny();

  const record = (await DB.FindOne<MusicRecord>(refid, {
    collection: 'music',
    mid: musicID,
    type: musicType,
  })) || {
    collection: 'music',
    mid: musicID,
    type: musicType,
    score: 0,
    clear: 0,
    grade: 0,
    buttonRate: 0,
    longRate: 0,
    volRate: 0,
  };

  const score = $(data).number('score', 0);
  if (score > record.score) {
    record.score = score;
    record.buttonRate = $(data).number('btn_rate', 0);
    record.longRate = $(data).number('long_rate', 0);
    record.volRate = $(data).number('vol_rate', 0);
  }

  record.clear = Math.max($(data).number('clear_type', 0), record.clear);
  record.grade = Math.max($(data).number('score_grade', 0), record.grade);

  await DB.Upsert<MusicRecord>(
    refid,
    {
      collection: 'music',
      mid: musicID,
      type: musicType,
    },
    record
  );

  send.success();
};

export const save: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const version = getVersion(info);
  if (version == 0) return send.deny();

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

  await DB.Upsert<VersionData>(
    {
      collection: 'version',
      version,
    },
    {
      $set: {
        skillBase: $(data).number('skill_base_id'),
        skillLevel: $(data).number('skill_level'),
        skillName: $(data).number('skill_name_id'),
      },
    }
  );

  send.success();
};

export const load: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const version = getVersion(info);
  if (version == 0) return send.deny();

  const profile = await DB.FindOne<Profile>(refid, {
    collection: 'profile',
  });

  if (!profile) {
    send.object({ result: K.ITEM('u8', 1) });
    return;
  }

  let versionData = await DB.FindOne<VersionData>(refid, {
    collection: 'version',
    version,
  });

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
  if (!refid) return send.deny();

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
