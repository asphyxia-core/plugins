/*
 * 玩家存档的读写与设置项构建。
 *
 * 游戏端不保存任何玩家数据：档案、设置、成绩全以服务端 usr.get / usr.get_usr_music 为准。
 * 所以这里落库到插件的 xif@asphyxia.db：
 *   usr.save            -> 写档案（名字/等级/经验/设置/透传节点）
 *   usr.save_musicscore -> 合并成绩（取最好）
 *   usr.get             -> 读档案
 *   usr.get_usr_music   -> 读成绩
 */

import { enqueue } from './common';

export type XifUser = {
  usr_id: number;
  name: string;
  rank: number;
  exp: number;
  comment: string;
  tutorial: boolean;
  option: Record<string, any>;
  scores: Record<string, any>;   // key = `${musicId}_${grade}`（nedb 字段名不能含点）
  /** usr.save 里结构复杂、逐字段解析不划算的整段节点，原样存 / 原样回放 */
  raw: Record<string, any>;
};

/**
 * 这些节点直接透传：游戏上报什么就存什么，usr.get 再发回去。
 * 逐字段写死既容易漏（usr_deck 有 10 组卡、每张卡十几个属性），
 * 也会因为字段新增而失配 —— ea3 的 XML 结构本身就是稳定的交换格式。
 *
 * 注意：**存（RAW_KEYS）与回放是两件事**。之前 `usr_name_titles`、`usr_login_bonus`
 * 只写在 REPLAY_KEYS 里、却没在 RAW_KEYS 里，于是「想回放但从来没存过」——
 * 称号、登录奖励每次都退回静态数据，这就是「获得的称号下一局就没了」的根因。
 * 凡是要回放的节点，必须先进 RAW_KEYS。
 */
export const RAW_KEYS = [
  'usr_main_option',
  'usr_deck',
  'usr_nametag',
  'usr_play_info',
  'usr_sort_setting',
  'usr_privacy',
  'usr_music_mission',
  'usr_count',
  // usr_item_change_log：游戏退局上报的道具**变化日志**（不是完整快照 ——
  // 实测 usr.save 里根本没有 usr_item 节点）。商店购买/抽卡的道具要跨局保留，
  // 必须落库 —— usr.get 回放时与基础道具合并（日志里的 count 是变化量）。
  'usr_item_change_log',
  // ---- 以下 6 个节点同样只在 usr.save 里上报，之前完全没落库 ----
  // 称号持有（打包成 "id,id,..." 字符串，见 playerinfo PlayerNameTagTitleInventory）
  'usr_name_titles',
  // 角色卡实例：index / item_id / 经验 / 界限突破 / 收藏 / 获得时间
  // —— 不回放 = 抽到的卡、练过的卡每局打回出厂状态
  'usr_character_card',
  // 角色亲密度 / 摸头次数
  'usr_character',
  // 登录奖励进度（不回放 → 每次进游戏都重发每日奖励）
  'usr_login_bonus',
  // 聊天贴纸使用记录（贴纸「拥有」在 usr_item，这里是使用历史）
  'usr_chatstamp',
  // PA 技能：等级 / 历史记录 / 各谱面 skill
  'pa_skill',
];

/**
 * 纯透传回放的节点（游戏上报什么就原样发回去）。
 *
 * `usr_count` 是**必须**的：里面存着 Tutorial.Prologue / Tutorial.InGame / Tutorial.Home /
 * Tutorial.UnitSelect / Bonus.WelcomeMira 这些「已完成」标记。一旦不回放，游戏每次登录
 * 都当成新玩家，会强制重走新手教程（实测踩过）。
 *
 * `usr_nametag` / `usr_privacy` / `usr_sort_setting` / `usr_music_mission` 是
 * **「换了就重置」的那几个**：它们一直只存不回放，游戏端拿不到就回退默认值
 * （`CreatePlayerOption` 里 `NameTagTitle / NameTagPlate` 校验失败 → 强制 Default，
 * 所以显示的称号永远是「初めまして」）。
 *
 * 其余节点（称号 / 卡 / 登录奖励 / 道具 / action_count）需要与静态基线或持久表
 * **合并**后才能下发，逻辑在 playerdata.ts / character.ts，不放这里。
 */
