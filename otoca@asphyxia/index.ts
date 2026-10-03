// otoca d'or (NCG). The XRPC module "game" (service "local") is implemented by the game's ealocal.dll;
// field names, types and limits follow its psmap tables, and every value follows how game.dll uses it
// (see README). Values marked "guess" are server policy the game code does not decide.
import { RIVAL_PACKS } from './data';
import { addDoll, addUser, getCardInfo } from './handlers/card';
import { receiveGift, receiveItem } from './handlers/gift';
import { addItem, composition, delItem, sellItem, setMakeup } from './handlers/item';
import { bindKeyUser, checkKeyUser } from './handlers/key';
import { addExp, addStamp, report, reportMission, reportQuestion } from './handlers/play';
import { setCardInfo, setRivalCard } from './handlers/print';
import { getVersion } from './handlers/version';

export function register() {
  R.GameCode('NCG');
  R.Contributor('iamsub');

  R.Config('marker', {
    name: 'Version marker',
    desc: 'Unlocks hair/eye colours in the salon and mode-select tips (the game checks 1-8).',
    type: 'integer',
    default: 8,
    range: [0, 255],
  });
  R.Config('limited_enemy', {
    name: 'Limited-time enemy',
    desc: 'Show the limited-time enemy (あい / ぷっちコンテスト, episode 3).',
    type: 'boolean',
    default: false,
  });
  R.Config('stamp_double', {
    name: 'Double stamps',
    desc: 'Two stamps per play, with the campaign icon on the title screen.',
    type: 'boolean',
    default: false,
  });
  R.Config('trial_shop', {
    name: 'Salon trial ticket',
    desc: 'One free hair/eye colour change in the salon for each player (as in the arcade).',
    type: 'boolean',
    default: true,
  });
  R.Config('rival_pack', {
    name: 'Rival card pack',
    desc: 'The pack the rival cards offered after a play come from. Random draws one for each play.',
    type: 'string',
    options: ['Random', ...RIVAL_PACKS.map(p => p.name)],
    default: 'Random',
  });
  R.Config('starkira_free', {
    name: 'Free star kira',
    desc: 'Star kira cards need no star powder.',
    type: 'boolean',
    default: false,
  });

  R.Route('game.getVersion', getVersion);

  R.Route('game.addUser', addUser);
  R.Route('game.addDoll', addDoll);
  R.Route('game.getCardInfo', getCardInfo);
  R.Route('game.cancel', true);

  R.Route('game.checkKeyUser', checkKeyUser);
  R.Route('game.bindKeyUser', bindKeyUser);
  R.Route('game.copyKeyCard', true);

  R.Route('game.setCardInfo', setCardInfo);
  R.Route('game.setRivalCard', setRivalCard);
  R.Route('game.checkRivalCard', true);

  R.Route('game.report', report);
  R.Route('game.addExp', addExp);
  R.Route('game.addStamp', addStamp);
  R.Route('game.reportMission', reportMission);
  R.Route('game.reportQuestion', reportQuestion);
  R.Route('game.reportTrial', true);

  R.Route('game.addItem', addItem);
  R.Route('game.delItem', delItem);
  R.Route('game.sellItem', sellItem);
  R.Route('game.composition', composition);
  R.Route('game.setMakeup', setMakeup);

  R.Route('game.receiveGift', receiveGift);
  R.Route('game.receiveItem', receiveItem);

  R.Unhandled(async (info, data, send) => {
    console.error(`[otoca] unhandled ${info.module}.${info.method}: ${JSON.stringify(data)}`);
    send.success();
  });
}
