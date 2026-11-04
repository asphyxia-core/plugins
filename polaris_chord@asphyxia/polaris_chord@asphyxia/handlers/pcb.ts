/*
 * The arcade cabinet (PCB) and local temporary data.
 *
 * `pcb.save` / `pcbevent.put` must be handled: after the results, clicking "Continue"
 * (SavePlayDataStepRunner.UploadPlayerDataWithPcbEventAsync in game.scene.continue)
 * uploads the player data and the PCB event at the same time, then checks whether the
 * response Body is null. If it is null, IsSucceededSavePlayData is judged false →
 * the "回线混杂" (mixed connection) dialog pops up.
 *
 * These endpoints used to be entirely unimplemented, so they fell through to asphyxia's
 * unhandled branch (which returns a non-success status).
 */

import { handle, nowStr } from './common';

export const pcbSave: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const pcbEventPut: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const pcbSaveErrorLog: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const messageGet: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));

/* ---- not needed for offline play ---- */
export const empty: EPR = handle();
