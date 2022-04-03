import { Profile } from '../models/profile';
import { MusicRecord } from '../models/music_record';
import { getVersion, IDToCode, GetCounter } from '../utils';
import { Mix } from '../models/mix';

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


