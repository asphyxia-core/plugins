// otoca d'or (NCG). The XRPC module "game" (service "local") is implemented by the game's ealocal.dll;
// field names, types and limits follow its psmap tables (see README).

interface Accessory {
  aseq: number;
  id: number;
  gr: number;
  offset: number[]; // param_offset, skill_offset_1..3
}

interface User {
  collection: 'user';
  user_seq: number;
  user_name: string;
  keycard_id: string;
  key_inquire_id: string;
  powder_num: number;
  stamp_num: number;
  balance: number;
  ticket_half_price: boolean;
  ticket_rc_first: boolean;
  equip: { [id: string]: number[] }; // count per grade 0..2
  material: { [id: string]: number[] };
  accessory: Accessory[];
  next_aseq: number;
  cardbg: number[];
  enemy: number[][]; // [enemy_team_id, enemy_team_level] of every team/level beaten
  last_enemy: { [episode: string]: number[] }; // [enemy_team_id, enemy_team_level]
  friendly: { [team: string]: number }; // enemy_team_id -> friend point
  release_state: number;
  stamp_conv_num: number;
  user_flags: number[];
  last_time: number;
  greeting_level: number;
  user_marker: number;
  mission_no: number;
  question_id: number;
  sort_type: number;
  disp_skill: number;
}

interface Doll {
  collection: 'doll';
  doll_seq: number;
  user_seq: number;
  doll_id: number;
  doll_name: string;
  doll_seed: number;
  doll_level: number;
  is_frank: boolean;
  equip: number[][]; // [equip_id, equip_grade]
  accessory: number[]; // accessory_seq
  kira: number[]; // hp, atk, mat, spd
  makeup: number[]; // hair_color, eye_color
}

interface Card {
  collection: 'card';
  otocard_id: string;
  inquire_id: string;
  user_seq: number;
  doll_seq: number;
  kira_type: number;
  created: number;
}

interface Counter {
  collection: 'counter';
  name: string;
  value: number;
}

// Game side clamps episode/phase to its own newest (FUN_101227c0), so a large value means "latest".
const EPISODE = 99;
const PHASE = 99;
// Alphabet of the ids the game packs into its QR codes (5 bits per char).
const ID_CHARS = '0123456789ABCDEFGHJKLMNPRSTUWXYZ';

const now = () => Math.floor(Date.now() / 1000);
const randU32 = () => Math.floor(Math.random() * 0xffffffff);
const u8 = (v: number) => K.ITEM('u8', v || 0);
const u32 = (v: number) => K.ITEM('u32', v || 0);

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
    for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    if (id === '00000000') continue;
    const used = (await DB.Count<Card>({ collection: 'card', otocard_id: id })) +
      (await DB.Count<User>({ collection: 'user', keycard_id: id }));
    if (!used) return id;
  }
}

function newUser(user_seq: number, user_name: string): User {
  return {
    collection: 'user', user_seq, user_name, keycard_id: '', key_inquire_id: '',
    powder_num: 0, stamp_num: 0, balance: 0, ticket_half_price: false, ticket_rc_first: false,
    equip: {}, material: {}, accessory: [], next_aseq: 1, cardbg: [],
    enemy: [], last_enemy: {}, friendly: {}, release_state: 0, stamp_conv_num: 0, user_flags: [0, 0, 0, 0],
    last_time: 0, greeting_level: 0, user_marker: 0, mission_no: 0, question_id: 0, sort_type: 0, disp_skill: 0,
  };
}

async function newDoll(user_seq: number, doll_id: number, doll_name: string, is_frank: boolean): Promise<Doll> {
  const doll: Doll = {
    collection: 'doll', doll_seq: await nextSeq('doll'), user_seq, doll_id, doll_name, doll_seed: randU32(),
    doll_level: 1, is_frank, equip: [], accessory: [], kira: [0, 0, 0, 0], makeup: [0, 0],
  };
  await DB.Insert(doll);
  return doll;
}

const getUser = (user_seq: number) => DB.FindOne<User>({ collection: 'user', user_seq });
const getDoll = (doll_seq: number) => DB.FindOne<Doll>({ collection: 'doll', doll_seq });

