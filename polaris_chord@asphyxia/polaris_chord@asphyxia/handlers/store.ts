/*
 * Reading and writing player saves, and building the settings nodes.
 *
 * The game client stores no player data at all: profile, settings and scores all come from the
 * server via usr.get / usr.get_usr_music.
 * So here everything is persisted into the plugin's xif@asphyxia.db:
 *   usr.save            -> write the profile (name / rank / exp / settings / passthrough nodes)
 *   usr.save_musicscore -> merge scores (keep the best)
 *   usr.get             -> read the profile
 *   usr.get_usr_music   -> read the scores
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
  scores: Record<string, any>;   // key = `${musicId}_${grade}` (nedb fields cannot contain dots)
  /** A whole node from usr.save whose structure is too complex to parse field by field and not
   *  worth it: stored as-is / replayed as-is */
  raw: Record<string, any>;
};

/**
 * These nodes are passed straight through: whatever the game reports is stored, and usr.get
 * sends it back. Writing every field out by hand is both easy to get wrong (usr_deck has 10
 * deck groups and every card has a dozen-plus attributes) and breaks whenever a field is added
 * — the ea3 XML structure is itself a stable interchange format.
 *
 * Note: **storing (RAW_KEYS) and replaying are two separate things**. Previously
 * `usr_name_titles` and `usr_login_bonus` were only listed in REPLAY_KEYS and were missing from
 * RAW_KEYS, so they were "wanted for replay but never stored" — titles and login bonuses fell
 * back to the static data every time, which is the root cause of "the title I earned is gone
 * next session". Any node that is to be replayed must first be in RAW_KEYS.
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
  // usr_item_change_log: the item **change log** the game reports when leaving a session (not a
  // full snapshot — measured: usr.save contains no usr_item node at all). Items bought in the
  // shop / drawn from gacha must survive across sessions, so they must be persisted — usr.get
  // merges them with the base items on replay (count in the log is the delta).
  'usr_item_change_log',
  // ---- the following 6 nodes are likewise only reported in usr.save and were never persisted ----
  // Title ownership (packed into an "id,id,..." string, see playerinfo PlayerNameTagTitleInventory)
  'usr_name_titles',
  // Character card instances: index / item_id / exp / limit break / favorite / obtained time
  // — not replaying them = drawn cards and levelled cards revert to factory state every session
  'usr_character_card',
  // Character intimacy / head-pat count
  'usr_character',
  // Login bonus progress (no replay -> the daily bonus is handed out again on every game start)
  'usr_login_bonus',
  // Chat sticker usage record (sticker "ownership" lives in usr_item, this is the usage history)
  'usr_chatstamp',
  // PA skills: level / history / the skill of each chart
  'pa_skill',
];

/**
 * Nodes that are replayed as pure passthrough (whatever the game reported is sent back as-is).
 *
 * `usr_count` is **mandatory**: it holds the "already completed" flags for Tutorial.Prologue /
 * Tutorial.InGame / Tutorial.Home / Tutorial.UnitSelect / Bonus.WelcomeMira. Once it is not
 * replayed, the game treats every login as a new player and forces the tutorial to be replayed
 * again (measured, we ran into this).
 *
 * `usr_nametag` / `usr_privacy` / `usr_sort_setting` / `usr_music_mission` are the
 * **"changed, therefore reset" ones**: they were only ever stored and never replayed, so the
 * client could not get them and fell back to the defaults
 * (`NameTagTitle / NameTagPlate` validation in `CreatePlayerOption` fails -> forced Default,
 * which is why the displayed title is always "初めまして").
 *
 * The remaining nodes (titles / cards / login bonus / items / action_count) can only be sent
 * after being **merged** with the static baseline or a persistent table; that logic lives in
 * playerdata.ts / character.ts, not here.
 */