export const REPLAY_KEYS: string[] = [
  'usr_count',
  'usr_chatstamp',
  'pa_skill',
  // 称号铭牌 / 铭牌底板 / 徽章 / 显示中的称号
  'usr_nametag',
  // 隐私（是否公开名字、商店、技能、排行）
  'usr_privacy',
  // 各列表的排序 / 筛选（选曲界面的音乐筛选位掩码 3617 就存在这里）
  'usr_sort_setting',
  // 谱面任务成就位掩码
  'usr_music_mission',
];

let userCache: XifUser | null = null;

function defaultUser(): XifUser {
  return {
    usr_id: 1,
    name: 'PLAYER',
    rank: 1,
    exp: 0,
    comment: 'Polaris Chord',
    tutorial: true,
    option: {},
    scores: {},
    raw: {},
  };
}

/** 默认设置项 + 存档里玩家改过的值（游戏只上报变化项，所以要 merge）
 *
 *  默认值取自 PlayerOption..cctor（game.common.playerinfo.dll）的实测量：
 *  HighSpeedInt=10（=1.0 倍，get_HighSpeed 里除以 10）、VolumeHeadPhone=10、
 *  其余音量 100。早期这里把 high_speed 写成 100，等于让没存过档的玩家一进游戏
 *  就被设成 **10 倍速** —— 这也是「流速怎么调都不对」的一部分原因。
 */
const DEFAULT_OPTION: Record<string, any> = {
  notes_design_type: 0,
  tap_se_type: 0,
  tap_effect_type: 0,
  right_fader_color: 0,
  left_fader_color: 0,
  chart_option: 0,
  high_speed: 10,
  notes_display_timing: 0,
  judge_timing: 0,
  judge_display_position: 0,
  display_fast_slow: 0,
  lane_alpha: 100,
  movie_brightness: 100,
  skill_cut_in: 1,
  is_voice_active: true,
  combo_special_display: 0,
  music_volume: 100,
  se_volume: 100,
  voice_volume: 100,
  out_game_music_volume: 100,
  out_game_se_volume: 100,
  out_game_voice_volume: 100,
  master_volume: 100,
  headphone_volume: 10,
  bass_shaker_volume: 100,
  force_open_prev_in_game_option: true,
  display_bar_line: 0,
};

/**
 * usr_main_option 的元素顺序，必须与 UsrMainOption 的字段声明顺序一致
 * （infra.dll: NotesDesignType … GeneralMovieId → bga_id）。
 * XmlSerializer 一旦带了 Order 就严格按序匹配，顺序错会让后面的元素整片丢弃、
 * 整个节点回退默认值 —— 表现就是「设置怎么改都不生效」。
 */
const OPTION_ORDER = [
  'notes_design_type', 'tap_se_type', 'tap_effect_type', 'right_fader_color', 'left_fader_color',
  'chart_option', 'high_speed', 'notes_display_timing', 'judge_timing', 'judge_display_position',
  'display_fast_slow', 'lane_alpha', 'movie_brightness', 'skill_cut_in', 'is_voice_active',
  'combo_special_display', 'music_volume', 'se_volume', 'voice_volume', 'out_game_music_volume',
  'out_game_se_volume', 'out_game_voice_volume', 'master_volume', 'headphone_volume',
  'bass_shaker_volume', 'force_open_prev_in_game_option', 'display_bar_line', 'bga_id',
];

