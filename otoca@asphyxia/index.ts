// otoca d'or (NCG). The XRPC module "game" (service "local") is implemented by the game's ealocal.dll;
// field names, types and limits follow its psmap tables, and every value below follows how game.dll
// uses it (see README). Values marked "guess" are server policy the game code does not decide.

interface Accessory {
  aseq: number;
  id: number;
  gr: number;
  offset: number[]; // param_offset, skill_offset_1..3 (percent of the equip's base values)
}

interface User {
  collection: 'user';
  user_seq: number;
  user_name: string;
  keycard_id: string;
  key_inquire_id: string;
  powder_num: number;
  stamp_num: number;
  stamp_conv_num: number;
  balance: number;
  ticket_half_price: boolean;
  ticket_rc_first: boolean;
  equip: { [id: string]: number[] }; // count per grade 0..2, accessories not included
  material: { [id: string]: number[] };
  decoseal: { [id: string]: number };
  accessory: Accessory[];
  next_aseq: number;
  cardbg: number[];
  release_state: number;
  user_flags: number[];
  last_time: number;
  user_marker: number;
  mission_no: number;
  question_id: number;
  sort_type: number;
  disp_skill: number;
  enemy: number[][]; // [team, level] of every team/level beaten
  last_enemy: number[][]; // [episode, team, level], newest first
  friendly: { [team: string]: number };
  gifts_used: string[];
}

interface Doll {
  collection: 'doll';
  doll_seq: number;
  user_seq: number;
  doll_id: number;
  doll_name: string;
  doll_seed: number;
  doll_level: number;
  equip: number[][]; // 4 slots [equip_id, grade]: weapon, top, bottom, shoes
  accessory: number[]; // 2 slots of accessory_seq, 0 = empty
  makeup: number[]; // hair_color, eye_color
  luck_offset: number;
}

interface Card {
  collection: 'card';
  otocard_id: string;
  inquire_id: string;
  user_seq: number;
  doll_seq: number;
  kira_type: number;
  kira: number[]; // hp, atk, mat, spd bonus printed on this card
  decoseal_id: number;
  from_otocard_id: string;
  created: number;
}

interface Counter {
  collection: 'counter';
  name: string;
  value: number;
}

// versiondata.csv: base 5-2, newest 5-11. getCardInfo's version is applied the same way, so both send this.
const EPISODE = 5;
const PHASE = 11;
// Alphabet of the ids the game packs into its QR codes (5 bits per char).
const ID_CHARS = '0123456789ABCDEFGHJKLMNPRSTUWXYZ';
// equipdata.csv rows with kind 4 (accessories): they carry an accessory_seq.
const ACCESSORY_IDS: number[][] = [
  [41, 52], [144, 203], [206, 212], [293, 347], [351, 356], [360, 361], [365, 366],
  [470, 531], [535, 536], [584, 609], [619, 626], [648, 664], [696, 720], [731, 740],
];
// dollinitdata.csv: starting equips (weapon, top, bottom, shoes) per doll_id.
const DOLL_INIT: { [doll_id: number]: number[] } = {
  1: [9, 18, 29, 40], 2: [9, 20, 31, 40], 3: [9, 17, 28, 40],
  4: [9, 19, 30, 40], 5: [9, 21, 32, 40], 6: [9, 409, 438, 40],
};
// guess: the game only multiplies by these; this matches normal equips of the same grade.
const ACCESSORY_OFFSET = [[80, 100, 100, 0], [90, 100, 100, 50], [100, 100, 100, 100]];
const TEMP_ASEQ = 1000000000; // the game's own placeholder seqs for this play's drops (sell scene)
const MAX_BALANCE = 9999999;

const now = () => Math.floor(Date.now() / 1000);
const rand = (n: number) => Math.floor(Math.random() * n);
const u8 = (v: number) => K.ITEM('u8', v || 0);
const u32 = (v: number) => K.ITEM('u32', v || 0);
const bool = (v: boolean) => K.ITEM('bool', !!v);
const isAccessory = (type: number, id: number) =>
  type === 0 && ACCESSORY_IDS.some(([a, b]) => id >= a && id <= b);

function log(method: string, data: any) {
  console.log(`[otoca] ${method} ${JSON.stringify(data)}`);
}

