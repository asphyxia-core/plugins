/*
 * xif@asphyxia — ポラリスコード / Polaris Chord (XIF) 本地服务器插件
 *
 * 目录结构与官方插件模板一致（asphyxia-core/plugins/_example@identifier）：
 *   index.ts          仅注册：GameCode / Contributor / Config / WebUIEvent / Route
 *   handlers/*.ts     各模块的请求处理器（EPR）
 *   templates/*.pug   响应模板（pug）
 *   webui/*           插件 WebUI 自定义页面
 *   data/*.json       可由外部脚本重新生成的数据文件
 *
 * 协议细节与踩坑记录见 README.md、docs/。
 */

import { enqueue, trace } from './handlers/common';

/* ---- 主数据 ---- */
import { getCommon } from './handlers/mst';

/* ---- 抽卡（Hunt）---- */
import { beginGacha, drawGacha, endGacha, getGachaInfo } from './handlers/gacha';

/* ---- 读卡：cardmng.* 由 CORE 内建处理（src/eamuse/Core/CardManager.ts），
 *      插件里再注册不会被调用，故不重复实现 ---- */

/* ---- 玩家存档 ---- */
import {
  checkIn,
  checkOut,
  get as usrGet,
  getUsrMusic,
  save as usrSave,
  saveMusicScore,
  signUp,
} from './handlers/usr';

/* ---- 机台 / 本地临时数据 ---- */
import { empty, messageGet, pcbEventPut, pcbSave, pcbSaveErrorLog } from './handlers/pcb';

/* ---- WebUI 控制台 ---- */
import { exportSave, resetPersistent, status } from './handlers/webui';

export function register(): void {
  /* Register game code */
  R.GameCode('XIF');

  /* Register contributors */
  R.Contributor('花散kasan (kasan)');

  /* Register plugin configuration */
  R.Config('debug_trace', {
    name: '记录请求日志 (xrpc.log)',
    desc: '开启后把每个 XRPC 请求/响应写入插件目录的 xrpc.log，排查协议问题用。长期开启会持续增长。',
    type: 'boolean',
    default: true,
  });
  R.Config('ticket_count', {
    name: '活动票券数量',
    desc: '每次登录发放的 ticket.event.* 数量（联动商店的支付货币），999 相当于无限。',
    type: 'integer',
    range: [0, 9999],
    default: 999,
  });
  R.Config('log_limit_kb', {
    name: '日志大小上限 (KB)',
    desc: 'xrpc.log 超过该大小后滚动保留末尾内容。0 表示不限制。',
    type: 'integer',
    range: [0, 102400],
    default: 1024,
    needRestart: true,
  });

  /* Register WebUI events（对应 webui/xif.pug） */
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

  /* 单机用不到的 */
  R.Route('local.get_temp', empty);
  R.Route('local.save_temp', empty);
  R.Route('pcb.sync_matching_room', empty);
  R.Route('pcb.sync_matching_music', empty);
  R.Route('pcb.sync_matching_progress', empty);
  R.Route('pcb.sync_matching_game_result', empty);
  R.Route('pcb.finish_matching_room', empty);

  /* 其余全部记录并按成功响应，避免未处理分支返回非成功状态 */
  R.Unhandled(async (info, data, send) => {
    trace(`UNHANDLED ${info.module}.${info.method}`, data);
    await send.success();
  });

  console.log('[xif] plugin registered');
}
