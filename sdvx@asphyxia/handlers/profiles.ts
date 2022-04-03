import { Skill } from '../models/skill';
import { SDVX_AUTOMATION_SONGS } from '../data/vvw';
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
  return await DB.Find<Mix>({ collection: 'mix', id: { $in: mixids } });
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


  //console.log(version);
  if (version === 1) {
    return send.object({
      music: records.map(r => (K.ATTR({ music_id: String(r.mid) }, {
        type: (() => {
          const records = [];

          for (let i = 1; i <= 3; i++) {
            if (r.type != i) continue;
            records.push(K.ATTR({
              type_id: String(i),
              score: String(r.score),
              clear_type: String(r.clear),
              score_grade: String(r.grade),
              cnt: "0"
            }));
          }

          return records;
        })()
      })))
    });
  }

  if (version === 2) {
    let temp = Array.from(records.values()).filter(r => (r.mid <= 554));
    //console.log([...temp]);
    //return send.pugFile('templates/infiniteinfection/score.pug', {
    //      temp});
    return send.object(
      {
        "new": {
          music: temp.map(r => ({
            music_id: K.ITEM('u32', r.mid),
            music_type: K.ITEM('u32', r.type),
            score: K.ITEM('u32', r.score),
            cnt: K.ITEM('u32', 1),
            clear_type: K.ITEM('u32', r.clear),
            score_grade: K.ITEM('u32', r.grade),
            btn_rate: K.ITEM('u32', r.buttonRate),
            long_rate: K.ITEM('u32', r.longRate),
            vol_rate: K.ITEM('u32', r.volRate),
          }))
        }, old: {}
      }, { rootName: "game" });
  }

  if (version === 6) {
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
            0,
            0,
            0,
            0,
          ]),
        })),
      },
    });
  }

  if (version === 4 || version === 3) {
    let temp = Array.from(records.values()).filter(r => (r.mid <= 1368));


    return send.object({
      music: {
        info: temp.map(r => ({
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
        })
        ),
      },
    });
  }


  return send.object({
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

export const saveScore: EPR = async (info, data, send) => {
  const refid = $(data).str('refid', $(data).attr().dataid);
  if (!refid) return send.deny();

  const version = getVersion(info);

  // Booth - Save score
  if (version === 1) {
    try {
      const mid = parseInt($(data).attr().music_id);
      const type = parseInt($(data).attr().music_type);

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
        clear: 0,
        grade: 0,
        buttonRate: 0,
        longRate: 0,
        volRate: 0,
      };

      const score = $(data).attr().score ? parseInt($(data).attr().score) : 0;
      const clear = $(data).attr().clear_type ? parseInt($(data).attr().clear_type) : 0;
      const grade = $(data).attr().score_grade ? parseInt($(data).attr().score_grade) : 0;
      if (score > record.score) {
        record.score = score;
      }

      record.clear = Math.max(clear, record.clear);
      record.grade = Math.max(grade, record.grade);

      await DB.Upsert<MusicRecord>(
        refid,
        { collection: 'music', mid, type },
        record
      );

      return send.success();
    } catch {
      return send.deny();
    }
  }


  if (version === -6) { // Using alternate scoring system after 20210831
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
  }



  const mid = $(data).number('music_id');
  const type = $(data).number('music_type');
  console.log("Saving score for version later than HH(include), ID:" + mid + " type:" + type);
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

  const score = $(data).number('score', 0);
  const exscore = $(data).number('exscore', 0);
  if (score > record.score) {
    record.score = score;
    record.buttonRate = $(data).number('btn_rate', 0);
    record.longRate = $(data).number('long_rate', 0);
    record.volRate = $(data).number('vol_rate', 0);
  }
  if (exscore > record.exscore) {
    record.exscore = exscore;
  }

  record.clear = Math.max($(data).number('clear_type', 0), record.clear);
  record.grade = Math.max($(data).number('score_grade', 0), record.grade);



  await DB.Upsert<MusicRecord>(
    refid,
    { collection: 'music', mid, type },
    record
  );

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

  if (version === 1) {
    try {
      // Save Profile
      await DB.Update<Profile>(
        refid,
        { collection: 'profile' },
        {
          $set: {
            headphone: $(data).number('headphone'),
            hiSpeed: $(data).number('hispeed'),
            appeal: $(data).number('appeal_id'),
            boothFrame: [$(data).number('frame0'), $(data).number('frame1'), $(data).number('frame2'), $(data).number('frame3'), $(data).number('frame4')],
            musicID: parseInt($(data).attr("last").music_id),
            musicType: parseInt($(data).attr("last").music_type),
            sortType: parseInt($(data).attr("last").sort_type),
            mUserCnt: $(data).number('m_user_cnt'),
          },
          $inc: {
            expPoint: $(data).number('gain_exp'),
            packets: $(data).number('earned_gamecoin_packet'),
            blocks: $(data).number('earned_gamecoin_block'),
          },
        }
      );

      return send.success();
    } catch {
      return send.deny();
    }
  }

  // Save Profile
  if (version === 6) {
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
  }
  if (version === 5 || version === 4) {
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
  }
  
  // New course saving function found in sdvx 20220214
  const course = $(data).element('course');
  if(!_.isNil(course)){
      const sid = course.number('ssnid');
      const cid = course.number('crsid');

      if (!(_.isNil(sid) || _.isNil(cid))){
        await DB.Upsert<CourseRecord>(
          refid,
          { collection: 'course', sid, cid, version },
          {
            $max: {
              score: course.number('sc', 0),
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
  })) || { base: 0, name: 0, level: 0 };

  const courses = await DB.Find<CourseRecord>(refid, { collection: 'course', version });
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

  if (version === 1) {
    return send.pugFile('templates/booth/load.pug', { code: IDToCode(profile.id), ...profile });
  }

  if (version === 2) {
    let tempItem = U.GetConfig('unlock_all_appeal_cards') ? unlockAppealCards(items) : items
    tempItem = Array.from(tempItem.values()).filter(r => (r.id <= 220));
    return send.pugFile('templates/infiniteinfection/load.pug', {
      courses,
      tempItem,
      params,
      skill,
      ...profile
    });
  }
  const bgm = profile.bgm ? profile.bgm : 0;
  const subbg = profile.subbg ? profile.subbg : 0;
  const nemsys = profile.nemsys ? profile.nemsys : 0;
  const stampA = profile.stampA ? profile.stampA : 0;
  const stampB = profile.stampB ? profile.stampB : 0;
  const stampC = profile.stampC ? profile.stampC : 0;
  const stampD = profile.stampD ? profile.stampD : 0;


  const customize = [];
  customize.push(bgm, subbg, nemsys, stampA, stampB, stampC, stampD);


  var tempCustom = params.findIndex((e) => (e.type == 2 && e.id == 2))

  if (tempCustom == -1) {
    const tempParam: Param = { collection: 'param', type: 2, id: 2, param: [] };
    params.push(tempParam);
    tempCustom = params.findIndex((e) => (e.type == 2 && e.id == 2))
  }

  if (params[tempCustom]) {
    params[tempCustom].param = customize;
  }


  let blasterpass = U.GetConfig('use_blasterpass') ? 1 : 0;

  var tempItem = U.GetConfig('unlock_all_navigators') ? unlockNavigators(items) : items;
  tempItem = U.GetConfig('unlock_all_appeal_cards') ? unlockAppealCards(items) : items;

  // Make generator power always 100%,
  for (let i = 0; i < 50; i++) {
    const tempGene: Item = { collection: 'item', type: 7, id: i, param: 10 };
    tempItem.push(tempGene);
  }
  return send.pugFile('templates/load.pug', {
    courses,
    items: tempItem,
    params,
    skill,
    currentTime,
    mixes,
    version,
    blasterpass,
    automation: version == 5 ? SDVX_AUTOMATION_SONGS : [],
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
  var genesisCardsArray = [];
  var generatorArray = [];
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
  }), { status: "0" };
}