async function nextSeq(name: string) {
  const c = await DB.FindOne<Counter>({ collection: 'counter', name });
  const value = (c ? c.value : 0) + 1;
  await DB.Upsert<Counter>({ collection: 'counter', name }, { $set: { value } });
  return value;
}

// ponytail: random ids with a uniqueness check, fine for a home server's card count.
async function newId() {
  for (;;) {
    let id = '';
    for (let i = 0; i < 8; i++) id += ID_CHARS[rand(ID_CHARS.length)];
    if (id === '00000000') continue;
    const used = (await DB.Count<Card>({ collection: 'card', otocard_id: id })) +
      (await DB.Count<User>({ collection: 'user', keycard_id: id }));
    if (!used) return id;
  }
}

const getUser = (user_seq: number) => DB.FindOne<User>({ collection: 'user', user_seq });
const getDoll = (doll_seq: number) => DB.FindOne<Doll>({ collection: 'doll', doll_seq });

async function save(key: object, doc: object) {
  const { _id, ...rest } = doc as any;
  await DB.Update(key, { $set: rest });
}
const saveUser = (u: User) => save({ collection: 'user', user_seq: u.user_seq }, u);
const saveDoll = (d: Doll) => save({ collection: 'doll', doll_seq: d.doll_seq }, d);

// ---- closet ----------------------------------------------------------------

function addCount(bag: { [id: string]: number[] }, id: number, grade: number, n: number) {
  if (!id || grade > 2) return;
  const gr = bag[id] || [0, 0, 0];
  gr[grade] = Math.max(0, gr[grade] + n);
  if (gr.some(c => c > 0)) bag[id] = gr;
  else delete bag[id];
}

function makeAccessory(u: User, id: number, grade: number): Accessory {
  const gr = Math.min(grade, 2);
  const a = { aseq: u.next_aseq++, id, gr, offset: ACCESSORY_OFFSET[gr].slice() };
  u.accessory.push(a);
  return a;
}