async function save<T extends { collection: string }>(key: object, doc: T) {
  const { _id, ...rest } = doc as any;
  await DB.Update(key, { $set: rest });
}
const saveUser = (u: User) => save({ collection: 'user', user_seq: u.user_seq }, u);
const saveDoll = (d: Doll) => save({ collection: 'doll', doll_seq: d.doll_seq }, d);

function log(method: string, data: any) {
  console.log(`[otoca] ${method} ${JSON.stringify(data)}`);
}

// ---- closet ----------------------------------------------------------------

// item_type 0 = equip (accessories are equips with their own accessory_seq), 1 = material.
// ponytail: other item types are only logged until their meaning is seen in real traffic.
function giveItem(u: User, type: number, id: number, grade: number, n: number, isAcc: boolean, made: Accessory[]) {
  if (type === 0 && isAcc) {
    // ponytail: offsets 0 (no random bonus) until the real ranges are known.
    const a = { aseq: u.next_aseq++, id, gr: grade, offset: [0, 0, 0, 0] };
    u.accessory.push(a);
    made.push(a);
    return;
  }
  const bag = type === 0 ? u.equip : type === 1 ? u.material : null;
  if (!bag || grade > 2) return log(`unknown item type=${type} id=${id} grade=${grade}`, n);
  const gr = bag[id] || [0, 0, 0];
  gr[grade] = Math.max(0, gr[grade] + n);
  if (gr.some(c => c > 0)) bag[id] = gr;
  else delete bag[id];
}

function takeItem(u: User, aseq: number, type: number, id: number, grade: number, n: number) {
  if (aseq) u.accessory = u.accessory.filter(a => a.aseq !== aseq);
  else giveItem(u, type, id, grade, -n, false, []);
}

const accessoryNode = (a: Accessory) => ({
  accessory_seq: u32(a.aseq), equip_id: u32(a.id), equip_grade: u8(a.gr),
  param_offset: u8(a.offset[0]), skill_offset_1: u8(a.offset[1]),
  skill_offset_2: u8(a.offset[2]), skill_offset_3: u8(a.offset[3]),
});

// compact form (getCardInfo ver="1"): one <i> per id, gr[g] = count of grade g, -1 = none
const gradeList = (bag: { [id: string]: number[] }) =>
  Object.keys(bag).map(id => ({ id: u32(+id), gr: K.ARRAY('s16', bag[id].map(c => (c > 0 ? c : -1))) }));

// ---- handlers --------------------------------------------------------------

const getVersion: EPR = async (info, data, send) => {
  const limited = U.GetConfig('limited_enemy') ? 1 : 0;
  send.object({
    expire: u32(600),
    episode: u8(EPISODE),
    phase: u8(PHASE),
    marker: u8(U.GetConfig('marker')),
    campaign: {
      trial_play: K.ITEM('bool', false),
      trial_shop: K.ITEM('bool', false),
      starkira_free: K.ITEM('bool', false),
      stamp_double: K.ITEM('bool', false),
      limited_enemy: K.ARRAY('bool', [limited, limited, limited, limited, limited, limited, limited, limited]),
    },
    question: { id: u8(0), reward: { type: u8(0), id: u32(0), grade: u8(0) } },
  });
};

const addUser: EPR = async (info, data, send) => {
  const user = newUser(await nextSeq('user'), $(data).str('user_name', ''));
  user.last_time = now();
  await DB.Insert(user);
  const doll = await newDoll(user.user_seq, $(data).number('doll_id', 0), $(data).str('doll_name', ''), $(data).bool('is_frank'));
  send.object({
    user_seq: u32(user.user_seq),
    doll_seq: u32(doll.doll_seq),
    doll_seed: u32(doll.doll_seed),
    powder_num: u32(user.powder_num),
    stamp_num: u32(user.stamp_num),
    mission_no: u8(user.mission_no),
    question_id: u8(user.question_id),
    ticket_rc_first: K.ITEM('bool', user.ticket_rc_first),
  });
};

const addDoll: EPR = async (info, data, send) => {
  const doll = await newDoll($(data).number('user_seq'), $(data).number('doll_id', 0), $(data).str('doll_name', ''), false);
  send.object({ doll_seq: u32(doll.doll_seq), doll_seed: u32(doll.doll_seed) });
};

