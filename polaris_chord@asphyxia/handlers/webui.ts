/*
 * WebUI 控制台事件（对应 webui/xif.pug）。
 * 只读展示 + 两个维护动作（导出存档 / 清空持久道具表）。
 */

import { enqueue } from './common';

/** 存档概况 */
export const status: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    if (!u) {
      send?.json({ ok: false, message: '存档里还没有玩家数据（先登录一次游戏）' });
      return;
    }
    const raw = u.raw && typeof u.raw === 'object' ? u.raw : {};
    let persistent = 0;
    try {
      persistent = Object.keys(JSON.parse(raw['usr_persistent_items'] || '{}')).length;
    } catch (e) {
      persistent = 0;
    }
    send?.json({
      ok: true,
      usr_id: u.usr_id ?? 1,
      name: u.name ?? '',
      rank: u.rank ?? 0,
      exp: u.exp ?? 0,
      scores: Object.keys(u.scores || {}).length,
      persistent,
      rawNodes: Object.keys(raw).length,
    });
  } catch (e) {
    send?.json({ ok: false, message: '读取失败: ' + e });
  }
};

/** 导出完整存档文档（前端下载成 JSON） */
export const exportSave: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    send?.json(u ?? {});
  } catch (e) {
    send?.json({ error: String(e) });
  }
};

/** 清空持久道具表（下次登录生效） */
export const resetPersistent: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    if (!u) {
      send?.json({ ok: false, message: '没有找到玩家数据' });
      return;
    }
    const raw = u.raw && typeof u.raw === 'object' ? { ...u.raw } : {};
    delete raw['usr_persistent_items'];
    await DB.Update<any>({ usr_id: 1 }, { $set: { raw } });
    enqueue('WebUI: 持久道具表已清空\n');
    send?.json({ ok: true, message: '持久道具表已清空，下次登录生效' });
  } catch (e) {
    send?.json({ ok: false, message: '清空失败: ' + e });
  }
};