// item_type 0 equip (kind 4 = accessory), 1 material, 2 decoseal. Returns the accessory made, if any.
function giveItem(u: User, type: number, id: number, grade: number): Accessory | null {
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

async function takeItem(u: User, aseq: number, type: number, id: number, grade: number, n: number) {
  if (aseq) await removeAccessory(u, aseq);
  else if (type === 0) addCount(u.equip, id, grade, -n);
  else if (type === 1) addCount(u.material, id, grade, -n);
}

const EMPTY_ACCESSORY: Accessory = { aseq: 0, id: 0, gr: 0, offset: [0, 0, 0, 0] };
const accessoryNode = (a: Accessory) => ({
  accessory_seq: u32(a.aseq), equip_id: u32(a.id), equip_grade: u8(a.gr),
  param_offset: u8(a.offset[0]), skill_offset_1: u8(a.offset[1]),
  skill_offset_2: u8(a.offset[2]), skill_offset_3: u8(a.offset[3]),
});

// compact form (getCardInfo ver="1"): one <i> per id, gr[g] = count of grade g, -1 = none
const gradeList = (bag: { [id: string]: number[] }) =>
  Object.keys(bag).map(id => ({ id: u32(+id), gr: K.ARRAY('s16', bag[id].map(c => (c > 0 ? c : -1))) }));

// The game counts accessories in the equip list as well (AddAccessory adds to both).
function equipWithAccessories(u: User) {
  const bag: { [id: string]: number[] } = {};
  for (const id of Object.keys(u.equip)) bag[id] = u.equip[id].slice();
  for (const a of u.accessory) addCount(bag, a.id, a.gr, 1);
  return bag;
}

// ---- users and dolls -------------------------------------------------------

function newUser(user_seq: number, user_name: string): User {
  return {
    collection: 'user', user_seq, user_name, keycard_id: '', key_inquire_id: '',
    powder_num: 1, // guess: non-zero shows the first-play powder message
    stamp_num: 0, stamp_conv_num: 0, balance: 0, ticket_half_price: false,
    ticket_rc_first: true, // guess: first rival card ticket for new players
    equip: {}, material: {}, decoseal: {}, accessory: [], next_aseq: 1, cardbg: [],
    release_state: 0, user_flags: [0, 0, 0, 0], last_time: 0, user_marker: 0,
    mission_no: 1, // 0 would never start the missions
    question_id: 0, sort_type: 0, disp_skill: 0, enemy: [], last_enemy: [], friendly: {}, gifts_used: [],
  };
}

// Same as the game does locally: level 1, starting equips (grade 0), which also go into the closet.
async function newDoll(u: User, doll_id: number, doll_name: string): Promise<Doll> {
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
async function updateRelease(u: User) {
  const dolls = await DB.Find<Doll>({ collection: 'doll', user_seq: u.user_seq });
  if (dolls.some(d => d.doll_level >= 5)) u.release_state = 1;
}

// guess: 1 = played again within a day, 2 = back after two weeks, 0 = otherwise
function greeting(last: number) {
  if (!last) return 0;
  const days = (now() - last) / 86400;
  return days < 1 ? 1 : days >= 14 ? 2 : 0;
}

// ---- handlers --------------------------------------------------------------

const getVersion: EPR = async (info, data, send) => {
  const limited = U.GetConfig('limited_enemy') ? 1 : 0;
  send.object({
    expire: u32(600),
    episode: u8(EPISODE),
    phase: u8(PHASE),
    marker: u8(U.GetConfig('marker')),
    campaign: {
      trial_play: bool(false),
      trial_shop: bool(false),
      starkira_free: bool(U.GetConfig('starkira_free')),
      stamp_double: bool(U.GetConfig('stamp_double')),
      limited_enemy: K.ARRAY('bool', [0, 0, limited, 0, 0, 0, 0, 0]), // only slot 2 has an enemy (team 63)
    },
    question: { id: u8(0), reward: { type: u8(0), id: u32(0), grade: u8(0) } },
  });
};

const addUser: EPR = async (info, data, send) => {
  const u = newUser(await nextSeq('user'), $(data).str('user_name', ''));
  const d = await newDoll(u, $(data).number('doll_id', 0), $(data).str('doll_name', ''));
  await DB.Insert(u);
  send.object({
    user_seq: u32(u.user_seq),
    doll_seq: u32(d.doll_seq),
    doll_seed: u32(d.doll_seed),
    powder_num: u32(u.powder_num),
    stamp_num: u32(u.stamp_num),
    mission_no: u8(u.mission_no),
    question_id: u8(u.question_id),
    ticket_rc_first: bool(u.ticket_rc_first),
  });
};

const addDoll: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const d = await newDoll(u, $(data).number('doll_id', 0), $(data).str('doll_name', ''));
  await saveUser(u);
  send.object({ doll_seq: u32(d.doll_seq), doll_seed: u32(d.doll_seed) });
};

const getCardInfo: EPR = async (info, data, send) => {
  const otocard_id = $(data).str('otocard_id', '');
  const card = await DB.FindOne<Card>({ collection: 'card', otocard_id });
  const u = card && (await getUser(card.user_seq));
  const d = card && (await getDoll(card.doll_seq));
  if (!u || !d) {
    // status 1: the game plays offline with what the QR holds
    log(`getCardInfo: unknown card ${otocard_id}`, {});
    return send.deny();
  }
  const worn = d.accessory.map(s => u.accessory.find(a => a.aseq === s) || EMPTY_ACCESSORY);
  send.object({
    user_seq: u32(u.user_seq),
    user_name: K.ITEM('str', u.user_name),
    doll_seq: u32(d.doll_seq),
    doll_id: u32(d.doll_id),
    doll_name: K.ITEM('str', d.doll_name),
    doll_level: u32(d.doll_level),
    doll_seed: u32(d.doll_seed),
    locked: bool(!!u.keycard_id), // tied to a key card: reads the key next, closet limit 999
    luck_offset: u32(d.luck_offset),
    equip: [...d.equip, ...worn.map(a => [a.id, a.gr])].map(e => ({ equip_id: u32(e[0]), equip_grade: u8(e[1]) })),
    accessory: worn.map(accessoryNode),
    score: {
      release_state: u32(u.release_state),
      stamp_conv_num: u32(u.stamp_conv_num),
      user_flags: K.ARRAY('u8', u.user_flags),
      last_time: K.ITEM('time', u.last_time),
      curr_time: K.ITEM('time', now()),
      greeting_level: u8(greeting(u.last_time)),
      user_marker: u8(u.user_marker),
      mission_no: u8(u.mission_no),
      setting: { sort_type: u8(u.sort_type), disp_skill: u8(u.disp_skill) },
      question_id: u8(u.question_id),
      enemy: u.enemy.map(e => ({ enemy_team_id: u32(e[0]), enemy_team_level: u32(e[1]) })),
      last_enemy: u.last_enemy.map(e => ({ episode: u8(e[0]), enemy_team_id: u32(e[1]), enemy_team_level: u32(e[2]) })),
      enemy_detail: { i: Object.keys(u.friendly).map(t => ({ id: K.ITEM('u16', +t), pt: u32(u.friendly[t]) })) },
    },
    // the bonus printed on this card; the game applies it to one battle
    offset: { kira_hp: u8(card.kira[0]), kira_atk: u8(card.kira[1]), kira_mat: u8(card.kira[2]), kira_spd: u8(card.kira[3]) },
    active_key: bool(!!u.keycard_id),
    version: { episode: u8(EPISODE), phase: u8(PHASE) },
    makeup: { hair_color: u8(d.makeup[0]), eye_color: u8(d.makeup[1]) },
    closet: {
      powder_num: u32(u.powder_num),
      stamp_num: u32(u.stamp_num),
      wallet: {
        balance: u32(u.balance),
        ticket_half_price: bool(u.ticket_half_price),
        ticket_rc_first: bool(u.ticket_rc_first),
      },
      equip: { i: gradeList(equipWithAccessories(u)) },
      material: { i: gradeList(u.material) },
      decoseal: Object.keys(u.decoseal).slice(0, 1).map(id => ({ decoseal_id: u32(+id), decoseal_num: u32(u.decoseal[id]) })),
      accessory: {
        i: u.accessory.map(a => ({ aseq: u32(a.aseq), id: u32(a.id), gr: u8(a.gr), offset: K.ARRAY('u8', a.offset) })),
      },
      cardbg: u.cardbg.slice(0, 4).map(id => ({ id: u8(id) })),
    },
  });
};

const checkKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const keycard_id = $(data).str('keycard_id', '');
  if (!u || !u.keycard_id || u.keycard_id !== keycard_id) {
    log('checkKeyUser: not this user\'s key', { keycard_id, bound: u && u.keycard_id });
    return send.status(10); // the game shows "key does not match" and lets the player rescan
  }
  send.object({ keycard_id: K.ITEM('str', u.keycard_id), key_inquire_id: K.ITEM('str', u.key_inquire_id) });
};

