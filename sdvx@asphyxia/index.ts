import {common,log} from './handlers/common';
import {hiscore, rival, saveMix, loadMix, globalMatch} from './handlers/features';
// import {} from './handlers/sv4/';
// import {} from './handlers/sv5/';
// import {} from './handlers/sv6/';
import {
  updateProfile,
  updateMix,
  importMix,
  deleteMix,
  make_hexa_easier,
  import_assets
  // sendImg,
  // sendImgWithID,
  // getScore,
  // getScoreCount,
  // test
} from './handlers/webui';
import {
  load,
  create,
  loadScore,
  save,
  saveScore,
  saveCourse,
  buy,
  print,
} from './handlers/profiles';

import { MusicRecord } from './models/music_record';

enum Version{
  Booth = 'game.',
  II = 'game_2.',
  GW = 'game_3.',
  HH = 'game.sv4_',
  VW = 'game.sv5_',
  EG = 'game.sv6_',
}

export let music_db;

function load_music_db(){
  IO.ReadFile('./webui/asset/json/music_db.json',{encoding:'utf8'}).then(data => {
    music_db = JSON.parse(data);
    console.log('music_db loaded, total: '+music_db.mdb.music.length);
  })
}

export function register() {
    
  R.Contributor("LatoWolf");
  R.GameCode('KFC');

  R.Config('unlock_all_songs', { type: 'boolean', default: false, name:'Unlock All Songs'});
  R.Config('unlock_all_navigators', { type: 'boolean', default: false, name:'Unlock All Navigators'} );
  R.Config('unlock_all_appeal_cards', { type: 'boolean', default: false, name:'Unlock All Appeal Cards'});
  R.Config('use_information' ,{ type: 'boolean', default: true, name:'Use Information', desc:'Enable the information section after entry.'});
  R.Config('use_asphyxia_gameover',{ type: 'boolean', default: true, name:'Use Asphyxia Gameover', desc:'Enable the Asphyxia gameover message after ending the game.'})
  R.Config('use_blasterpass',{ type: 'boolean', default: true, name:'Use Blaster Pass', desc:'Enable Blaster Pass for VW and EG'});
  R.Config('new_year_special',{ type: 'boolean', default: true, name:'Use New Year Special', desc:'Enable New Year Special BGM for login'});
  R.Config('music_count',{ type: 'integer', default: 2200, name:'Music Count', desc:'The total number of music in the game.'});
    
  R.WebUIEvent('updateProfile', updateProfile);
  R.WebUIEvent('updateMix', updateMix);
  R.WebUIEvent('importMix', importMix);
  R.WebUIEvent('deleteMix', deleteMix);
  R.WebUIEvent('easyHexa', make_hexa_easier);
  R.WebUIEvent('import_assets', import_assets);

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    R.Route(`game.sv6_${method}`, handler);
  };
  

  // Common
  MultiRoute('common', common);

  // Profile
  MultiRoute('new', create);
  MultiRoute('load', load);
  MultiRoute('load_m', loadScore);
  MultiRoute('save', save);
  MultiRoute('save_m', saveScore);
  MultiRoute('save_c', saveCourse);
  MultiRoute('frozen', true);
  MultiRoute('buy', buy);
  MultiRoute('print',print);

  // Features
  MultiRoute('hiscore', hiscore);
  MultiRoute('load_r', rival);
  MultiRoute('save_ap', saveMix);
  MultiRoute('load_ap', loadMix);

  // Lazy
  MultiRoute('lounge', (_, __, send) => send.object({
    interval: K.ITEM('u32', 30)
  }));
  MultiRoute('shop', (_, __, send) => send.object({
    nxt_time: K.ITEM('u32', 1000 * 5 * 60)
  }));

  MultiRoute('save_e', true); 
  MultiRoute('save_mega',true);
  MultiRoute('play_e', true);
  MultiRoute('play_s', true);
  MultiRoute('entry_s', globalMatch);
  MultiRoute('entry_e', true);
  MultiRoute('exception', true);
  MultiRoute('log',log);
 
  R.Route('eventlog.write', (_, __, send) => send.object({
    gamesession: K.ITEM('s64', BigInt(1)),
    logsendflg: K.ITEM('s32', 0),
    logerrlevel: K.ITEM('s32', 0),
    evtidnosendflg: K.ITEM('s32', 0)
  }));
  
  R.Route('package.list',(_,__,send)=>send.object({
      package:K.ATTR({expire:"1200"},{status:"1"})
  }));
  
  R.Route('ins.netlog', (_, __, send) => send.object({
    //gamesession: K.ITEM('s64', BigInt(1)),
    //logsendflg: K.ITEM('s32', 0),
    //logerrlevel: K.ITEM('s32', 0),
    //evtidnosendflg: K.ITEM('s32', 0)
  }));


  R.Unhandled();
}
