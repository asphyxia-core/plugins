import { Profile } from '../models/profile';
import { MusicRecord } from '../models/music_record';
import { Item } from '../models/item';
import { getVersion, IDToCode, GetCounter } from '../utils';
import { Mix } from '../models/mix';
import { fstat } from 'fs';
import { error } from 'console';
import { unpackS3P } from '../s3p';
import { music_db } from '..';
import { zipFolderToFile } from '../utils/zip';

const joinUnder = (basePath: string, childPath: string) => {
  const path = require('path');
  const sanitizedChild = (childPath ?? '').replace(/^[/\\]+/, '');
  return path.join(basePath, sanitizedChild);
};

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
  mainbg?: string;
  appeal_frame?: string;
  support_team?: string;
  use_pro_team?: string;
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

  if (data.mainbg && data.mainbg.length > 0) {
    const validMainbg = parseInt(data.mainbg);
    if (!_.isNaN(validMainbg)) update.mainbg = validMainbg;
  }

  console.log(data.use_pro_team);

  if (data.use_pro_team !== undefined && data.use_pro_team == "on") {
    const validUseProTeam = true;
    update.use_pro_team = validUseProTeam;
  } else {
    const validUseProTeam = false;
    update.use_pro_team = validUseProTeam;
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
}, send: WebUISend) => {
  let all_hexa = await DB.Find<Item>(data.refid,  { collection: 'item' ,type:16 })
  let playedNum = [] // Prevent previous unlocked hexa from being locked again
  all_hexa.forEach((item:Item)=>{
    console.log(item.id)
    if(item.param == 10000){
      playedNum.push(item.id)
    }
  });

  for(let i = 1; i <= 71; i++){ // Hexa Diver 7, up to id = 50
    if(!playedNum.includes(i)){
      await DB.Upsert<Item>(
        data.refid,
        {collection:'item', id:i, type:16},
        {collection:'item', id:i, type:16, param:9000}
        )
    }
  }

  send.json({status:"ok"})
}

export const converted_received = async (data: { zip_file:any }, send: WebUISend) => {

}