const getCardInfo: EPR = async (info, data, send) => {
  const otocard_id = $(data).str('otocard_id', '');
  const card = await DB.FindOne<Card>({ collection: 'card', otocard_id });
  const user = card && (await getUser(card.user_seq));
  const doll = card && (await getDoll(card.doll_seq));
  if (!user || !doll) {
    log(`getCardInfo: unknown card ${otocard_id}`, {});
    return send.deny();
  }
  const accessories = doll.accessory.map(s => user.accessory.find(a => a.aseq === s)).filter(a => a);
  send.object({
    user_seq: u32(user.user_seq),
    user_name: K.ITEM('str', user.user_name),
    doll_seq: u32(doll.doll_seq),
    doll_id: u32(doll.doll_id),
    doll_name: K.ITEM('str', doll.doll_name),
    doll_level: u32(doll.doll_level),
    doll_seed: u32(doll.doll_seed),
    locked: K.ITEM('bool', false),
    luck_offset: u32(0),
    equip: doll.equip.map(e => ({ equip_id: u32(e[0]), equip_grade: u8(e[1]) })),
    accessory: accessories.map(accessoryNode),
    score: {
      release_state: u32(user.release_state),
      stamp_conv_num: u32(user.stamp_conv_num),
      user_flags: K.ARRAY('u8', user.user_flags),
      last_time: K.ITEM('time', user.last_time),
      curr_time: K.ITEM('time', now()),
      greeting_level: u8(user.greeting_level),
      user_marker: u8(user.user_marker),
      mission_no: u8(user.mission_no),
      setting: { sort_type: u8(user.sort_type), disp_skill: u8(user.disp_skill) },
      question_id: u8(user.question_id),
      enemy: user.enemy.map(e => ({ enemy_team_id: u32(e[0]), enemy_team_level: u32(e[1]) })),
      last_enemy: Object.keys(user.last_enemy).map(ep => ({
        episode: u8(+ep), enemy_team_id: u32(user.last_enemy[ep][0]), enemy_team_level: u32(user.last_enemy[ep][1]),
      })),
      enemy_detail: { i: Object.keys(user.friendly).map(t => ({ id: K.ITEM('u16', +t), pt: u32(user.friendly[t]) })) },
    },
    offset: { kira_hp: u8(doll.kira[0]), kira_atk: u8(doll.kira[1]), kira_mat: u8(doll.kira[2]), kira_spd: u8(doll.kira[3]) },
    active_key: K.ITEM('bool', !!user.keycard_id),
    version: { episode: u8(EPISODE), phase: u8(PHASE) },
    makeup: { hair_color: u8(doll.makeup[0]), eye_color: u8(doll.makeup[1]) },
    closet: {
      powder_num: u32(user.powder_num),
      stamp_num: u32(user.stamp_num),
      wallet: {
        balance: u32(user.balance),
        ticket_half_price: K.ITEM('bool', user.ticket_half_price),
        ticket_rc_first: K.ITEM('bool', user.ticket_rc_first),
      },
      equip: { i: gradeList(user.equip) },
      material: { i: gradeList(user.material) },
      accessory: {
        i: user.accessory.map(a => ({ aseq: u32(a.aseq), id: u32(a.id), gr: u8(a.gr), offset: K.ARRAY('u8', a.offset) })),
      },
      cardbg: user.cardbg.map(id => ({ id: u8(id) })),
    },
  });
};

const setCardInfo: EPR = async (info, data, send) => {
  const d = await getDoll($(data).number('doll_seq'));
  if (!d) return send.deny();
  d.doll_level = $(data).number('doll_level', d.doll_level);
  d.doll_id = $(data).number('doll_id', d.doll_id);
  d.doll_name = $(data).str('doll_name', d.doll_name);
  d.equip = $(data).elements('equip').map(e => [e.number('equip_id', 0), e.number('equip_grade', 0)]).filter(e => e[0]);
  d.accessory = ($(data).numbers('accessory_seq') || []).filter(s => s);
  await saveDoll(d);
  const card: Card = {
    collection: 'card', otocard_id: await newId(), inquire_id: await newId(), user_seq: d.user_seq,
    doll_seq: d.doll_seq, kira_type: $(data).number('kira_type', 0), created: now(),
  };
  await DB.Insert(card);
  log('setCardInfo', { from: $(data).str('otocard_id'), to: card.otocard_id, kira_type: card.kira_type });
  send.object({
    otocard_id: K.ITEM('str', card.otocard_id),
    inquire_id: K.ITEM('str', card.inquire_id),
    offset: { kira_hp: u8(d.kira[0]), kira_atk: u8(d.kira[1]), kira_mat: u8(d.kira[2]), kira_spd: u8(d.kira[3]) },
  });
};

