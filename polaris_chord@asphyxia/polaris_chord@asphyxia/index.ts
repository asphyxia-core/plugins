/*
 * xif@asphyxia — Polaris Chord (XIF) local server plugin
 *
 * Layout follows the official plugin template (asphyxia-core/plugins/_example@identifier):
 *   index.ts          registration only: GameCode / Contributor / Config / WebUIEvent / Route
 *   handlers/*.ts     request handlers per protocol module (EPR)
 *   templates/*.pug   response templates (pug)
 *   webui/*           custom plugin WebUI page
 *   data/*.json       data files, regenerable by external scripts
 *
 * Protocol details and a full pitfall log live in README.md and docs/.
 */

import { enqueue, trace } from './handlers/common';

/* ---- Master data ---- */
import { getCommon } from './handlers/mst';

/* ---- Hunt (gacha) ---- */
import { beginGacha, drawGacha, endGacha, getGachaInfo } from './handlers/gacha';

/* ---- Card read-in: cardmng.* is handled by CORE itself
 *      (src/eamuse/Core/CardManager.ts). Registering it from a plugin is never
 *      called, so it is intentionally not implemented here. ---- */

/* ---- Player save data ---- */
import {
  checkIn,
  checkOut,
  get as usrGet,
  getUsrMusic,
  save as usrSave,
  saveMusicScore,
  signUp,
} from './handlers/usr';

/* ---- Cabinet / local scratch data ---- */
import { empty, messageGet, pcbEventPut, pcbSave, pcbSaveErrorLog } from './handlers/pcb';

/* ---- WebUI console ---- */
import { exportSave, resetPersistent, status } from './handlers/webui';

export function register(): void {
  /* Register game code */
  R.GameCode('XIF');

  /* Register contributors */
  R.Contributor('花散kasan (kasan)');

  /* Register plugin configuration */
  R.Config('debug_trace', {
    name: 'Write request log (xrpc.log)',
    desc:
      'When enabled every XRPC request/response is appended to xrpc.log inside the plugin ' +
      'folder. Useful when debugging the protocol; the file keeps growing while enabled.',
    type: 'boolean',
    default: true,
  });
  R.Config('ticket_count', {
    name: 'Event ticket amount',
    desc:
      'Number of ticket.event.* granted on every login (the currency used by the collab ' +
      'shops). 999 is effectively unlimited.',
    type: 'integer',
    range: [0, 9999],
    default: 999,
  });
  R.Config('log_limit_kb', {
    name: 'Log size limit (KB)',
    desc: 'xrpc.log keeps only its tail once it grows past this size. 0 disables the limit.',
    type: 'integer',
    range: [0, 102400],
    default: 1024,
    needRestart: true,
  });

  /* Register WebUI events (see webui/xif.pug) */
  R.WebUIEvent('xif_status', status);
  R.WebUIEvent('xif_export', exportSave);
  R.WebUIEvent('xif_reset_persistent', resetPersistent);

  /* Register routes */
  R.Route('mst.get_common', getCommon);

  R.Route('gacha.get_gacha_info', getGachaInfo);
  R.Route('gacha.begin_gacha', beginGacha);
  R.Route('gacha.draw_gacha', drawGacha);
  R.Route('gacha.end_gacha', endGacha);

  R.Route('usr.get', usrGet);
  R.Route('usr.sign_up', signUp);
  R.Route('usr.save', usrSave);
  R.Route('usr.get_usr_music', getUsrMusic);
  R.Route('usr.save_musicscore', saveMusicScore);
  R.Route('usr.checkin', checkIn);
  R.Route('usr.checkout', checkOut);

  R.Route('pcb.save', pcbSave);
  R.Route('pcb.save_error_log', pcbSaveErrorLog);
  R.Route('pcbevent.put', pcbEventPut);
  R.Route('message.get', messageGet);

  /* Matching-only endpoints, unused in single player */
  R.Route('local.get_temp', empty);
  R.Route('local.save_temp', empty);
  R.Route('pcb.sync_matching_room', empty);
  R.Route('pcb.sync_matching_music', empty);
  R.Route('pcb.sync_matching_progress', empty);
  R.Route('pcb.sync_matching_game_result', empty);
  R.Route('pcb.finish_matching_room', empty);

  /* Everything else: log it and answer "success", so that an unhandled branch
   * never returns a non-zero status */
  R.Unhandled(async (info, data, send) => {
    trace(`UNHANDLED ${info.module}.${info.method}`, data);
    await send.success();
  });

  console.log('[xif] plugin registered');
}