export const import_assets = async (data: { path: string }, send: WebUISend) => {
  
  // await init(wasmUrl);
  // let ffmpeg = await Wasmer.fromRegistry("wasmer/ffmpeg");
  const sdvxInstallPath = data.path;
  console.log(sdvxInstallPath)
  let fs = require('fs')
  const path = require('path')

  const graphicsDir = path.join(sdvxInstallPath, 'data', 'graphics');
  if (!fs.existsSync(graphicsDir)) {
    console.log('Path for Graphics does not exist.')
    send.error(400,'Path for Graphics does not exist.')
    return 
  }

  await fs.promises.cp(path.join(graphicsDir, 'ap_card'), './plugins/sdvx@asphyxia/webui/asset/ap_card', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path.join(graphicsDir, 'chat_stamp'), './plugins/sdvx@asphyxia/webui/asset/chat_stamp', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path.join(graphicsDir, 'game_nemsys'), './plugins/sdvx@asphyxia/webui/asset/nemsys', {recursive: true}).catch((err: any) => {
    console.log(err)
  })
  await fs.promises.cp(path.join(graphicsDir, 'submonitor_bg'), './plugins/sdvx@asphyxia/webui/asset/submonitor_bg', {recursive: true}).catch((err: any) => {
    console.log(err)
  })

  const soundDir = path.join(sdvxInstallPath, 'data', 'sound');
  if (!fs.existsSync(soundDir)) {
    console.log('Path for sound does not exist.')
    send.error(400,'Path for sound does not exist.')
    return 
  }

  const customSoundDir = path.join(soundDir, 'custom');
  const files = await fs.promises.readdir(customSoundDir)
  console.log(files)

  for (const file of files) {
    if (file.endsWith('.s3p')) {
      fs.mkdirSync('./plugins/sdvx@asphyxia/webui/asset/temp/' + file, { recursive: true });
      // fs.mkdirSync('./plugins/sdvx@asphyxia/webui/asset/audio/'+file.substring(0, 9), { recursive: true });
      unpackS3P('./plugins/sdvx@asphyxia/webui/asset/temp/' + file, path.join(customSoundDir, file), {})
        // fs.promises.readFileSync('./plugins/sdvx@asphyxia/webui/asset/temp/'+file+'/0.wma').then(async (data: any) => {
          // const instance = await ffmpeg.entrypoint.run({
          //   args: ["-i", "-", "-f", "wav", "-"],
          //   stdin: new Uint8Array(data),
          // });
          // const { stdout } = await instance.wait();
          // fs.writeFileSync('./plugins/sdvx@asphyxia/webui/asset/audio/'+file.substring(0, 9)+'/0.wav', stdout);
          
        // })
        // exec(shell([ffmpeg, '-i', './plugins/sdvx@asphyxia/webui/asset/temp/'+file+'/0.wma', './plugins/sdvx@asphyxia/webui/asset/audio/'+file.substring(0, 9)+'/0.mp3']), (err: any, stdout: any, stderr: any) => {
        //   console.log(err)
        // })

        // exec(shell([ffmpeg, '-i', './plugins/sdvx@asphyxia/webui/asset/temp/'+file+'/1.wma', './plugins/sdvx@asphyxia/webui/asset/audio/'+file.substring(0, 9)+'/1.mp3']), (err: any, stdout: any, stderr: any) => {
        //   console.log(err)
        // })

        // if(fs.existsSync('./plugins/sdvx@asphyxia/webui/asset/temp/'+file+'/2.wma')){
          // exec(shell([ffmpeg, '-i', './plugins/sdvx@asphyxia/webui/asset/temp/'+file+'/2.wma', './plugins/sdvx@asphyxia/webui/asset/audio/'+file.substring(0, 9)+'/2.mp3']), (err: any, stdout: any, stderr: any) => {
          //   console.log(err)
          // })
        // }
    }
  }

  await zipFolderToFile({
    sourceDir: './plugins/sdvx@asphyxia/webui/asset/temp',
    outZipPath: './plugins/sdvx@asphyxia/webui/asset/temp.zip',
    rootInZip: 'temp',
  })

  await fs.promises.rm('./plugins/sdvx@asphyxia/webui/asset/temp', { recursive: true, force: true }).catch((err: any) => {
    console.log(err)
  })

  

  

  console.log('Assets imported. Now converting audio files on browser...')
  send.file('webui/asset/temp.zip')

  // fs.promises.rm('./plugins/sdvx@asphyxia/webui/asset/temp.zip', { force: true }).catch((err: any) => {
  //   console.log(err)
  // })
  // send.json({status:"ok"})
};

export const update_webui_nemsys_data = async (data: any, send: WebUISend) => {
  let string = data.file
  let nemsys_xml = U.parseXML(string)

  const fs = require('fs')
  const filename = "../webui/asset/json/data.json"
  const datajson = require(filename)

  nemsys_xml.custom_nemsys_data.info.filter((e: any) => e.id != 8 && e.id != 9 && e.id != 10 && e.id != 11).forEach((item: any) => {
    if(datajson.nemsys.filter((e: any) => e.value == item.id).length == 0){
      datajson.nemsys.push({
        value: item.id,
        name: item.texture_name
      })
    }
  })

  fs.writeFileSync("./plugins/sdvx@asphyxia/webui/asset/json/data.json", JSON.stringify(datajson, null, 2))
  send.json({status:"ok"})
}

export const update_webui_stamp_data = async (data: any, send: WebUISend) => {
  let string = data.file
  let chat_stamp_xml = U.parseXML(string)

  const fs = require('fs')
  const filename = "../webui/asset/json/data.json"
  const datajson = require(filename)

  chat_stamp_xml.chat_stamp_data.info.forEach((item: any) => {
    if(datajson.stamp.filter((e: any) => e.value == item.id).length == 0){
      let addition = ""
      if(item.filename != ""){
        addition = item.filename.substring(item.filename.length - 2)
      }

      datajson.stamp.push({
        value: item.id,
        name: item.title + " " +addition
      })
    }
  })
  
  fs.writeFileSync("./plugins/sdvx@asphyxia/webui/asset/json/data.json", JSON.stringify(datajson, null, 2))
  send.json({status:"ok"})
}