// A new key replaces the old one (first key or "remake"). The id goes into the key card's QR.
const bindKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.keycard_id = await newId();
  u.key_inquire_id = await newId();
  await saveUser(u);
  send.object({
    keycard_id: K.ITEM('str', u.keycard_id),
    key_inquire_id: K.ITEM('str', u.key_inquire_id),
    accessory: accessoryNode(EMPTY_ACCESSORY), // guess: the first-key bonus item is unknown, so none
  });
};

const setCardInfo: EPR = async (info, data, send) => {
  const d = await getDoll($(data).number('doll_seq'));
  const u = d && (await getUser(d.user_seq));
  if (!u || !d) return send.deny();
  d.doll_level = Math.max(1, Math.min(31, $(data).number('doll_level', d.doll_level)));
  d.doll_name = $(data).str('doll_name', d.doll_name);
  d.equip = $(data).elements('equip').slice(0, 4).map(e => [e.number('equip_id', 0), e.number('equip_grade', 0)]);
  d.accessory = ($(data).numbers('accessory_seq') || []).concat([0, 0]).slice(0, 2);
  await saveDoll(d);

  // kira_type 0 normal, 1 star, 2 gold, 3 star while starkira_free is on
  const kira_type = $(data).number('kira_type', 0);
  const kira = [0, 0, 0, 0];
  // guess: the real distribution is unknown; values must stay 0-9 (one digit on the card)
  const star = kira_type === 1 || kira_type === 3;
  const slots = kira_type === 2 ? [0, 1, 2, 3] : star ? [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 2) : [];
  for (const k of slots) kira[k] = kira_type === 2 ? 1 + rand(5) : 1 + rand(3);
  if (kira_type === 1) u.powder_num = Math.max(0, u.powder_num - 1); // the game spends one star powder locally
  const decoseal_id = $(data).number('decoseal_id', 0);
  if (decoseal_id && u.decoseal[decoseal_id]) u.decoseal[decoseal_id]--; // guess: nothing else reports it
  await updateRelease(u);
  await saveUser(u);

  const card: Card = {
    collection: 'card', otocard_id: await newId(), inquire_id: await newId(), user_seq: u.user_seq,
    doll_seq: d.doll_seq, kira_type, kira, decoseal_id, from_otocard_id: $(data).str('otocard_id', ''), created: now(),
  };
  await DB.Insert(card);
  log('setCardInfo', { otocard_id: card.otocard_id, kira_type, kira });
  send.object({
    otocard_id: K.ITEM('str', card.otocard_id),
    inquire_id: K.ITEM('str', card.inquire_id),
    offset: { kira_hp: u8(kira[0]), kira_atk: u8(kira[1]), kira_mat: u8(kira[2]), kira_spd: u8(kira[3]) },
  });
};