/**
 * 这两个字段的类型是 **bool**（XrpcBool），不是 s32 —— 依据游戏自己 usr.save 上报的
 * `__type`。类型发错会让 XmlSerializer 在解析 usr_main_option 时抛异常，
 * **整个节点被丢弃回退默认值**（表现为流速恒 1.0、线宽/音量/音符样式全不生效）。
 * 所以这里不看值本身是 true 还是 1，一律按 bool 发。
 */
const BOOL_OPTION_KEYS = ['is_voice_active', 'force_open_prev_in_game_option'];
const STR_OPTION_KEYS = ['bga_id'];

/** 把存档里的值转成该字段的 XRPC 类型（bool / str / s32） */
function optionItem(typ: string, v: any): any {
  if (typ === 'bool') {
    const b = typeof v === 'boolean' ? v : Number(v) !== 0 && v !== 'false' && v !== '0';
    return K.ITEM('bool', b ? 1 : 0);
  }
  if (typ === 'str') return K.ITEM('str', String(v));
  const n = Number(v);
  return K.ITEM('s32', Number.isFinite(n) ? n : 0);
}

/**
 * 设置项输出。
 *
 * 结构（字段顺序 + `__type`）以 `raw.usr_main_option` 为准 —— 那是游戏自己 usr.save 上报的
 * 原始节点，类型 100% 可信；值则以 `option` 为准（玩家最新改动）。
 * 两者分离的原因：类型靠猜会出事，只要有一个字段类型不对（比如把 bool 发成 s32），
 * XmlSerializer 就抛异常，**整段设置静默回退默认值**，而游戏不会报任何错。
 */
export function buildMainOption(u: XifUser): any {
  const merged: Record<string, any> = { ...DEFAULT_OPTION, ...(u.option || {}) };

  let tpl: any = null;
  const s = u.raw && u.raw['usr_main_option'];
  if (typeof s === 'string') {
    try {
      tpl = JSON.parse(s);
    } catch (e) {
      tpl = null;
    }
  } else if (s && typeof s === 'object') {
    tpl = s;
  }

  const tplKeys = tpl ? Object.keys(tpl).filter((k) => k !== '@attr') : [];
  const keys = (tplKeys.length ? tplKeys : OPTION_ORDER)
    .filter((k) => k in merged || (tpl && tpl[k]))
    .concat(Object.keys(merged).filter((k) => !(tplKeys.length ? tplKeys : OPTION_ORDER).includes(k)));

  const out: any = {};
  for (const k of keys) {
    // 类型优先取游戏上报的 __type，其次按已知名单猜
    let typ: string = 's32';
    const t = tpl && tpl[k];
    const fromTpl = t && t['@attr'] && t['@attr']['__type'];
    if (fromTpl) typ = String(fromTpl);
    else if (BOOL_OPTION_KEYS.includes(k)) typ = 'bool';
    else if (STR_OPTION_KEYS.includes(k)) typ = 'str';

    let v = merged[k];
    // option 里没有、但游戏上报过 → 用上报值，避免丢字段
    if (v === undefined && t && t['@content'] !== undefined) {
      const c = t['@content'];
      v = Array.isArray(c) ? c[0] : c;
    }
    if (v === undefined) continue;
    out[k] = optionItem(typ, v);
  }
  return out;
}

/**
 * 读档失败标记。DB 读不出来时若拿空档顶替、又回写，会把玩家真实存档覆盖成白板
 * —— 这是「存档莫名清空」最典型的成因，所以一旦读失败就进入只读保护。
 */
let loadFailed = false;

export async function loadUser(): Promise<XifUser> {
  if (userCache) return userCache;
  let doc: any = null;
  try {
    doc = await DB.FindOne<any>({ usr_id: 1 });
  } catch (e) {
    loadFailed = true;
    enqueue('!! loadUser failed (进入只读保护，不再写库): ' + e + '\n');
  }
  userCache = doc ? { ...defaultUser(), ...doc } : defaultUser();
  if (!userCache.raw || typeof userCache.raw !== 'object') userCache.raw = {};
  return userCache as XifUser;
}

