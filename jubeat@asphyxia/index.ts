// nodemon --exec "asphyxia-core-x64 --dev" -e ts --watch plugins

import { demodata, shopRegist } from './handlers/common';
import { lobby } from './handlers/matching';
import { profile } from './handlers/profile';

export function register() {
  if (CORE_VERSION_MAJOR <= 1 && CORE_VERSION_MINOR < 31) {
    console.error(
      "The current version of Asphyxia Core is not supported. Requires version '1.31' or later."
    );
    return;
  }

  R.Contributor('Kirito', 'https://github.com/Kirito3481');

  R.GameCode('I44');

  R.Route('shopinfo.regist', shopRegist);

  R.Route('demodata.getnews', demodata.getNews);

  R.Route('gametop.regist', profile.regist);
  R.Route('gametop.get', profile.get);
  R.Route('meeting.get', profile.meeting);

  R.Route('gameend.regist', profile.save);
  R.Route('gameend.log', true);

  R.Route('lobby.check', lobby.check);
  R.Route('lobby.entry', lobby.entry);
  R.Route('lobby.refresh', lobby.refresh);
  R.Route('lobby.report', lobby.report);

  R.Route('netlog.send', true);

  R.Unhandled();
}
