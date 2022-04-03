import { EVENT4, COURSES4, EXTENDS4 } from '../data/hvn';
import { EVENT5, COURSES5, EXTENDS5 } from '../data/vvw';
import { EVENT6, COURSES6, EXTENDS6 } from '../data/exg';
import { COURSE2 } from '../data/inf';
import {getVersion, getRandomIntInclusive} from '../utils';
export const common: EPR = async (info, data, send) => {
  let events = [];
  let courses = [];
  let extend = [];
  console.log("Calling common function");
  
  const version = parseInt(info.model.split(":")[4]);

  if (version <= 2013052900) {
      return send.pugFile('templates/booth/common.pug');
  }
  
  if (version <= 2014112000) {
      courses = COURSE2;
      return send.pugFile('templates/infiniteinfection/common.pug',{
          courses,
      });
  }

  switch (info.method) {
    case 'sv4_common': {
      events = EVENT4;
      courses = COURSES4;
      //extend = EXTENDS4;
      EXTENDS4.forEach(val => extend.push(Object.assign({}, val)));
      break;
    }
    case 'sv5_common': {
      events = EVENT5;
      courses = COURSES5;
      //extend = EXTENDS5;
      EXTENDS5.forEach(val => extend.push(Object.assign({}, val)));
      break;
    }
    case 'sv6_common': {
      //events = EVENT6;
      EVENT6.forEach(val => events.push(Object.assign({}, val));
      courses = COURSES6;
      EXTENDS6.forEach(val => extend.push(Object.assign({}, val)));
      break;
    }
  }
  let songs = [];

  if (U.GetConfig('unlock_all_songs')) {
    console.log("Unlocking songs");
    const gameVersion = getVersion(info);
    let songNum = 2000;
    if(gameVersion === 2) songNum = 554;
    if(gameVersion === 3) songNum = 954;
    if(gameVersion === 4) songNum = 1368;
    for (let i = 1; i < songNum; ++i) {
      for (let j = 0; j < 5; ++j) {
        songs.push({
          music_id: K.ITEM('s32', i),
          music_type: K.ITEM('u8', j),
          limited: K.ITEM('u8', 3),
        });

      }
    }
  }
  
  if(U.GetConfig('use_information')){
    console.log("Sending server information");
    let time = new Date();
    let tempDate = time.getDate();
    const currentTime = parseInt((time.getTime()/100000) as unknown as string)*100;
    extend.push({
      id: 1,
      type: 1,
      params: [
        1,
        currentTime,
        1,
        1,
        31,
        '[f:0]SERVER INFORMATION',
        '[sz:120]      [olc:555555][ol:4][c:ff3333,3333ff,77ff77]Asphyxia\n'+
        '[sz:75]                        CORE\n[sz:30]'+
        '[sz:30][c:ffffff,888888] \n \n'+
        '                           [c:00d5ff,888888]ASPHYXIA CORE'+CORE_VERSION+'\n'+
        '                              [c:e5f3ff,a3d5ff]SDVX Plugin ver 6.0.0\n \n \n'+
        '\n\n           [f:0][c:ff3333,ffffff]FREE SOFTWARE. BEWARE OF SCAMMERS.\n'+
        '[c:ffffff,888888]  If you bought this software, request refund immediately.\n \n \n[/ol]'+
        '[br:10][c:00FFFF][sz:50]メリー。。。クリスマス、です。。。'+
        '\n \n \n \n[sz:32][c:560000,FC0000]DO NOT STREAM OR DISTRIBUTE THIS GAME IN PUBLIC',
        //'[img:test]',
        '',
        '',
        '',
      ],
    });
  }
  
  if(U.GetConfig('new_year_special')){
      events.push('NEW_YEAR_2022');
  }

  if(U.GetConfig('use_asphyxia_gameover')){
    let time = new Date();
    let tempDate = time.getDate();
    const currentTime = parseInt((time.getTime()/100000) as unknown as string)*100;
    let rightCharater = [
      "go_bansui","go_bof","go_cannon","go_chinema","go_chocopla",
      "go_dd","go_ekusa","go_esp","go_flowry","go_fukuryu",
      "go_gorilla","go_grace","go_grace_rori","go_grace_ver06","go_haelequin",
      "go_haruka","go_joyeuse","go_kino","go_kisa","go_mai",
      "go_makina","go_makishima","go_left","go_makishima_ver06","go_mitsuru","go_miyako",
      "go_nana","go_natsuhi","go_noisia","go_left_ver06","go_ondine","go_pannakotta",
      "go_psychoholic","go_rain","go_rain02","go_ribbon","go_right",
      "go_riot","go_rishna","go_rouge","go_sakurako","go_satan",
      "go_tama","go_torako","go_vela","go_vertex","go_wabutan",
      "go_wanlove","go_yusya",
    ];
    let leftCharater = [
      "go_akane","go_apex4sis","go_candy","go_capsaicin","go_chikage",
      "go_evileye","go_fluorine","go_gangara","go_gin","go_hero",
      "go_hiryubiren","go_hiyuki","go_hotaru","go_inoten","go_kamito",
      "go_kanade","go_kemuri","go_kokona","go_konoha","go_kouki",
      "go_kureha","go_left_bag","go_madholic",
      "go_mimiko","go_mion","go_mitsuruco","go_nathanael","go_nishinippori",
      "go_ortlinde","go_pico","go_pilica","go_profession","go_rasis",
      "go_rasis_ver06","go_right_ver06","go_rimuru","go_rowa","go_saigawara",
      "go_setu","go_shelly","go_soul","go_tamaneko","go_toraipuru",
      "go_tsubaki","go_tsumabuki","go_tsumabuki_ver06","go_yuki","go_yukito",
    ];
    let middleCharater = ["go_cat","go_cawoashi","go_iruyoru","go_neno",];
    // Pattern 1 Left Right Left
    // Pattern 2 Right Left Right
    // Pattern 3 Right Middle Left
    // Pattern 4 Left Middle Right
    // switch(getVersion(info)){
    //   case 5:{
    //     break;
    //   }
    //   case 6:{
    //     rightCharater.push();
    //     leftCharater.push();
    //     break;
    //   }
    // }
    var charaString = "characters: ";
    let pattern = getRandomIntInclusive(1,4);
    switch(pattern){
      case 1:{
        var chara1 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        var chara2 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        var chara3 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        charaString += "chara01/"+chara1+" chara02/"+chara2+" chara01/"+chara3;
        break;
      }
      case 2:{
        var chara1 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        var chara2 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        var chara3 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        charaString += "chara02/"+chara1+" chara01/"+chara2+" chara02/"+chara3;
        break;
      }
      case 3:{
        var chara1 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        var chara2 = middleCharater[getRandomIntInclusive(0,middleCharater.length-1)]
        var chara3 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        charaString += "chara02/"+chara1+" chara03/"+chara2+" chara01/"+chara3;
        break;
      }
      case 4:{
        var chara1 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        var chara2 = middleCharater[getRandomIntInclusive(0,middleCharater.length-1)];
        var chara3 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        charaString += "chara01/"+chara1+" chara03/"+chara2+" chara02/"+chara3;
        break;
      }
    }

    if(Math.abs(getVersion(info)) == 6){//Due to older version misses newer characters, not supported on older versions
      extend.push({
      id: 3,
      type: 1,
      params: [
        3,
        currentTime,
        0,
        60,
        0,
        '[GAMEOVER]',
        '[ol:6][olc:FFFFFF][ds:4][dsc:000000][sz:32][c:99FF00A8]Thank You For Using Asphyxia CORE!!!',
        '[ol:6][olc:FFFFFF][ds:4][dsc:000000][sz:32][c:990D46F2]For more information please visit our Discord!',
        '[ol:6][olc:FFFFFF][ds:4][dsc:000000][sz:32][c:99ED4F39]Nice Play!!!',
        //'characters: chara01/go_rasis_ver06 chara02/go_left_ver06 chara01/go_right_ver06',
        charaString,
      ],
    });
    }
    
  }

  console.log("Sending common objects");
  send.object(
    {
      event: {
        info: events.map(e => ({
          event_id: K.ITEM('str', e),
        })),
      },
      extend: {
        info: extend.map(e => ({
          extend_id: K.ITEM('u32', e.id),
          extend_type: K.ITEM('u32', e.type),
          param_num_1: K.ITEM('s32', e.params[0]),
          param_num_2: K.ITEM('s32', e.params[1]),
          param_num_3: K.ITEM('s32', e.params[2]),
          param_num_4: K.ITEM('s32', e.params[3]),
          param_num_5: K.ITEM('s32', e.params[4]),
          param_str_1: K.ITEM('str', e.params[5]),
          param_str_2: K.ITEM('str', e.params[6]),
          param_str_3: K.ITEM('str', e.params[7]),
          param_str_4: K.ITEM('str', e.params[8]),
          param_str_5: K.ITEM('str', e.params[9]),
        })),
      },
      music_limited: { info: songs },
      skill_course: {
        info: courses.reduce(
          (acc, s) =>
            acc.concat(
              s.courses.map(c => ({
                season_id: K.ITEM('s32', s.id),
                season_name: K.ITEM('str', s.name),
                season_new_flg: K.ITEM('bool', s.isNew),
                course_type: K.ITEM('s16', 0),
                course_id: K.ITEM('s16', c.id),
                course_name: K.ITEM('str', c.name),
                skill_level: K.ITEM('s16', c.level),
                skill_name_id: K.ITEM('s16', c.nameID),
                matching_assist: K.ITEM('bool', c.assist),
                clear_rate: K.ITEM('s32', 5000),
                avg_score: K.ITEM('u32', 15000000),
                track: c.tracks.map(t => ({
                  track_no: K.ITEM('s16', t.no),
                  music_id: K.ITEM('s32', t.mid),
                  music_type: K.ITEM('s8', t.mty),
                })),
              }))
            ),
          []
        ),
      },
    },
    { encoding: 'utf8' }
  );
};


export const log: EPR = async (info, data, send) => {
    send.success();
}

