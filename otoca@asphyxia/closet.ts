// The player's closet: equips, materials, deco seals and accessories, and their response nodes.
import { ACCESSORY_IDS, ACCESSORY_OFFSET } from './data';
import { saveDoll } from './db';
import { Doll } from './models/doll';
import { Accessory, User } from './models/user';
import { log, rand, u8, u32 } from './utils';

export const isAccessory = (type: number, id: number) =>
  type === 0 && ACCESSORY_IDS.some(([a, b]) => id >= a && id <= b);

export function addCount(bag: { [id: string]: number[] }, id: number, grade: number, n: number) {
  if (!id || grade > 2) return;
  const gr = bag[id] || [0, 0, 0];
  gr[grade] = Math.max(0, gr[grade] + n);
  if (gr.some(c => c > 0)) bag[id] = gr;
  else delete bag[id];
}

export function makeAccessory(u: User, id: number, grade: number): Accessory {
  const gr = Math.min(grade, 2);
  const a = { aseq: u.next_aseq++, id, gr, offset: ACCESSORY_OFFSET[gr].map(([lo, hi]) => lo + rand(hi - lo + 1)) };
  u.accessory.push(a);
  return a;
}

// item_type 0 equip (kind 4 = accessory), 1 material, 2 decoseal. Returns the accessory made, if any.
export function giveItem(u: User, type: number, id: number, grade: number): Accessory | null {
  if (isAccessory(type, id)) return makeAccessory(u, id, grade);
  if (type === 0) addCount(u.equip, id, grade, 1);
  else if (type === 1) addCount(u.material, id, grade, 1);
  else if (type === 2 && id) u.decoseal[id] = (u.decoseal[id] || 0) + 1;
  else log(`unknown item type=${type} id=${id} grade=${grade}`, {});
  return null;
}

async function removeAccessory(u: User, aseq: number) {
  u.accessory = u.accessory.filter(a => a.aseq !== aseq);
  // the game also takes a removed accessory off the doll wearing it
  for (const d of await DB.Find<Doll>({ collection: 'doll', user_seq: u.user_seq })) {
    if (d.accessory.includes(aseq)) {
      d.accessory = d.accessory.map(s => (s === aseq ? 0 : s));
      await saveDoll(d);
    }
  }
}

export async function takeItem(u: User, aseq: number, type: number, id: number, grade: number, n: number) {
  if (aseq) await removeAccessory(u, aseq);
  else if (type === 0) addCount(u.equip, id, grade, -n);
  else if (type === 1) addCount(u.material, id, grade, -n);
}

export const EMPTY_ACCESSORY: Accessory = { aseq: 0, id: 0, gr: 0, offset: [0, 0, 0, 0] };
export const accessoryNode = (a: Accessory) => ({
  accessory_seq: u32(a.aseq), equip_id: u32(a.id), equip_grade: u8(a.gr),
  param_offset: u8(a.offset[0]), skill_offset_1: u8(a.offset[1]),
  skill_offset_2: u8(a.offset[2]), skill_offset_3: u8(a.offset[3]),
});

// compact form (getCardInfo ver="1"): one <i> per id, gr[g] = count of grade g, -1 = none
export const gradeList = (bag: { [id: string]: number[] }) =>
  Object.keys(bag).map(id => ({ id: u32(+id), gr: K.ARRAY('s16', bag[id].map(c => (c > 0 ? c : -1))) }));

// The game counts accessories in the equip list as well (AddAccessory adds to both).
export function equipWithAccessories(u: User) {
  const bag: { [id: string]: number[] } = {};
  for (const id of Object.keys(u.equip)) bag[id] = u.equip[id].slice();
  for (const a of u.accessory) addCount(bag, a.id, a.gr, 1);
  return bag;
}
