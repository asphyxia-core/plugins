import {demodata, gameInfo} from './handlers/common';
import {check, entry, refresh, report} from './handlers/matching';
import {getCollabo, loadScore, meeting, profile, saveProfile} from './handlers/profile';

export function register() {
  if (CORE_VERSION_MAJOR <= 1 && CORE_VERSION_MINOR < 31) {
    console.error('The current version of Asphyxia Core is not supported. Requires version \'1.31\' or later.');
    return;
  }
  R.GameCode('J44');
  R.GameCode('K44');

  R.Route('gametop.regist', profile);
  R.Route('gametop.get_info', gameInfo);
  R.Route('gametop.get_pdata', profile);
  R.Route('gametop.get_mdata', loadScore);
  R.Route('gametop.get_meeting', meeting);
  R.Route('gametop.get_collabo', getCollabo);

  R.Route('gameend.regist', saveProfile);
  R.Route('gameend.log', true);
  R.Route('gameend.set_collabo', true);

  R.Route('shopinfo.regist', gameInfo);
  R.Route('demodata.get_news', demodata.getNews);
  R.Route('demodata.get_data', demodata.getData);
  R.Route('demodata.get_hitchart', demodata.getHitchart);
  R.Route('lobby.check', check);
  R.Route('lobby.entry', entry);
  R.Route('lobby.refresh', refresh);
  R.Route('lobby.report', report);

  R.Route('netlog.send', true);
  R.Route('logger.report', true);
}
