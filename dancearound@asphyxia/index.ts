import {
  getPlayData,
  signup,
  savePlayData,
  getMusicScore,
  saveMusicScore,
} from './handlers/profile';
import {
  getCommon,
  lockMultiLogin,
  saveLog,
  savePcbData,
} from './handlers/common';
import {
  checkPlayableMotionData,
  getMotionData,
  getMotionInfoList,
  saveMotionData,
} from './handlers/motion';

export function register() {
  R.GameCode('UDN');
  R.Contributor('Avimitin', 'https://github.com/Avimitin');
  R.ExtraModuleHandler(async () => ['game']);

  R.Config('unlock_all_songs', {
    name: 'Unlock all songs',
    desc: 'Load and unlock every playable chart from the installed game MDB.',
    type: 'boolean',
    default: true,
  });

  R.Config('game_path', {
    name: 'Game path',
    desc: 'Path to the local DANCE aROUND installation.',
    type: 'string',
    default: '',
  });

  R.Config('motion_history_limit', {
    name: 'Motion history limit',
    desc: 'Maximum number of saved motion captures per player. Set to 0 to disable storage.',
    type: 'integer',
    range: [0, 100],
    default: 20,
  });

  R.Route('game.get_playdata', getPlayData);
  R.Route('game.sign_up', signup);
  R.Route('game.get_musicscore', getMusicScore);
  R.Route('game.lock_multi_login', lockMultiLogin);
  R.Route('game.get_common', getCommon);
  R.Route('game.save_playdata', savePlayData);
  R.Route('game.save_musicscore', saveMusicScore);
  R.Route('game.save_pcbdata', savePcbData);
  R.Route('game.save_log', saveLog);
  R.Route('game.save_motiondata', saveMotionData);
  R.Route('game.get_motioninfolist', getMotionInfoList);
  R.Route('game.check_playable_motiondata', checkPlayableMotionData);
  R.Route('game.get_motiondata', getMotionData);

  R.Unhandled(async (info, data, send) => {
    console.warn(
      `[Dance Around] unhandled route ${info.module}.${info.method}`
    );
    await send.success();
  });

  console.log('[Dance Around] UDN network service registered');
}
