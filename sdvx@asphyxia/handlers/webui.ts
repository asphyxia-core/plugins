import { Profile } from '../models/profile';
import { MusicRecord } from '../models/music_record';
import { Item } from '../models/item';
import { getVersion, IDToCode, GetCounter } from '../utils';
import { Mix } from '../models/mix';
import { fstat } from 'fs';
import { error } from 'console';
import { setMaxIdleHTTPParsers } from 'http';

export const updateProfile = async (data: {
  refid: string;
  name?: string;
  appeal?: string;
  akaname?: string;
  nemsys?: string;
  bgm?: string;
  subbg?: string;
  stampA?: string;
  stampB?: string;
  stampC?: string;
  stampD?: string;
  stampA_R?: string;
  stampB_R?: string;
  stampC_R?: string;
  stampD_R?: string;
  appeal_frame?: string;
  support_team?: string;
}) => {
  if (data.refid == null) return;

  const update: Update<Profile>['$set'] = {};

  if (data.name && data.name.length > 0) {
    const validName = data.name
      .toUpperCase()
      .replace(/[^ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#$&*\-\.\ ]/g, '')
      .slice(0, 8);
    if (validName.length > 0) update.name = validName;
  }

  if (data.appeal && data.appeal.length > 0) {
    const validAppeal = parseInt(data.appeal);
    if (!_.isNaN(validAppeal)) update.appeal = validAppeal;
  }

  if (data.akaname && data.akaname.length > 0) {
    const validAka = parseInt(data.akaname);
    if (!_.isNaN(validAka)) update.akaname = validAka;
  }

  if (data.appeal_frame && data.appeal_frame.length > 0) {
    const validAppealFrame = parseInt(data.appeal_frame);
    if (!_.isNaN(validAppealFrame)) update.appeal_frame = validAppealFrame;
  }

  if (data.support_team && data.support_team.length > 0) {
    const validSupportTeam = parseInt(data.support_team);
    if (!_.isNaN(validSupportTeam)) update.support_team = validSupportTeam;
  }

  if (data.nemsys && data.nemsys.length > 0) {
    const validNemsys = parseInt(data.nemsys);
    if (!_.isNaN(validNemsys)) update.nemsys = validNemsys;
  }

  if (data.subbg && data.subbg.length > 0) {
    const validSubbg = parseInt(data.subbg);
    if (!_.isNaN(validSubbg)) update.subbg = validSubbg;
  }

  if (data.bgm && data.bgm.length > 0) {
    const validBGM = parseInt(data.bgm);
    if (!_.isNaN(validBGM)) update.bgm = validBGM;
  }

  if (data.stampA && data.stampA.length > 0) {
    const validStampA = parseInt(data.stampA);
    if (!_.isNaN(validStampA)) update.stampA = validStampA;
  }

  if (data.stampB && data.stampB.length > 0) {
    const validStampB = parseInt(data.stampB);
    if (!_.isNaN(validStampB)) update.stampB = validStampB;
  }

  if (data.stampC && data.stampC.length > 0) {
    const validStampC = parseInt(data.stampC);
    if (!_.isNaN(validStampC)) update.stampC = validStampC;
  }

  if (data.stampD && data.stampD.length > 0) {
    const validStampD = parseInt(data.stampD);
    if (!_.isNaN(validStampD)) update.stampD = validStampD;
  }

  if (data.stampA_R && data.stampA_R.length > 0) {
    const validStampA_R = parseInt(data.stampA_R);
    if (!_.isNaN(validStampA_R)) update.stampA_R = validStampA_R;
  }

  if (data.stampB_R && data.stampB_R.length > 0) {
    const validStampB_R = parseInt(data.stampB_R);
    if (!_.isNaN(validStampB_R)) update.stampB_R = validStampB_R;
  }

  if (data.stampC_R && data.stampC_R.length > 0) {
    const validStampC_R = parseInt(data.stampC_R);
    if (!_.isNaN(validStampC_R)) update.stampC_R = validStampC_R;
  }

  if (data.stampD_R && data.stampD_R.length > 0) {
    const validStampD_R = parseInt(data.stampD_R);
    if (!_.isNaN(validStampD_R)) update.stampD_R = validStampD_R;
  }

  await DB.Update<Profile>(
    data.refid,
    { collection: 'profile' },
    { $set: update }
  );
};

export const updateMix = async (data: {
  code: string;
  name?: string;
  creator?: string;
}) => {
  const update: Update<Mix>['$set'] = {};

  if (data.name && data.name.length > 0) {
    if (data.name.length > 0) update.name = data.name;
  }

  if (data.creator && data.creator.length > 0) {
    // const validCreator = data.creator
    //   .toUpperCase()
    //   .replace(/[^ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#$&*\-\.\ ]/g, '')
    //   .slice(0, 8);
    if (data.creator.length > 0) update.creator = data.creator;
  }

  await DB.Update<Mix>(
    { collection: 'mix', code: data.code },
    { $set: update }
  );
};

export const importMix = async (data: { json: string }) => {
  if (data.json.startsWith('`')) {
    data.json = data.json.slice(1);
  }

  if (data.json.endsWith('`')) {
    data.json = data.json.slice(0, data.json.length - 1);
  }

  const mix: any[] = JSON.parse(data.json);

  let code = mix[0];
  while (await DB.FindOne<Mix>({ collection: 'mix', code })) {
    code = _.padStart(_.random(0, 999999999999).toString(), 12, '0');
  }

  const id = await GetCounter('mix');
  const musics = mix.slice(9);

  if (musics.length % 2 !== 0) return;

  const mdata = [];

  for (let i = 0; i < musics.length; i += 2) {
    mdata.push({
      grade: musics[i + 1],
      id: musics[i],
    });
  }

  await DB.Insert<Mix>({
    collection: 'mix',
    code,
    id,
    name: mix[1],
    creator: mix[2],
    param: `{ "dbVer" : "${mix[3]
      }", "gene" : { "params" : "{ \\"minorVer\\" : \\"${mix[4]
      }\\", \\"seed\\" : ${mix[5]} }", "ver" : "${mix[6]
      }" }, "musics" : ${JSON.stringify(mdata)}, "voxdj" : { "params" : "${mix[7]
      }", "ver" : "${mix[8]}" } }`,
    jacket: 0,
    tag: 1,
  });
};

export const deleteMix = async (data: { code: string }) => {
  await DB.Remove<Mix>({ collection: 'mix', code: data.code });
};

export const make_hexa_easier = async(data:{
  refid:string;
}) => {
  let all_hexa = await DB.Find<Item>(data.refid,  { collection: 'item' ,type:16 })
  let playedNum = [] // Prevent previous unlocked hexa from being locked again
  all_hexa.forEach((item:Item)=>{
    console.log(item.id)
    if(item.param == 10000){
      playedNum.push(item.id)
    }
  });

  for(let i = 1; i <= 50; i++){ // Hexa Diver 7, up to id = 50
    if(!playedNum.includes(i)){
      await DB.Upsert<Item>(
        data.refid,
        {collection:'item', id:i, type:16},
        {collection:'item', id:i, type:16, param:9000}
        )
    }
  }
}

export const import_assets = async (data: { path: string }, send: WebUISend) => {
  let path = data.path
  console.log(path)
  let fs = require('fs')
  if (!fs.existsSync(path + '/data/graphics/')) {
    console.log('Path does not exist.')
    send.error(400,'Path does not exist.')
    return 
  }


  await fs.promises.cp(path + "/data/graphics/ap_card", './webui/asset/ap_card', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path + "/data/graphics/chat_stamp", './webui/asset/chat_stamp', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path + "/data/graphics/game_nemsys", './webui/asset/nemsys', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path + "/data/graphics/submonitor_bg", './webui/asset/submonitor_bg', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  console.log('Assets imported.')
  send.json({status:"ok"})
};