export async function saveUser(u: XifUser): Promise<void> {
  if (loadFailed) {
    enqueue('!! saveUser 跳过：初始读档失败，拒绝覆盖已有存档\n');
    return;
  }
  userCache = u;
  try {
    await DB.Upsert<any>({ usr_id: 1 }, { $set: { ...(u as any) } });
  } catch (e) {
    enqueue('!! saveUser failed: ' + e + '\n');
  }
}

/** 取出存成 JSON 串的透传节点 */
export function rawNode(u: XifUser, key: string): any {
  const v = u.raw && u.raw[key];
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch (e) {
      enqueue(`!! raw ${key} 还原失败: ${e}\n`);
      return undefined;
    }
  }
  return v && typeof v === 'object' ? v : undefined;
}

/**
 * 取 raw 里的**纯数据**节点（不是 XML 节点）。
 *
 * 与 rawNode 的区别：这里的存储值可能是「JSON 字符串」也可能是「已经解析好的对象」
 * —— 取决于它是哪一版代码写进去的。**不能再对 rawNode 的结果做一次 JSON.parse**：
 * JSON.parse 收到对象时会把对象转成 "[object Object]" 再解析，必然抛 SyntaxError，
 * 一旦这个异常被 catch 吞掉，整张持久表就被当成空表 —— 这正是
 * 「持久道具表里明明有数据，登录时却一件都不下发」的根因（bug 在 mergePersistentItems）。
 */
export function rawData<T>(u: XifUser, key: string, fallback: T): T {
  const v = u.raw && u.raw[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch (e) {
      enqueue(`!! raw ${key} 还原失败: ${e}\n`);
      return fallback;
    }
  }
  return typeof v === 'object' ? (v as T) : fallback;
}

/** raw 里的字符串数组（如 usr_item_log_applied），越界自动截断 */
function readUuidList(u: XifUser, key: string): string[] {
  const v = rawData<string[]>(u, key, []);
  return Array.isArray(v) ? v.map(String) : [];
}

/** 变化日志去重：同一个 uuid 只应用一次（usr.save 一局可能被调用多次，日志会被重发） */
const UUID_KEEP = 4000;
function uuidSeen(set: Set<string>, uuid: string): boolean {
  if (!uuid) return false;
  if (set.has(uuid)) return true;
  set.add(uuid);
  if (set.size > UUID_KEEP) {
    const arr = Array.from(set).slice(set.size - UUID_KEEP);
    set.clear();
    for (const x of arr) set.add(x);
  }
  return false;
}

/** 取 XML 叶子节点的裸值（@content 永远是数组） */
function leafValue(node: any): any {
  const c = node?.['@content'];
  const v = Array.isArray(c) ? c[0] : c;
  return v;
}

/**
 * 把游戏上报的道具变化日志累加进持久道具表（跨局累计）。
 * money.* 是货币不走道具表。
 * 每条日志带 uuid，重复上报的同一条要跳过 —— 否则每局多存一次，数值会滚雪球。
 */
export function accumulateItemChangeLog(u: XifUser, changeLog: any): void {
  if (!changeLog || typeof changeLog !== 'object') return;
  try {
    const logs: any[] = Array.isArray(changeLog.item)
      ? changeLog.item
      : (changeLog.item ? [changeLog.item] : []);
    if (logs.length === 0) return;

    const persistent = rawData<Record<string, number>>(u, 'usr_persistent_items', {});
    const applied = new Set(readUuidList(u, 'usr_item_log_applied'));

    let changed = 0;
    let skipped = 0;
    for (const it of logs) {
      const uuid = String(leafValue(it?.uuid) ?? '');
      if (uuidSeen(applied, uuid)) {
        skipped += 1;
        continue;
      }
      const id = String(leafValue(it?.item_id) ?? '');
      if (!id || id.startsWith('money.')) continue;
      const n = Number(leafValue(it?.change_count) ?? 0);
      if (!Number.isFinite(n) || n === 0) continue;
      persistent[id] = (persistent[id] || 0) + n;
      changed += 1;
    }
    u.raw['usr_item_log_applied'] = JSON.stringify(Array.from(applied));
    if (changed > 0) {
      u.raw['usr_persistent_items'] = JSON.stringify(persistent);
      enqueue(`persistent_items 累计 ${changed} 条变化（重复跳过 ${skipped}）\n`);
    }
  } catch (e) {
    enqueue(`!! persistent_items 处理失败: ${e}\n`);
  }
}

