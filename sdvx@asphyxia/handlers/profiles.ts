import { Skill } from '../models/skill';
import { Item } from '../models/item';
import { Param } from '../models/param';
import { MusicRecord } from '../models/music_record';
import { CourseRecord } from '../models/course_record';
import { Profile } from '../models/profile';
import { getVersion, IDToCode } from '../utils';
import { Mix } from '../models/mix';

async function getAutomationMixes(params: Param[]) {
  const mixids = params
    .filter(p => p.id == 3)
    .reduce((res, p) => _.union(res, p.param), []);
  return DB.Find<Mix>({ collection: 'mix', id: { $in: mixids } });
}

function unlockNavigators(items: Partial<Item>[]) {
  for (let i = 0; i < 300; ++i) items.push({ type: 11, id: i, param: 15 });
  console.log("Unlocking Navigators");
  // 10 genesis card for MITSURU's voice
  items.push({ type: 4, id: 599, param: 10 });
  return items;
}

function unlockAppealCards(items: Partial<Item>[]) {
  for (let i = 0; i < 6000; ++i) items.push({ type: 1, id: i, param: 1 });
  console.log("Unlocking Appeal Cards");

  return items;
}

export const loadScore: EPR = async (info, data, send) => {
  console.log("Now loading score");
  const version = Math.abs(getVersion(info));
  console.log("Got version:" + version);
  let refid = $(data).str('refid', $(data).attr().dataid);
  if (version === 2) refid = $(data).str('dataid', '0');
  //console.log('loading score');
  console.log("DataID:" + refid);
  if (!refid) return send.deny();
  console.log('Finding record');
  const records = await DB.Find<MusicRecord>(refid, { collection: 'music' });


  return send.object({
    music: {
      info: records.map(r => ({
        param: K.ARRAY('u32', [
          r.mid,
          r.type,
          r.score,
          r.exscore,
          r.clear,
          r.grade,
          0, // max chain
          0,
          r.buttonRate,
          r.longRate,
          r.volRate,
          0,
          0,
          0,
          0,
          0,
          0, // last update time
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

export const saveScore: EPR = async (info, data, send) => {
  const refid = $(data).str('refid', $(data).attr().dataid);
  if (!refid) return send.deny();

  const tracks = $(data).elements('track');
  for (const i of tracks) {
    const mid = i.number('music_id');
    const type = i.number('music_type');
    if (_.isNil(mid) || _.isNil(type)) return send.deny();

    const record = (await DB.FindOne<MusicRecord>(refid, {
      collection: 'music',
      mid,
      type,
    })) || {
      collection: 'music',
      mid,
      type,
      score: 0,
      exscore: 0,
      clear: 0,
      grade: 0,
      buttonRate: 0,
      longRate: 0,
      volRate: 0,
    };

    const score = i.number('score', 0);
    const exscore = i.number('exscore', 0);
    if (score > record.score) {
      record.score = score;
      record.buttonRate = i.number('btn_rate', 0);
      record.longRate = i.number('long_rate', 0);
      record.volRate = i.number('vol_rate', 0);
    }
    if (exscore > record.exscore) {
      record.exscore = exscore;
    }

    record.clear = Math.max(i.number('clear_type', 0), record.clear);
    record.grade = Math.max(i.number('score_grade', 0), record.grade);



    await DB.Upsert<MusicRecord>(
      refid,
      { collection: 'music', mid, type },
      record
    );
  }
  return send.success();
};

export const saveCourse: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const version = Math.abs(getVersion(info));
  if (version == 0) return send.deny();

  const sid = $(data).number('ssnid');
  const cid = $(data).number('crsid');

  if (_.isNil(sid) || _.isNil(cid)) return send.deny();

  await DB.Upsert<CourseRecord>(
    refid,
    { collection: 'course', sid, cid, version },
    {
      $max: {
        score: $(data).number('sc', 0),
        clear: $(data).number('ct', 0),
        grade: $(data).number('gr', 0),
        rate: $(data).number('ar', 0),
      },
      $inc: {
        count: 1,
      },
    }
  );

  return send.success();
};

export const save: EPR = async (info, data, send) => {
  const refid = $(data).str('refid', $(data).attr().refid);
  if (!refid) return send.deny();

  const version = Math.abs(getVersion(info));
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
        extrackEnergy: $(data).number('earned_extrack_energy'),
      },
    }
  );
  
  
  // New course saving function found in sdvx 20220214
  const course = $(data).element('course');
  if(!_.isNil(course)){
      const sid = course.number('ssnid');
      const cid = course.number('crsid');
      const skill_type = course.number('st');
      if (!(_.isNil(sid) || _.isNil(cid))){
        await DB.Upsert<CourseRecord>(
          refid,
          { collection: 'course', sid, cid, version, skill_type },
          {
            $max: {
              score: course.number('sc', 0),
              exscore: course.number('ex', 0),
              clear: course.number('ct', 0),
              grade: course.number('gr', 0),
              rate: course.number('ar', 0),
            },
            $inc: {
              count: 1,
            },
          }
        );
      }
  }
  
  // Save Items
  const items = $(data).elements('item.info');

  for (const i of items) {
    const type = i.number('type');
    const id = i.number('id');
    const param = i.number('param');

    if (_.isNil(type) || _.isNil(id) || _.isNil(param)) continue;

    await DB.Upsert<Item>(
      refid,
      { collection: 'item', type, id },
      { $set: { param } }
    );
  }

  // Save Param
  const params = $(data).elements('param.info');
  for (const p of params) {
    const type = p.number('type');
    const id = p.number('id');
    const param = p.numbers('param');

    if (_.isNil(type) || _.isNil(id) || _.isNil(param)) continue;

    await DB.Upsert<Param>(
      refid,
      { collection: 'param', type, id },
      { $set: { param } }
    );
  }

  // Save version specific data
  await DB.Upsert<Skill>(
    refid,
    {
      collection: 'skill',
      version,
    },
    {
      $set: {
        base: $(data).number('skill_base_id'),
        level: $(data).number('skill_level'),
        name: $(data).number('skill_name_id'),
        stype: $(data).number('skill_type')
      },
    }
  );

  return send.success();
};

export const load: EPR = async (info, data, send) => {
  console.log("Loading savedata");
  const refid = $(data).str('refid', $(data).attr().dataid);
  if (!refid) return send.deny();

  const version = Math.abs(getVersion(info));
  console.log("Got version" + version);
  console.log("DataID" + refid);
  if (version == 0) return send.deny();

  const profile = await DB.FindOne<Profile>(refid, {
    collection: 'profile',
  });

  if (!profile) {
    if (version === 1) return send.object(K.ATTR({ none: "1" }));
    return send.object({ result: K.ITEM('u8', 1) });
  }

  let skill = (await DB.FindOne<Skill>(refid, {
    collection: 'skill',
    version,
  })) || { base: 0, name: 0, level: 0, stype:0 };

  skill.stype = skill.stype ?? 0;


  const courses = await DB.Find<CourseRecord>(refid, { collection: 'course', version });

  for(const c of courses){
    c.skill_type = c.skill_type ?? 0;
    c.exscore = c.exscore ?? 0;
  }


  const items = await DB.Find<Item>(refid, { collection: 'item' });
  const params = await DB.Find<Param>(refid, { collection: 'param' });
  let time = new Date();
  let tempHour = time.getHours();
  let tempDate = time.getDate();
  tempHour += 12;
  tempDate += 1;
  time.setDate(tempDate);
  time.setHours(tempHour);
  const currentTime = time.getTime();
  const mixes = version == 5 ? await getAutomationMixes(params) : [];
  if (!profile.extrackEnergy) {
    profile.extrackEnergy = 0;
  }

  const bgm = profile.bgm ? profile.bgm : 0;
  const subbg = profile.subbg ? profile.subbg : 0;
  const nemsys = profile.nemsys ? profile.nemsys : 0;
  const stampA = profile.stampA ? profile.stampA : 0;
  const stampB = profile.stampB ? profile.stampB : 0;
  const stampC = profile.stampC ? profile.stampC : 0;
  const stampD = profile.stampD ? profile.stampD : 0;
  const stampA_R = profile.stampA_R ? profile.stampA_R : 0;
  const stampB_R = profile.stampB_R ? profile.stampB_R : 0;
  const stampC_R = profile.stampC_R ? profile.stampC_R : 0;
  const stampD_R = profile.stampD_R ? profile.stampD_R : 0;
  const mainbg = profile.mainbg ? profile.mainbg : 0;

  const customize = [];
  customize.push(bgm, subbg, nemsys, stampA, stampB, stampC, stampD, stampA_R, stampB_R, stampC_R, stampD_R, mainbg);


  let tempCustom = params.findIndex((e) => (e.type == 2 && e.id == 2))

  if (tempCustom == -1) {
    const tempParam: Param = { collection: 'param', type: 2, id: 2, param: [] };
    params.push(tempParam);
    tempCustom = params.findIndex((e) => (e.type == 2 && e.id == 2))
  }

  if (params[tempCustom]) {
    params[tempCustom].param = customize;
  }


  let blasterpass = U.GetConfig('use_blasterpass') ? 1 : 0;

  let tempItem = U.GetConfig('unlock_all_navigators') ? unlockNavigators(items) : items;
  tempItem = U.GetConfig('unlock_all_appeal_cards') ? unlockAppealCards(tempItem) : tempItem;

  // Make generator power always 100%,
  for (let i = 0; i < 50; i++) {
    const tempGene: Item = { collection: 'item', type: 7, id: i, param: 10 };
    tempItem.push(tempGene);
  }
  profile.appeal_frame = profile.appeal_frame ? profile.appeal_frame : 0;
  profile.support_team = profile.support_team ? profile.support_team : 0;


  return send.pugFile('templates/load.pug', {
    courses,
    items: tempItem,
    params,
    skill,
    currentTime,
    mixes,
    version,
    blasterpass,
    automation: [],
    code: IDToCode(profile.id),
    ...profile,
  });
};

export const create: EPR = async (info, data, send) => {
  console.log("Creating profile");
  const refid = $(data).str('refid', $(data).attr().refid);
  if (!refid) return send.deny();
  console.log("DataID" + refid);
  const name = $(data).str('name', $(data).attr().name ? $(data).attr().name : 'GUEST');
  let id = _.random(0, 99999999);
  while (await DB.FindOne<Profile>(null, { collecttion: 'profile', id })) {
    id = _.random(0, 99999999);
  }

  const profile: Profile = {
    pluginVer: 1,

    collection: 'profile',
    id,
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
    extrackEnergy: 0,
    bgm: 0,
    subbg: 0,
    nemsys: 0,
    stampA: 0,
    stampB: 0,
    stampC: 0,
    stampD: 0,
	  stampA_R: 0,
    stampB_R: 0,
    stampC_R: 0,
    stampD_R: 0,
    mainbg: 0,
    appeal_frame: 0,
    support_team: 0,

    headphone: 0,
    musicID: 0,
    musicType: 0,
    sortType: 0,
    expPoint: 0,
    mUserCnt: 0,
    boothFrame: [0, 0, 0, 0, 0]
  };

  await DB.Upsert(refid, { collection: 'profile' }, profile);
  return send.object({ result: K.ITEM('u8', 0) });
};

export const buy: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const growth = {
    blocks: $(data).number('earned_gamecoin_block', 0),
    packets: $(data).number('earned_gamecoin_packet', 0),
  };

  const currency = $(data).bool('currency_type') ? 'blocks' : 'packets';

  const cost = _.sum($(data).numbers('item.price', []));
  const balanceChange = growth[currency] - cost;

  const updated = await DB.Update<Profile>(
    refid,
    { collection: 'profile', [currency]: { $gte: -balanceChange } },
    { $inc: { [currency]: balanceChange } }
  );

  if (updated.updated) {
    const items = _.zipWith(
      $(data).numbers('item.item_type', []),
      $(data).numbers('item.item_id', []),
      $(data).numbers('item.param', []),
      (type, id, param) => ({ type, id, param })
    );

    for (const item of items) {
      await DB.Upsert<Item>(
        refid,
        { collection: 'item', type: item.type, id: item.id },
        { $set: { param: item.param } }
      );
    }

    return send.object({
      gamecoin_packet: K.ITEM('u32', updated.docs[0].packets),
      gamecoin_block: K.ITEM('u32', updated.docs[0].blocks),
    });
  } else {
    return send.success();
  }
};

export const print: EPR = async (info, data, send) => {
  const genesisCards = $(data).elements('genesis_card');
  let generatorArray = [];
  for (const g of genesisCards) {
    let tempGeneratorID = g.number('generator_id');
    let exist = generatorArray.findIndex((e) => (e == tempGeneratorID));
    if (exist == -1) {
      generatorArray.push(tempGeneratorID);
    }
  }
  send.object({
    result: K.ITEM('s8', 0),
    genesis_cards: genesisCards.map(r => ({
      index: K.ITEM('s32', r.number('index')),
      print_id: K.ITEM('s32', r.number('print_id'))
    })),
    after_power: generatorArray.map(r => ({
      generator_id: K.ITEM('s32', r),
      param: K.ITEM('s32', 10),
    }))
  });
}
