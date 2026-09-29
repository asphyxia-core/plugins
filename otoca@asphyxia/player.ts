// Creating players and dolls, and the per-player state the game only reads.
import { addCount } from './closet';
import { DOLL_INIT } from './data';
import { nextSeq } from './db';
import { Doll } from './models/doll';
import { User } from './models/user';
import { now, rand } from './utils';

export function newUser(user_seq: number, user_name: string): User {
  return {
    collection: 'user', user_seq, user_name, keycard_id: '', key_inquire_id: '',
    // shows the first-play powder message; with the first stamp card this makes the 2 kira cards
    // the wiki gives players without a key
    powder_num: 1,
    stamp_num: 0, stamp_conv_num: 0, stamp_bonus: 0, balance: 0, ticket_half_price: false,
    ticket_rc_first: true, // the first rival card print guarantees a higher rarity (wiki)
    equip: {}, material: {}, decoseal: {}, accessory: [], next_aseq: 1, cardbg: [],
    release_state: 0, user_flags: [0, 0, 0, 0], last_time: 0, user_marker: 0,
    mission_no: 1, // 0 would never start the missions
    question_id: 0, sort_type: 0, disp_skill: 0, enemy: [], last_enemy: [], friendly: {}, gifts_used: [],
  };
}

// Same as the game does locally: level 1, starting equips (grade 0), which also go into the closet.
export async function newDoll(u: User, doll_id: number, doll_name: string): Promise<Doll> {
  const init = DOLL_INIT[doll_id] || [0, 0, 0, 0];
  const doll: Doll = {
    collection: 'doll', doll_seq: await nextSeq('doll'), user_seq: u.user_seq, doll_id, doll_name,
    doll_seed: rand(23328), // growth type + 3 * five stat offsets in base 6; 23328 and up disables growth
    doll_level: 1, equip: init.map(id => [id, 0]), accessory: [0, 0], makeup: [0, 0], luck_offset: 0,
  };
  for (const id of init) addCount(u.equip, id, 0, 1);
  await DB.Insert(doll);
  return doll;
}

// "New doll" on the entry menu stays disabled while release_state is 0 (label disable_lv5).
export async function updateRelease(u: User) {
  const dolls = await DB.Find<Doll>({ collection: 'doll', user_seq: u.user_seq });
  if (dolls.some(d => d.doll_level >= 5)) u.release_state = 1;
}

// guess: 1 = played again within a day, 2 = back after two weeks, 0 = otherwise
export function greeting(last: number) {
  if (!last) return 0;
  const days = (now() - last) / 86400;
  return days < 1 ? 1 : days >= 14 ? 2 : 0;
}