const report: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.success();
  const b = $(data).element('battle');
  if (b) {
    const team = b.number('enemy_team_id', 0);
    const level = b.number('enemy_team_level', 0);
    const episode = b.number('episode', 0);
    // battle_result 0 win, 1 lose, 2 draw; the game adds a beaten pair to score/enemy only on a win
    if (team && b.number('battle_result', 1) === 0 && u.enemy.length < 200 &&
        !u.enemy.some(e => e[0] === team && e[1] === level)) u.enemy.push([team, level]);
    if (team) u.last_enemy = [[episode, team, level], ...u.last_enemy.filter(e => e[0] !== episode)].slice(0, 6);
  }
  u.user_flags = $(data).numbers('user_flags', u.user_flags);
  u.user_marker = $(data).number('user_marker', u.user_marker);
  u.sort_type = $(data).number('setting.sort_type', u.sort_type);
  u.disp_skill = $(data).number('setting.disp_skill', u.disp_skill);
  u.last_time = now();
  const d = await getDoll($(data).number('doll_seq'));
  if (d && d.user_seq === u.user_seq) {
    d.doll_level = Math.max(1, Math.min(31, $(data).number('doll_level', d.doll_level)));
    await saveDoll(d);
  }
  await updateRelease(u);
  await saveUser(u);
  send.success();
};

// Only gold and friend points: doll levels are raised by the game itself.
const addExp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.balance = Math.min(MAX_BALANCE, u.balance + $(data).number('gold.add_amount', 0));
  const team = $(data).number('friendly.enemy_team_id', 0);
  if (team) u.friendly[team] = (u.friendly[team] || 0) + $(data).number('friendly.add_point', 0);
  await saveUser(u);
  send.object({ balance: u32(u.balance), friend_point: u32(team ? u.friendly[team] : 0) });
};

const addItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  // accessory[i] must line up with item[i]; rows that are not accessories stay zero
  const made = $(data).elements('item').map(i =>
    giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0)) || EMPTY_ACCESSORY);
  const gift = $(data).str('gift_code', '');
  if ($(data).number('gift_type', 0) === 4 && gift && !u.gifts_used.includes(gift)) u.gifts_used.push(gift);
  await saveUser(u);
  send.object({ accessory: made.map(accessoryNode) });
};

// item: what the player threw away (one row per piece). drop: this play's drops that are kept.
const delItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const i of $(data).elements('drop')) giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0));
  for (const i of $(data).elements('item')) {
    await takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1);
  }
  await saveUser(u);
  send.success();
};

