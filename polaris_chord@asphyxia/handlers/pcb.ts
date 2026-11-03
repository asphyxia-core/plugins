/*
 * 机台（PCB）与本地临时数据。
 *
 * `pcb.save` / `pcbevent.put` 必须处理：结算后点「Continue」
 * （game.scene.continue 的 SavePlayDataStepRunner.UploadPlayerDataWithPcbEventAsync）
 * 会同时上报玩家数据和 PCB 事件，然后检查响应 Body 是否为 null，
 * 为 null 就把 IsSucceededSavePlayData 判成 false → 弹「回线混杂」。
 *
 * 这些接口以前全没实现，落到 asphyxia 的未处理分支（返回非成功状态）。
 */

import { handle, nowStr } from './common';

export const pcbSave: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const pcbEventPut: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const pcbSaveErrorLog: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const messageGet: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));

/* ---- 单机用不到的 ---- */
export const empty: EPR = handle();
