/*
 * WebUI console events (corresponds to webui/xif.pug).
 * Read-only display plus two maintenance actions (export the save / clear the persistent
 * item table).
 */

import { enqueue } from './common';

/**
 * Count the keys of a raw node that may be stored either as a JSON string (older saves)
 * or as an already-parsed object (newer ones).
 *
 * `JSON.parse()` on an object returns "[object Object]", and parsing that throws — which is
 * why this used to report 0 entries even when the table was full.
 */
function countRawKeys(value: any): number {
  if (value === null || value === undefined) return 0;
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return 0;
    }
  }
  return v && typeof v === 'object' ? Object.keys(v).length : 0;
}

/** Save overview */
export const status: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    if (!u) {
      send?.json({ ok: false, message: 'No player data in the save yet (log into the game once)' });
      return;
    }
    const raw = u.raw && typeof u.raw === 'object' ? u.raw : {};
    send?.json({
      ok: true,
      usr_id: u.usr_id ?? 1,
      name: u.name ?? '',
      rank: u.rank ?? 0,
      exp: u.exp ?? 0,
      scores: Object.keys(u.scores || {}).length,
      persistent: countRawKeys(raw['usr_persistent_items']),
      rawNodes: Object.keys(raw).length,
    });
  } catch (e) {
    send?.json({ ok: false, message: 'Read failed: ' + e });
  }
};

/** Export the full save document (the frontend downloads it as JSON) */
export const exportSave: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    send?.json(u ?? {});
  } catch (e) {
    send?.json({ error: String(e) });
  }
};

/** Clear the persistent item table (takes effect on the next login) */
export const resetPersistent: WebUIEventHandler = async (data, send) => {
  try {
    const u = await DB.FindOne<any>({ usr_id: 1 });
    if (!u) {
      send?.json({ ok: false, message: 'Player data not found' });
      return;
    }
    const raw = u.raw && typeof u.raw === 'object' ? { ...u.raw } : {};
    delete raw['usr_persistent_items'];
    const result = await DB.Update<any>({ usr_id: 1 }, { $set: { raw } });
    if (!result || result.updated === 0) {
      send?.json({ ok: false, message: 'Nothing was updated (save document not found?)' });
      return;
    }
    enqueue('WebUI: persistent item table cleared\n');
    send?.json({ ok: true, message: 'Persistent item table cleared, takes effect on next login' });
  } catch (e) {
    send?.json({ ok: false, message: 'Clear failed: ' + e });
  }
};