export const REPLAY_KEYS: string[] = [
  'usr_count',
  'usr_chatstamp',
  'pa_skill',
  // title plate / name plate background / badge / currently displayed title
  'usr_nametag',
  // privacy (whether name, shop, skills, ranking are public)
  'usr_privacy',
  // sorting / filtering of each list (the music filter bitmask 3617 on the song select screen
  // is stored here)
  'usr_sort_setting',
  // chart mission achievement bitmask
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

/** Default settings plus the values the player changed in the save (the game only reports the
 *  entries that changed, so a merge is required)
 *
 *  The defaults are the measured values from PlayerOption..cctor (game.common.playerinfo.dll):
 *  HighSpeedInt=10 (= 1.0x, get_HighSpeed divides by 10), VolumeHeadPhone=10, all other volumes
 *  100. Earlier this code had high_speed set to 100, which put any player without a save at
 *  **10x speed** the moment they started the game — part of why "no matter how I adjust the
 *  note speed it is wrong".
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
 * The element order of usr_main_option, which must match the declaration order of the fields of
 * UsrMainOption (infra.dll: NotesDesignType … GeneralMovieId -> bga_id).
 * Once XmlSerializer has an Order it matches strictly in sequence; a wrong order makes all the
 * following elements be dropped wholesale and the whole node fall back to defaults — which shows
 * up as "no matter how I change the settings they have no effect".
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
 * These two fields are of type **bool** (XrpcBool), not s32 — based on the `__type` the game
 * itself reports in usr.save. Sending the wrong type makes XmlSerializer throw while parsing
 * usr_main_option and **the whole node is dropped, falling back to the defaults** (which shows up
 * as note speed stuck at 1.0 and lane width / volume / note design all having no effect).
 * So here the value is always sent as bool, regardless of whether it is true or 1.
 */
const BOOL_OPTION_KEYS = ['is_voice_active', 'force_open_prev_in_game_option'];
const STR_OPTION_KEYS = ['bga_id'];

/** Convert a stored value into that field's XRPC type (bool / str / s32) */
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
 * Settings output.
 *
 * The structure (field order + `__type`) comes from `raw.usr_main_option` — that is the raw node
 * the game itself reported in usr.save, so its types are 100% trustworthy; the values come from
 * `option` (the player's latest changes).
 * Why keep the two apart: guessing types goes wrong, and as soon as one field has the wrong type
 * (say a bool sent as s32) XmlSerializer throws and **the whole settings block silently reverts
 * to the defaults**, while the game reports no error at all.
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
    // the type is taken from the __type reported by the game first, otherwise guessed from the
    // known lists
    let typ: string = 's32';
    const t = tpl && tpl[k];
    const fromTpl = t && t['@attr'] && t['@attr']['__type'];
    if (fromTpl) typ = String(fromTpl);
    else if (BOOL_OPTION_KEYS.includes(k)) typ = 'bool';
    else if (STR_OPTION_KEYS.includes(k)) typ = 'str';

    let v = merged[k];
    // missing from option but reported by the game -> use the reported value so fields are not lost
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
 * Read-failure flag. If the DB cannot be read and an empty save is substituted and then written
 * back, the player's real save gets overwritten with a blank one — that is the most typical cause
 * of "the save mysteriously got wiped", so a failed read switches to read-only protection.
 */
let loadFailed = false;

export async function loadUser(): Promise<XifUser> {
  if (userCache) return userCache;
  let doc: any = null;
  try {
    doc = await DB.FindOne<any>({ usr_id: 1 });
  } catch (e) {
    loadFailed = true;
    enqueue('!! loadUser failed (entering read-only protection, no more DB writes): ' + e + '\n');
  }
  userCache = doc ? { ...defaultUser(), ...doc } : defaultUser();
  if (!userCache.raw || typeof userCache.raw !== 'object') userCache.raw = {};
  return userCache as XifUser;
}

export async function saveUser(u: XifUser): Promise<void> {
  if (loadFailed) {
    enqueue('!! saveUser skipped: initial load failed, refusing to overwrite the save\n');
    return;
  }
  userCache = u;
  try {
    await DB.Upsert<any>({ usr_id: 1 }, { $set: { ...(u as any) } });
  } catch (e) {
    enqueue('!! saveUser failed: ' + e + '\n');
  }
}

/** Fetch a passthrough node that was stored as a JSON string */
export function rawNode(u: XifUser, key: string): any {
  const v = u.raw && u.raw[key];
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch (e) {
      enqueue(`!! raw ${key} restore failed: ${e}\n`);
      return undefined;
    }
  }
  return v && typeof v === 'object' ? v : undefined;
}

/**
 * Fetch a **pure data** node from raw (not an XML node).
 *
 * Difference from rawNode: the stored value here may be a "JSON string" or an "already parsed
 * object", depending on which version of the code wrote it. **You must not JSON.parse the result
 * of rawNode a second time**: when JSON.parse receives an object it converts the object into
 * "[object Object]" and parses that, which always throws SyntaxError; once that exception is
 * swallowed by catch, the whole persistent table is treated as an empty table — that is exactly
 * the root cause of "the persistent item table clearly has data, yet not a single item is sent on
 * login" (the bug was in mergePersistentItems).
 */
export function rawData<T>(u: XifUser, key: string, fallback: T): T {
  const v = u.raw && u.raw[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch (e) {
      enqueue(`!! raw ${key} restore failed: ${e}\n`);
      return fallback;
    }
  }
  return typeof v === 'object' ? (v as T) : fallback;
}

/** A string array inside raw (e.g. usr_item_log_applied); truncated automatically when it grows
 *  out of range */
function readUuidList(u: XifUser, key: string): string[] {
  const v = rawData<string[]>(u, key, []);
  return Array.isArray(v) ? v.map(String) : [];
}

/** Change-log dedupe: the same uuid is applied only once (usr.save can be called several times
 *  per session and the log gets re-sent) */
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

/** Get the bare value of an XML leaf node (@content is always an array) */
function leafValue(node: any): any {
  const c = node?.['@content'];
  const v = Array.isArray(c) ? c[0] : c;
  return v;
}

/**
 * Accumulate the item change log reported by the game into the persistent item table
 * (accumulated across sessions).
 * money.* is currency and does not go through the item table.
 * Every log entry carries a uuid, and a re-reported duplicate must be skipped — otherwise it is
 * stored once more every session and the numbers snowball.
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
      enqueue(`persistent_items: ${changed} change(s) accumulated, ${skipped} dup skipped\n`);
    }
  } catch (e) {
    enqueue(`!! persistent_items processing failed: ${e}\n`);
  }
}

/**
 * Accumulate the action count change log into the persistent table.
 * The `usr_action_count` (key/count) in the response is the **total**, while the game only
 * reports the increments, so the server must accumulate them itself — this is also part of the PA
 * mission / title conditions.
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
      enqueue(`persistent_action_count accumulated ${changed} change(s)\n`);
    }
  } catch (e) {
    enqueue(`!! persistent_action_count processing failed: ${e}\n`);
  }
}

/** Persistent action count -> the usr_action_count node (key/count) in the response */
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

/** Persistent item table (positive part only) */
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
 * Merge the persistent item table into the usr_item being sent this time.
 * For base items with the same id the count is added to the accumulated value; ids the base does
 * not have are appended as new items.
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

/* ---------------- Persisting gacha results ---------------- */

/** A drawn card instance (pure data, serialized into u.raw.usr_extra_cards) */
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
  // fallback: hand-written v4
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
 * Cleanup of the temporary card instances from gacha.
 *
 * `usr_extra_cards` only holds cards that were "drawn in this session and not yet reported by the
 * game". Once the next usr.save reports `usr_character_card`, those cards are in the real save and
 * the entries in the temporary table can be deleted — otherwise every single draw leaves one more
 * permanent entry and raw grows without bound.
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
    enqueue(`usr_extra_cards: merged ${extras.length - keep.length}, left ${keep.length}\n`);
  }
}

/**
 * Record one gacha result: the quantity goes into the persistent item table (kept across
 * sessions), and a card additionally gets a card instance generated.
 * Card instances are stored separately in `usr_extra_cards` because these cards were obtained in
 * **this session** and the game has not had a chance to report them back in usr.save; after the
 * next usr.save they enter `usr_character_card`, and deduping by index at that point means there
 * are no duplicates.
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
  enqueue(`drew character card ${id}, generated card instance ${card.index}\n`);
  return card;
}
