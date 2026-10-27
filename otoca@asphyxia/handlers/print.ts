// Printing doll cards and rival cards.
import { EMPTY_ACCESSORY } from '../closet';
import { getCard, getDoll, getUser, newId, saveDoll, saveUser } from '../db';
import { Card } from '../models/card';
import { updateRelease } from '../player';
import { log, now, rand, u8 } from '../utils';

export const setCardInfo: EPR = async (info, data, send) => {
  const d = await getDoll($(data).number('doll_seq'));
  const u = d && (await getUser(d.user_seq));
  if (!u || !d) return send.deny();
  d.doll_level = Math.max(1, Math.min(31, $(data).number('doll_level', d.doll_level)));
  d.doll_name = $(data).str('doll_name', d.doll_name);
  d.equip = $(data).elements('equip').slice(0, 4).map(e => [e.number('equip_id', 0), e.number('equip_grade', 0)]);
  d.accessory = ($(data).numbers('accessory_seq') || []).concat([0, 0]).slice(0, 2);
  await saveDoll(d);

  // kira_type 0 normal, 1 star, 2 gold, 3 star while starkira_free is on.
  // A kira card gives +1 to 1-3 random stats (wiki); the card shows each as one digit.
  const kira_type = $(data).number('kira_type', 0);
  const kira = [0, 0, 0, 0];
  if (kira_type) for (const k of [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 1 + rand(3))) kira[k] = 1;
  if (kira_type === 1) u.powder_num = Math.max(0, u.powder_num - 1); // the game spends one star powder locally
  const decoseal_id = $(data).number('decoseal_id', 0);
  if (decoseal_id && u.decoseal[decoseal_id]) u.decoseal[decoseal_id]--; // guess: nothing else reports it
  await updateRelease(u);
  await saveUser(u);

  // Snapshot the worn accessories. One sold since comes from the card this play started with.
  const from_otocard_id = $(data).str('otocard_id', '');
  const from = from_otocard_id ? await getCard(from_otocard_id) : null;
  const accessory = d.accessory.map(s => (s && (u.accessory.find(a => a.aseq === s) ||
    (from && from.accessory.find(a => a.aseq === s)))) || EMPTY_ACCESSORY);
  const card: Card = {
    collection: 'card', otocard_id: await newId(), inquire_id: await newId(), user_seq: u.user_seq,
    doll_seq: d.doll_seq, kira_type, kira, equip: d.equip, accessory, decoseal_id, from_otocard_id, created: now(),
  };
  await DB.Insert(card);
  log('setCardInfo', { otocard_id: card.otocard_id, kira_type, kira });
  send.object({
    otocard_id: K.ITEM('str', card.otocard_id),
    inquire_id: K.ITEM('str', card.inquire_id),
    offset: { kira_hp: u8(kira[0]), kira_atk: u8(kira[1]), kira_mat: u8(kira[2]), kira_spd: u8(kira[3]) },
  });
};

// The game spends ticket_rc_first itself when a rival card is chosen and tells nobody else.
export const setRivalCard: EPR = async (info, data, send) => {
  const card = await getCard($(data).str('otocard_id', ''));
  const u = card && (await getUser(card.user_seq));
  if (u && u.ticket_rc_first) {
    u.ticket_rc_first = false;
    await saveUser(u);
  }
  send.success();
};