/**
 * 把 action count 变化日志累加进持久表。
 * 响应里的 `usr_action_count`（key/count）是**总量**，游戏只上报增量，
 * 所以服务端必须自己累加 —— 这也是 PA 任务/称号条件的一部分。
 */
export function accumulateActionCountLog(u: XifUser, changeLog: any): void {
  if (!changeLog || typeof changeLog !== 'object') return;
  try {
    const logs: any[] = Array.isArray(changeLog.action_log)
      ? changeLog.action_log
      : (changeLog.action_log ? [changeLog.action_log] : []);
    if (logs.length === 0) return;

    const counts = rawData<Record<string, number>>(u, 'usr_persistent_action_count', {});
    const applied = new Set(readUuidList(u, 'usr_action_log_applied'));

    let changed = 0;
    for (const it of logs) {
      const uuid = String(leafValue(it?.uuid) ?? '');
      if (uuidSeen(applied, uuid)) continue;
      const key = String(leafValue(it?.key) ?? '');
      if (!key) continue;
      const n = Number(leafValue(it?.change_count) ?? 0);
      if (!Number.isFinite(n) || n === 0) continue;
      counts[key] = (counts[key] || 0) + n;
      changed += 1;
    }
    u.raw['usr_action_log_applied'] = JSON.stringify(Array.from(applied));
    if (changed > 0) {
      u.raw['usr_persistent_action_count'] = JSON.stringify(counts);
      enqueue(`persistent_action_count 累计 ${changed} 条变化\n`);
    }
  } catch (e) {
    enqueue(`!! persistent_action_count 处理失败: ${e}\n`);
  }
}

/** 持久 action count → 响应里的 usr_action_count 节点（key/count） */
export function buildActionCountNode(u: XifUser): any | null {
  const counts = rawData<Record<string, number>>(u, 'usr_persistent_action_count', {});
  const keys = Object.keys(counts).filter((k) => Number.isFinite(counts[k]));
  if (keys.length === 0) return null;
  return K.ATTR({}, {
    action_count: keys.map((k) => K.ATTR({}, {
      key: K.ITEM('str', k),
      count: K.ITEM('s32', counts[k]),
    })),
  });
}

/** 持久道具表（正数部分） */
export function persistentItemDeltas(u: XifUser): Record<string, number> {
  const all = rawData<Record<string, number>>(u, 'usr_persistent_items', {});
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(all)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

/**
 * 把持久道具表合并进本次下发的 usr_item。
 * 基础道具同 id 的 count 加上累计值，基础没有的作为新道具追加。
 */
export function mergePersistentItems(items: any[], u: XifUser): void {
  const deltas = Object.entries(persistentItemDeltas(u));
  if (deltas.length === 0) return;
  const deltaMap: Record<string, number> = {};
  for (const [id, n] of deltas) deltaMap[id] = n;

  const idOf = (it: any) => String(leafValue(it?.item_id) ?? '');
  const cntOf = (it: any) => Number(leafValue(it?.count) ?? 0);
  const setCnt = (it: any, n: number) => {
    const node = it.count;
    if (node && typeof node === 'object') {
      if (Array.isArray(node['@content'])) node['@content'][0] = n;
      else node['@content'] = [n];
    }
  };

  const applied = new Set<string>();
  for (const it of items) {
    const id = idOf(it);
    const p = deltaMap[id];
    if (!p || p <= 0) continue;
    setCnt(it, cntOf(it) + p);
    applied.add(id);
  }
  for (const [id, p] of deltas) {
    if (applied.has(id) || p <= 0) continue;
    items.push(K.ATTR({}, {
      item_id: K.ITEM('str', id),
      count: K.ITEM('s32', p),
      income: K.ITEM('s32', p),
      expense: K.ITEM('s32', 0),
    }));
  }
}

/* ---------------- 抽卡结果落库 ---------------- */

/** 抽到的卡实例（纯数据，序列化进 u.raw.usr_extra_cards） */
export type ExtraCard = {
  index: string;
  item_id: string;
  card_limit_over_count: number;
  character_card_exp: number;
  character_card_skill_exp: number;
  is_favorite: boolean;
  source: number;
  created_at: string;
};

function newGuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // 兜底：手写 v4
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
    else if (i === 14) s += '4';
    else if (i === 19) s += hex[(Math.random() * 4) | 8];
    else s += hex[(Math.random() * 16) | 0];
  }
  return s;
}