export const update_webui_subbg_data = async (data: any, send: WebUISend) => {
  const fs = require('fs')
  const filename = "../webui/asset/json/data.json"
  const datajson = require(filename)

  let subbg_folder = fs.readdirSync("./plugins/sdvx@asphyxia/webui/asset/submonitor_bg")
  let subbg_entry = {}
  subbg_folder.forEach((item: any) => {
    if(item.endsWith(".png")||item.endsWith(".mp4")){
      if(subbg_entry[item.substring(6, 10)] == undefined){
        subbg_entry[item.substring(6, 10)] = {"count":1, "video":false}
      }else{
        subbg_entry[item.substring(6, 10)]["count"] += 1
      }
    }
    if(item.endsWith(".mp4")){
      subbg_entry[item.substring(6, 10)]["video"] = true
    }
  })

  console.log(JSON.stringify(subbg_entry, null, 2))

  Object.keys(subbg_entry).forEach((item: any) => {
    if(datajson.subbg.filter((e: any) => e.value == item).length == 0){
      if(subbg_entry[item]["video"]){
        datajson.subbg.push({
          value: parseInt(item),
          name: "SubBG "+ item,
          video: true,
        })
      }else if(subbg_entry[item]["count"] > 1){
        datajson.subbg.push({
          value: parseInt(item),
          name: "SubBG "+ item,
          multi: true,
        })
      }else{
        datajson.subbg.push({
          value: parseInt(item),
          name: "SubBG "+ item,
        })
      }
    }else{
      if(subbg_entry[item]["video"]){
        datajson.subbg.forEach((e: any) => {
          if(e.value == parseInt(item)){
            e.video = true
          }
        })
      }else if(subbg_entry[item]["count"] > 1){
        datajson.subbg.forEach((e: any) => {
          if(e.value == parseInt(item)){
            e.multi = true
          }
        })
      }
    }
  })

  fs.writeFileSync("./plugins/sdvx@asphyxia/webui/asset/json/data.json", JSON.stringify(datajson, null, 2))
  send.json({status:"ok"})
}

export const update_webui_bgm_data = async (data: any, send: WebUISend) => {
  const fs = require('fs')
  const filename = "../webui/asset/json/data.json"
  const datajson = require(filename)

  let bgm_folder = fs.readdirSync("./plugins/sdvx@asphyxia/webui/asset/audio")
  let bgm_entry = []

  bgm_folder.forEach((item: any) => {
    if(item.substring(0, 6) == "custom"){
      bgm_entry.push(parseInt(item.substring(item.length - 2)))
    }
  })

  console.log(bgm_entry)

  bgm_entry.forEach((item: any) => {
    if(datajson.bgm.filter((e: any) => e.value == item).length == 0){
      datajson.bgm.push({
        value: parseInt(item),
        name: "BGM "+ item,
      })
    }
  })

  fs.writeFileSync("./plugins/sdvx@asphyxia/webui/asset/json/data.json", JSON.stringify(datajson, null, 2))
  send.json({status:"ok"})
}

export const update_music_db = async (data: any, send: WebUISend) => {
  const fs = require('fs')
  data = JSON.parse(U.parseXML(data.file, false))

  fs.writeFileSync("./plugins/sdvx@asphyxia/webui/asset/json/music_db.json", JSON.stringify(data, null, 2))
}


export const sendMdb = async (data: any, send: WebUISend) => {
  console.log('Sending music_db to WebUI...')
  send.json(music_db)
}

export const sendAssetData = async ( data: { path: string }, send: WebUISend) => {
  if (U.GetConfig('sdvx_path') == '') {
    send.error(400, 'SDVX Path is not set in the plugin configuration.');
    return;
  }

  let sdvx_path = U.GetConfig('sdvx_path');

  const full_path = joinUnder(sdvx_path, data.path);
  
  const fs = require('fs');

  if (!fs.existsSync(full_path)) {
    send.error(404, 'File not found');
    return;
  }

  try {
    const asset_data: Buffer = await fs.promises.readFile(full_path);
    console.log(asset_data.length);
    console.log('Sending asset file: ' + full_path);
    send.buffer(asset_data);
  } catch (e) {
    console.log(e);
    send.error(500, 'Failed to read file');
  }
}