const report: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const b = $(data).element('battle');
  log('report', { battle: b && b.obj, user_marker: $(data).number('user_marker') });
  if (b) {
    const team = b.number('enemy_team_id', 0);
    const level = b.number('enemy_team_level', 0);
    // battle_result 0 = win: the game itself appends the pair to score/enemy only then (game.dll FUN_100bb1d0)
    const beaten = u.enemy.some(e => e[0] === team && e[1] === level);
    if (team && b.number('battle_result') === 0 && !beaten && u.enemy.length < 200) u.enemy.push([team, level]);
    if (team) u.last_enemy[b.number('episode', 0)] = [team, level];
  }
  u.user_flags = $(data).numbers('user_flags', u.user_flags);
  u.user_marker = $(data).number('user_marker', u.user_marker);
  u.sort_type = $(data).number('setting.sort_type', u.sort_type);
  u.disp_skill = $(data).number('setting.disp_skill', u.disp_skill);
  u.last_time = now();
  await saveUser(u);
  const d = await getDoll($(data).number('doll_seq'));
  if (d) {
    d.doll_level = $(data).number('doll_level', d.doll_level);
    await saveDoll(d);
  }
  send.success();
};

const addExp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.balance += $(data).number('gold.add_amount', 0);
  const team = $(data).number('friendly.enemy_team_id', 0);
  if (team) u.friendly[team] = (u.friendly[team] || 0) + $(data).number('friendly.add_point', 0);
  await saveUser(u);
  send.object({ balance: u32(u.balance), friend_point: u32(team ? u.friendly[team] : 0) });
};

const addGold: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.balance += $(data).number('add_amount', 0);
  await saveUser(u);
  send.object({ balance: u32(u.balance) });
};

const addItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const made: Accessory[] = [];
  for (const i of $(data).elements('item')) {
    giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1, i.bool('is_accessory'), made);
  }
  await saveUser(u);
  send.object({ accessory: made.map(accessoryNode) });
};

const delItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const i of $(data).elements('item')) {
    takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1);
  }
  log('delItem drop (not added)', $(data).elements('drop').map(e => e.obj));
  await saveUser(u);
  send.success();
};

const sellItem: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const i of $(data).elements('item')) {
    const n = i.number('item_num', 1);
    takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), n);
    u.balance += i.number('price', 0) * n;
  }
  const made: Accessory[] = [];
  for (const i of $(data).elements('drop')) {
    giveItem(u, i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1, i.bool('is_accessory'), made);
  }
  log('sellItem', { client_balance: $(data).number('balance'), balance: u.balance });
  await saveUser(u);
  send.object({ accessory: made.map(accessoryNode), balance: u32(u.balance) });
};

const composition: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  for (const k of ['item_in_1', 'item_in_2']) {
    const i = $(data).element(k);
    if (i) takeItem(u, i.number('accessory_seq', 0), i.number('item_type', 0), i.number('item_id', 0), i.number('item_grade', 0), 1);
  }
  const r = $(data).element('item_result');
  const made: Accessory[] = [];
  if (r) giveItem(u, r.number('item_type', 0), r.number('item_id', 0), r.number('item_grade', 0), 1, r.bool('accessory_flag'), made);
  await saveUser(u);
  send.object({ accessory: accessoryNode(made[0] || { aseq: 0, id: 0, gr: 0, offset: [0, 0, 0, 0] }) });
};