export function readExtraCards(u: XifUser): ExtraCard[] {
  const v = rawData<ExtraCard[]>(u, 'usr_extra_cards', []);
  return Array.isArray(v) ? v.filter((c) => c && c.index && c.item_id) : [];
}

/**
 * 抽卡临时卡实例的清理。
 *
 * `usr_extra_cards` 只装「本次会话抽到、游戏还没上报过」的卡。等下一次 usr.save
 * 把 `usr_character_card` 报上来，这些卡就进了正式存档，临时表里的条目可以删掉
 * —— 否则每抽一次就永久多一条，raw 会无限膨胀。
 */
export function pruneExtraCards(u: XifUser): void {
  const extras = readExtraCards(u);
  if (extras.length === 0) return;
  const raw = rawNode(u, 'usr_character_card');
  const list = raw?.card === undefined || raw?.card === null
    ? []
    : Array.isArray(raw.card) ? raw.card : [raw.card];
  const saved = new Set<string>();
  for (const c of list) {
    const idx = String(leafValue(c?.index) ?? '');
    if (idx) saved.add(idx);
  }
  const keep = extras.filter((c) => !saved.has(c.index));
  if (keep.length !== extras.length) {
    u.raw['usr_extra_cards'] = JSON.stringify(keep);
    enqueue(`usr_extra_cards: 已并入正式存档 ${extras.length - keep.length} 张，剩 ${keep.length} 张\n`);
  }
}

/**
 * 记一次抽卡结果：数量进持久道具表（跨局保留），卡再额外生成一个卡实例。
 * 卡实例单独存 `usr_extra_cards`，因为这些卡是在**本次会话**里拿到的，
 * 游戏还没机会在 usr.save 里把它们报回来；下一次 usr.save 之后它们会进
 * `usr_character_card`，届时按 index 去重即可，不会重复。
 */
export function recordDrawnItem(u: XifUser, itemId: string): ExtraCard | null {
  const id = String(itemId || '');
  if (!id) return null;
  const persistent = rawData<Record<string, number>>(u, 'usr_persistent_items', {});
  if (!id.startsWith('money.')) {
    persistent[id] = (persistent[id] || 0) + 1;
    u.raw['usr_persistent_items'] = JSON.stringify(persistent);
  }
  if (!id.startsWith('chara_card.')) return null;

  const card: ExtraCard = {
    index: newGuid(),
    item_id: id,
    card_limit_over_count: 0,
    character_card_exp: 0,
    character_card_skill_exp: 0,
    is_favorite: false,
    source: 0,
    created_at: new Date().toISOString().replace(/\.\d+Z$/, '.0000000Z'),
  };
  const list = readExtraCards(u);
  list.push(card);
  u.raw['usr_extra_cards'] = JSON.stringify(list);
  enqueue(`抽到角色卡 ${id} 已生成卡实例 ${card.index}\n`);
  return card;
}