const sellItem: EPR = async (info, data, send) => {
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

const composition: EPR = async (info, data, send) => {
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

const setMakeup: EPR = async (info, data, send) => {
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

// The stamp card has 10 squares; a full card turns into star powder.
const addStamp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const after = u.stamp_num + (U.GetConfig('stamp_double') ? 2 : 1); // guess: one stamp per play
  const full = Math.floor(after / 10);
  u.stamp_num = after % 10;
  u.powder_num += full; // guess: one powder per full card
  u.stamp_conv_num += full;
  await saveUser(u);
  send.object({
    powder_num: u32(u.powder_num),
    stamp_num: u32(u.stamp_num),
    stamp_conv_rate: u32(10), // squares per card; the game divides by it
    stamp_after_num: u32(after),
  });
};

const reportMission: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const n = $(data).number('mission_no', 0);
  if (u && u.mission_no === n) {
    u.mission_no = Math.min(n + 1, 9); // the game treats every mission below mission_no as done
    await saveUser(u);
  }
  send.success();
};

// score/question_id is the questionnaire still to show; no questionnaires are offered, so it stays 0.
const reportQuestion: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (u) {
    u.question_id = 0;
    await saveUser(u);
  }
  send.success();
};

// Gift QRs: only type 4 (the offline card the game prints when setCardInfo fails) is honoured.
// The apology gift itself is taken later by addItem with gift_type 4. Past campaigns answer 5 (expired).
const receiveGift: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const gift = $(data).element('info');
  const type = gift ? gift.number('gift_type', 0) : 0;
  const code = gift ? gift.str('gift_code', '') : '';
  const status = type !== 4 ? 5 : u && u.gifts_used.includes(code) ? 2 : 1;
  send.object({
    powder_num: u32(u ? u.powder_num : 0), // always overwrites the game's count
    status: [{ gift_type: u8(type), gift_status: u8(status) }],
  });
};

const receiveItem: EPR = async (info, data, send) => {
  send.object({ gift_type: u8(7), gift_status: u8(5) });
};

// The game spends ticket_rc_first itself when a rival card is chosen and tells nobody else.
const setRivalCard: EPR = async (info, data, send) => {
  const card = await DB.FindOne<Card>({ collection: 'card', otocard_id: $(data).str('otocard_id', '') });
  const u = card && (await getUser(card.user_seq));
  if (u && u.ticket_rc_first) {
    u.ticket_rc_first = false;
    await saveUser(u);
  }
  send.success();
};

export function register() {
  R.GameCode('NCG');
  R.Contributor('iamsub');

  R.Config('marker', {
    name: 'Version marker',
    desc: 'Unlocks hair/eye colours in the salon and mode-select tips (the game checks 1-8).',
    type: 'integer',
    default: 8,
    range: [0, 255],
  });
  R.Config('limited_enemy', {
    name: 'Limited-time enemy',
    desc: 'Show the limited-time enemy (あい / ぷっちコンテスト, episode 3).',
    type: 'boolean',
    default: false,
  });
  R.Config('stamp_double', {
    name: 'Double stamps',
    desc: 'Two stamps per play, with the campaign icon on the title screen.',
    type: 'boolean',
    default: false,
  });
  R.Config('starkira_free', {
    name: 'Free star kira',
    desc: 'Star kira cards need no star powder.',
    type: 'boolean',
    default: false,
  });

  R.Route('game.getVersion', getVersion);
  R.Route('game.addUser', addUser);
  R.Route('game.addDoll', addDoll);
  R.Route('game.getCardInfo', getCardInfo);
  R.Route('game.checkKeyUser', checkKeyUser);
  R.Route('game.bindKeyUser', bindKeyUser);
  R.Route('game.copyKeyCard', true);
  R.Route('game.cancel', true);
  R.Route('game.setCardInfo', setCardInfo);
  R.Route('game.report', report);
  R.Route('game.addExp', addExp);
  R.Route('game.addItem', addItem);
  R.Route('game.delItem', delItem);
  R.Route('game.sellItem', sellItem);
  R.Route('game.composition', composition);
  R.Route('game.setMakeup', setMakeup);
  R.Route('game.addStamp', addStamp);
  R.Route('game.reportMission', reportMission);
  R.Route('game.reportQuestion', reportQuestion);
  R.Route('game.reportTrial', true);
  R.Route('game.receiveGift', receiveGift);
  R.Route('game.receiveItem', receiveItem);
  R.Route('game.checkRivalCard', true);
  R.Route('game.setRivalCard', setRivalCard);

  R.Unhandled(async (info, data, send) => {
    console.error(`[otoca] unhandled ${info.module}.${info.method}: ${JSON.stringify(data)}`);
    send.success();
  });
}
