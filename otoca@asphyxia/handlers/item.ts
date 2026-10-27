// Closet changes: drops, discarding, selling, the tailor and the salon.
import { accessoryNode, EMPTY_ACCESSORY, giveItem, isAccessory, takeItem } from '../closet';
import { MAX_BALANCE, TEMP_ASEQ } from '../data';
import { getDoll, getUser, saveDoll, saveUser } from '../db';
import { Accessory } from '../models/user';
import { u32 } from '../utils';

export const addItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  // accessory[i] must line up with item[i]; rows that are not accessories stay zero
  const made = $(data).elements('item').map(i =>
    giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0)) || EMPTY_ACCESSORY);
  const gift = $(data).str('gift_code', '');
  // gift_type 4: the present for an offline card, which also gives one stamp (official notice)
  if ($(data).number('gift_type', 0) === 4 && gift && !u.gifts_used.includes(gift)) {
    u.gifts_used.push(gift);
    u.stamp_bonus++;
  }
  await saveUser(u);
  send.object({ accessory: made.map(accessoryNode) });
};

// item: what the player threw away (one row per piece). drop: this play's drops that are kept.
export const delItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const i of $(data).elements('drop')) giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0));
  for (const i of $(data).elements('item')) {
    await takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1);
  }
  await saveUser(u);
  send.success();
};

export const sellItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const items = $(data).elements('item');
  const soldTemp = items.map(i => i.number('accessory_seq', 0)).filter(s => s >= TEMP_ASEQ);
  // drops first (sell scene after a full closet): a dropped accessory sold right away comes back as TEMP_ASEQ + n
  const made: Accessory[] = [];
  $(data).elements('drop').forEach((i, n) => {
    const type = i.number('item_type', 0), id = i.number('item_id', 0), grade = i.number('item_grade', 0);
    if (isAccessory(type, id) && soldTemp.includes(TEMP_ASEQ + n)) return;
    const a = giveItem(u, type, id, grade);
    if (a) made.push(a);
  });
  for (const i of items) {
    const aseq = i.number('accessory_seq', 0);
    if (aseq >= TEMP_ASEQ) continue;
    await takeItem(u, aseq, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), i.number('item_num', 1));
  }
  // the game computes the balance after selling (prices from pricelist.csv) and never reads ours
  u.balance = Math.max(0, Math.min(MAX_BALANCE, $(data).number('balance', u.balance)));
  await saveUser(u);
  send.object({ balance: u32(u.balance), accessory: made.map(accessoryNode) });
};

export const composition: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const k of ['item_in_1', 'item_in_2']) {
    const i = $(data).element(k);
    if (i) await takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1);
  }
  const r = $(data).element('item_result');
  const made = r ? giveItem(u, r.number('item_type', 0), r.number('item_id', 0), r.number('item_grade', 0)) : null;
  await saveUser(u);
  send.object({ accessory: accessoryNode(made || EMPTY_ACCESSORY) });
};

export const setMakeup: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const d = await getDoll($(data).number('doll_seq'));
  if (!u || !d) return send.deny();
  d.makeup = [$(data).number('makeup.hair_color', 0), $(data).number('makeup.eye_color', 0)];
  // payment is only the last purchase; the game sends the balance after paying
  u.balance = Math.max(0, Math.min(MAX_BALANCE, $(data).number('balance', u.balance)));
  if ($(data).number('ticket_type', 0) === 1) u.ticket_half_price = false;
  await saveDoll(d);
  await saveUser(u);
  send.object({ balance: u32(u.balance) });
};
