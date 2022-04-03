import {common,log} from './handlers/common';
import {hiscore, rival, saveMix, loadMix, globalMatch} from './handlers/features';
import {
  updateProfile,
  updateMix,
  importMix,
  deleteMix,
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

export function register() {
    
  R.Contributor("LatoWolf#1170");
  R.GameCode('KFC');

  R.Config('unlock_all_songs', { type: 'boolean', default: false, name:'Unlock All Songs'});
  R.Config('unlock_all_navigators', { type: 'boolean', default: false, name:'Unlock All Navigators'} );
  R.Config('unlock_all_appeal_cards', { type: 'boolean', default: false, name:'Unlock All Appeal Cards'});
  R.Config('use_information' ,{ type: 'boolean', default: true, name:'Use Information', desc:'Enable the information section after entry.'});
  R.Config('use_asphyxia_gameover',{ type: 'boolean', default: true, name:'Use Asphyxia Gameover', desc:'Enable the Asphyxia gameover message after ending the game.'})
  R.Config('use_blasterpass',{ type: 'boolean', default: true, name:'Use Blaster Pass', desc:'Enable Blaster Pass for VW and EG'});

  R.Config('other_instance_ip',{type:'string', default:'', name:'Other Instance IP', desc:'The IP of another instance of the server. This is used to get Hiscore if you\'re running multiple instances.Seperate IPs with commas.'});

  R.WebUIEvent('updateProfile', updateProfile);
  R.WebUIEvent('updateMix', updateMix);
  R.WebUIEvent('importMix', importMix);
  R.WebUIEvent('deleteMix', deleteMix);

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    R.Route(`game.${method}`, handler);
    R.Route(`game_2.${method}`, handler);
    //R.Route(`game_3.${method}`, handler);
    R.Route(`game.sv4_${method}`, handler);
    R.Route(`game.sv5_${method}`, handler);
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
