// The key card (ニャンドラのカギ): a second printed card tied to the player.
import { accessoryNode, EMPTY_ACCESSORY, makeAccessory } from '../closet';
import { FIRST_KEY_ACCESSORY } from '../data';
import { getUser, newId, saveUser } from '../db';
import { log } from '../utils';

export const checkKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const keycard_id = $(data).str('keycard_id', '');
  if (!u || !u.keycard_id || u.keycard_id !== keycard_id) {
    log('checkKeyUser: not this user\'s key', { keycard_id, bound: u && u.keycard_id });
    return send.status(10); // the game shows "key does not match" and lets the player rescan
  }
  send.object({ keycard_id: K.ITEM('str', u.keycard_id), key_inquire_id: K.ITEM('str', u.key_inquire_id) });
};

// A new key replaces the old one (first key or "remake"). The id goes into the key card's QR.
export const bindKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.keycard_id = await newId();
  u.key_inquire_id = await newId();
  // the first key comes with the tailor tutorial's result; the game adds it only when is_first is set
  const bonus = $(data).bool('is_first') ? makeAccessory(u, FIRST_KEY_ACCESSORY, 0) : EMPTY_ACCESSORY;
  await saveUser(u);
  send.object({
    keycard_id: K.ITEM('str', u.keycard_id),
    key_inquire_id: K.ITEM('str', u.key_inquire_id),
    accessory: accessoryNode(bonus),
  });
};
