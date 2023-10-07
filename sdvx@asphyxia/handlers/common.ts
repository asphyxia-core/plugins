import { EVENT6, COURSES6, EXTENDS6, VALGENE6 } from '../data/exg';
import {getVersion, getRandomIntInclusive} from '../utils';

export const informationString = 
`[sz:120]      [olc:555555][ol:4][c:ff3333,3333ff,77ff77]Asphyxia
[sz:75]                        CORE
[sz:30][sz:30][c:ffffff,888888] 
 
[c:00d5ff,888888]ASPHYXIA CORE ${CORE_VERSION}
[c:e5f3ff,a3d5ff]SDVX Plugin ver 6.1.0
 
 
[f:0][c:ff3333,ffffff]FREE SOFTWARE. BEWARE OF SCAMMERS.
[c:ffffff,888888]  If you bought this software, request refund immediately.
 
 
[/ol]


 
 
 
 
[sz:32][c:560000,FC0000]DO NOT STREAM OR DISTRIBUTE THIS GAME IN PUBLIC`

// Special Banner, under [/ol]
// [br:10][c:561F55,FCB2BF][sz:70]       Trick or... Trick ?


export const common: EPR = async (info, data, send) => {
  let events = [];
  let courses = [];
  let extend = [];
  console.log("Calling common function");
  
  const version = parseInt(info.model.split(":")[4]);

  switch (info.method) {
    case 'sv6_common': {
      events = EVENT6;
      courses = COURSES6;
      EXTENDS6.forEach(val => extend.push(Object.assign({}, val)));
      break;
    }
  }
  let songs = [];

  if (U.GetConfig('unlock_all_songs')) {
    console.log("Unlocking songs");
    let songNum = U.GetConfig('music_count'); 
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
        informationString,
        '',
        '',
        '',
      ],
    });
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
    let charaString = "characters: ";
    let pattern = getRandomIntInclusive(1,4);
    switch(pattern){
      case 1:{
        let chara1 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        let chara2 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        let chara3 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        charaString += "chara01/"+chara1+" chara02/"+chara2+" chara01/"+chara3;
        break;
      }
      case 2:{
        let chara1 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        let chara2 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        let chara3 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        charaString += "chara02/"+chara1+" chara01/"+chara2+" chara02/"+chara3;
        break;
      }
      case 3:{
        let chara1 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        let chara2 = middleCharater[getRandomIntInclusive(0,middleCharater.length-1)]
        let chara3 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        charaString += "chara02/"+chara1+" chara03/"+chara2+" chara01/"+chara3;
        break;
      }
      case 4:{
        let chara1 = leftCharater[getRandomIntInclusive(0,leftCharater.length-1)];
        let chara2 = middleCharater[getRandomIntInclusive(0,middleCharater.length-1)];
        let chara3 = rightCharater[getRandomIntInclusive(0,rightCharater.length-1)];
        charaString += "chara01/"+chara1+" chara03/"+chara2+" chara02/"+chara3;
        break;
      }
    }

    if(Math.abs(getVersion(info)) == 6){
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
        charaString,
      ],
    });
    }
  }

  let unlock_codes = [
    1,  
    2,  
    3,  
    4,  
    5,  
    6,  
    7,
    8,  
  ]

  let time = new Date();
  let tempDate = time.getDate();
  const currentTime = time.getTime();
  tempDate += 30;
  time.setDate(tempDate);
  const newTime = time.getTime();

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
                skill_type: K.ITEM('s16', 0),
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
              })),
              s.courses.map(c => ({
                season_id: K.ITEM('s32', s.id),
                season_name: K.ITEM('str', s.name),
                season_new_flg: K.ITEM('bool', s.isNew),
                course_type: K.ITEM('s16', 0),
                skill_type: K.ITEM('s16', 1),
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
      arena: {
        season: K.ITEM('s32',3),
        rule: K.ITEM('s32',0),
        rank_match_target: K.ARRAY('s32', [
          1,1,1,1,
          1,1,1,1,
          1,1,1,1,
          1,1,1,1,
          0,0,0,0,
          0,0,0,0,
          0,0,0,0,
          0,0,0,0,
        ]),
        time_start: K.ITEM('u64',BigInt(currentTime)),
        time_end: K.ITEM('u64',BigInt(newTime)),
        shop_start:  K.ITEM('u64',BigInt(currentTime)),
        shop_end:  K.ITEM('u64',BigInt(newTime)),
        is_open: K.ITEM('bool',true),
        is_shop: K.ITEM('bool',true)
      },
      valgene: {
        info: unlock_codes.map(v => ({
          valgene_name: K.ITEM('str', 'VALKYRIE GENERATOR VOL.' + v),
          valgene_name_english: K.ITEM('str', 'VALKYRIE GENERATOR VOL.' + v),
          valgene_id: K.ITEM('s32', v),
        })),
        catalog: VALGENE6.catalog.map(c => ({
          valgene_id: K.ITEM('s32', c.valgene_id),
          rarity: K.ITEM('s32', c.rarity),
          item_type: K.ITEM('s32', c.item_type),
          item_id: K.ITEM('s32', c.item_id),
        })),
      }
    },
    { encoding: 'utf8' }
  );
};


export const log: EPR = async (info, data, send) => {
    send.success();
}