const addStamp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  log('addStamp', data);
  const before = u.stamp_num;
  u.stamp_num += 1;
  await saveUser(u);
  send.object({
    powder_num: u32(u.powder_num), stamp_num: u32(before), stamp_after_num: u32(u.stamp_num), stamp_conv_rate: u32(0),
  });
};

const setMakeup: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const d = await getDoll($(data).number('doll_seq'));
  if (!u || !d) return send.deny();
  d.makeup = [$(data).number('makeup.hair_color', 0), $(data).number('makeup.eye_color', 0)];
  u.balance = Math.max(0, u.balance - $(data).number('payment', 0));
  log('setMakeup', { client_balance: $(data).number('balance'), balance: u.balance, ticket: $(data).number('ticket_type') });
  await saveDoll(d);
  await saveUser(u);
  send.object({ balance: u32(u.balance) });
};

// No gift codes on this server: every code is answered with status 0.
const receiveGift: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  log('receiveGift', data);
  send.object({
    status: $(data).elements('info').map(i => ({ gift_type: u8(i.number('gift_type', 0)), gift_status: u8(0) })),
    powder_num: u32(u ? u.powder_num : 0),
  });
};

const receiveItem: EPR = async (info, data, send) => {
  log('receiveItem', data);
  send.object({ gift_type: u8($(data).number('gift_type', 0)), gift_status: u8(0) });
};

const setUserField = (field: 'mission_no' | 'question_id'): EPR => async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (u) {
    u[field] = $(data).number(field, u[field]);
    await saveUser(u);
  }
  send.success();
};

const bindKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.keycard_id = await newId();
  u.key_inquire_id = await newId();
  await saveUser(u);
  send.object({
    keycard_id: K.ITEM('str', u.keycard_id),
    key_inquire_id: K.ITEM('str', u.key_inquire_id),
    accessory: accessoryNode({ aseq: 0, id: 0, gr: 0, offset: [0, 0, 0, 0] }),
  });
};

const checkKeyUser: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  log('checkKeyUser', { scanned: $(data).str('keycard_id'), bound: u.keycard_id });
  send.object({ keycard_id: K.ITEM('str', u.keycard_id), key_inquire_id: K.ITEM('str', u.key_inquire_id) });
};

const logOnly = (method: string): EPR => async (info, data, send) => {
  log(method, data);
  send.success();
};

export function register() {
  R.GameCode('NCG');
  R.Contributor('iamsub');

  R.Config('marker', {
    name: 'Version marker',
    desc: 'Unlock step sent in game.getVersion (the game checks 1-8).',
    type: 'integer',
    default: 8,
    range: [0, 255],
  });
  R.Config('limited_enemy', {
    name: 'Limited-time enemies',
    desc: 'Turn on all 8 limited-time enemy slots.',
    type: 'boolean',
    default: false,
  });

  R.Route('game.getVersion', getVersion);
  R.Route('game.addUser', addUser);
  R.Route('game.addDoll', addDoll);
  R.Route('game.getCardInfo', getCardInfo);
  R.Route('game.setCardInfo', setCardInfo);
  R.Route('game.report', report);
  R.Route('game.addExp', addExp);
  R.Route('game.addGold', addGold);
  R.Route('game.addItem', addItem);
  R.Route('game.delItem', delItem);
  R.Route('game.sellItem', sellItem);
  R.Route('game.composition', composition);
  R.Route('game.addStamp', addStamp);
  R.Route('game.setMakeup', setMakeup);
  R.Route('game.receiveGift', receiveGift);
  R.Route('game.receiveItem', receiveItem);
  R.Route('game.reportMission', setUserField('mission_no'));
  R.Route('game.reportQuestion', setUserField('question_id'));
  R.Route('game.bindKeyUser', bindKeyUser);
  R.Route('game.checkKeyUser', checkKeyUser);
  R.Route('game.copyKeyCard', logOnly('copyKeyCard'));
  R.Route('game.checkRivalCard', logOnly('checkRivalCard'));
  R.Route('game.setRivalCard', logOnly('setRivalCard'));
  R.Route('game.reportTrial', true);
  R.Route('game.cancel', true);

  R.Unhandled(async (info, data, send) => {
    console.error(`[otoca] unhandled ${info.module}.${info.method}: ${JSON.stringify(data)}`);
    send.success();
  });
}
