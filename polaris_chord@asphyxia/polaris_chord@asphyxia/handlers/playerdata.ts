/*
 * Construction of the player data body (GetPlayDataResponse).
 *
 * The two responses share one and the same construction logic:
 *   - the response body of usr.get
 *   - player_data of gacha.end_gacha (used to refresh the save after a gacha pull)
 * They must be **perfectly isomorphic** -- if even one node is missing, the game's
 * GetPlayDataStepRunner will judge RegisteredUserNoData / a communication failure.
 *
 * There are two data sources, and they must be told apart:
 *   ① **Static baseline**: data/*.json (all cards, all titles, all charts, tickets) -- so that
 *      an offline environment is playable;
 *   ② **Save**: the player's real state reported by usr.save -- so that "cards pulled / items
 *      bought / titles obtained" survive across sessions.
 * The rule is **baseline ∪ save** (save takes precedence): nothing goes missing because the
 * save lacks an entry, and none of this session's changes get wiped just because only the
 * baseline exists.
 */

import { cfg, enqueue, nowStr } from './common';
import {
  REPLAY_KEYS,
  buildActionCountNode,
  loadUser,
  mergePersistentItems,
  rawNode,
  readExtraCards,
} from './store';
import { buildChartItems } from './music';
import {
  cardItems,
  cardNodes,
  charaNodes,
  loadCharacters,
  mergeCards,
  mergeCharas,
  savedCardState,
} from './character';
import { buildMainOption } from './store';

/**
 * Generic progress flags that must exist in `usr_count` for the account not to be treated
 * as a brand-new player.
 *
 * They are written by the game itself into the save file, so a fresh profile has none of
 * them. Without them the game concludes the tutorial was never finished and therefore
 * keeps taking the new-player flow — and it also keeps most charts locked, no matter what
 * `data/unlock.json` requests.
 *
 * Values were copied from a real save (all are 1, except PASkill.gradeup which is 3).
 */
const BASELINE_COUNTERS: Array<[string, number]> = [
  ['Bonus.WelcomeMira', 1],
  ['Tutorial.Prologue', 1],
  ['Tutorial.InGamePlay', 1],
  ['Tutorial.InGame', 1],
  ['Tutorial.Home', 1],
  ['Tutorial.UnitSelect', 1],
  ['Tutorial.Casting', 1],
  ['Tutorial.Training', 1],
  ['PASkill.gradeup', 3],
];

/**
 * Builds usr_play_info (3rd position of GetPlayDataResponse, right after usr_profile).
 *
 * **It must be sent**: client logs measured that the game treats an account lacking this node
 * as `RegisteredUserNoData` (registered but without data) -> it takes the new-player flow ->
 * every setting falls back to its default.
 * (Source: the Log-Error output of Game.Scene.Entry.ContinueGetPlayDataRunner)
 *
 * Fields and types are copied verbatim from the raw node reported by the game's usr.save; the
 * values are reasonable initial values for the current session.
 * softcode / asset_version must match the game, otherwise the data may be judged as
 * "not data of this game".
 */
export function buildPlayInfo(): any {
  // The game reports 7 fractional digits: 2026-10-29T17:28:40.0000000Z
  // toISOString() only gives 3 (...46.005Z), so replace the whole fraction with a regex
  const now = new Date().toISOString().replace(/\.\d+Z$/, '.0000000Z');
  const s32 = (v: number) => K.ITEM('s32', v);
  return {
    softcode: K.ITEM('str', 'XIF:J:A:A:2025070800'),
    asset_version: s32(37),
    start_date: K.ITEM('str', now),
    end_date: K.ITEM('str', now),
    play_days: s32(0),
    consecutive_days: s32(0),
    consecutive_weeks: s32(0),
    // It must be a valid date! When reporting "no record" the game sends "0001-01-01"
    // (DateTime.MinValue), and CreatePlayerStatus overflows while doing the UTC offset
    // conversion: "The UTC time represented when the offset is applied must be between year 0
    //   and 10,000" -> FetchAsync aborts -> applying the whole player data fails -> every login
    // is treated as a new player (repeated daily bonuses/titles, items not kept -- all of that
    // comes from this).
    // The format must be YYYY-MM-DD with hyphens! Decompiled
    // Core.Extensions.DateTimeUtil.ParseYYYYMMDD:
    //   string[] array = str.Split('-');  <- splits on '-' and requires 3 parts
    //   if (array.Length == 3) return new DateTime(y, m, d);  else return null;
    // Sending the compact "20261031" -> Split('-') yields only 1 part -> null -> falls back to
    // DateTime.MinValue.
    last_play_week: K.ITEM('str', new Date().toISOString().slice(0, 10)),
    today_play_count: s32(1),
    mode_id: s32(0),
    boost_item_id: s32(0),
    music_id: s32(0),
    folder_id: s32(0),
    chart_difficulty_type: s32(0),
    musicselect_difficulty_type: s32(0),
    pcb_id: K.ITEM('str', '04040000000000000000'),
    loc_id: K.ITEM('str', 'ea'),
    shop_name: K.ITEM('str', ''),
    // **These two must be non-zero**: GetPlayDataStepRunner checks
    // SoloModePlayCount + MatchingModePlayCount, and if they are 0 it treats the player as a
    // "new account" and overwrites every setting sent by the server with PlayerOption.Default
    // (the real culprit behind the scroll speed being stuck at 1.0).
    // In the game's own report, solo mode corresponds to standard_play_count and versus to
    // local_matching_play_count.
    beginner_play_count: s32(0),
    standard_play_count: s32(5),
    freetime4_play_count: s32(0),
    freetime6_play_count: s32(0),
    freetime8_play_count: s32(0),
    freetime12_play_count: s32(0),
    local_matching_play_count: s32(1),
    global_matching_play_count: s32(0),
    freetime_play_count: s32(0),
    freetime_play_total_time: s32(0),
    latest_caravan_location_id: s32(0),
    latest_caravan_location_type: s32(-1),
    play_count_on_name_changed: s32(-1),
  };
}

/**
 * Replaces every date starting with "0001-01-01" inside usr_play_info with the current UTC.
 *
 * The MinValue date reported by the game (that is what it sends when the player has never
 * played) makes the UTC offset conversion in CreatePlayerStatus throw
 * "The UTC time ... offset" -> 302 / the data application is aborted.
 * gacha.end_gacha must also run through this when it reuses the data body of usr.get.
 */
export function sanitizePlayInfoDates(pd: Record<string, any>): void {
  const pi = pd && pd.usr_play_info;
  if (!pi || typeof pi !== 'object') return;
  const nowUtc = new Date().toISOString();
  for (const k of Object.keys(pi)) {
    const node = (pi as any)[k];
    const c = node?.['@content'];
    const val = String(Array.isArray(c) ? c[0] : c ?? '');
    if (val.startsWith('0001-01-01')) {
      // last_play_week goes through ParseYYYYMMDD (which needs a date with hyphens), the rest
      // go through ParseISO8601
      (pi as any)[k] = K.ITEM('str', k === 'last_play_week' ? nowUtc.slice(0, 10) : nowUtc);
    }
  }
}

/* ---------------- small helpers ---------------- */

function asArray(v: any): any[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function leaf(node: any): any {
  const c = node?.['@content'];
  return Array.isArray(c) ? c[0] : c;
}

const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const GUID_EMPTY = '00000000-0000-0000-0000-000000000000';

/**
 * Decides whether a passthrough node is "empty".
 *
 * asphyxia's serializer **skips entirely** any node that has no child elements, and when a node
 * is missing the game judges the player as RegisteredUserNoData (new-player flow). So an empty
 * passthrough node cannot be sent as-is; it has to fall back to the version carrying the `zzz`
 * placeholder. A typical example: when the client has no stamp history, `usr_chatstamp` is
 * reported as `<usr_chatstamp/>`, which is stored as `{}` -- replaying it that way is the same
 * as not sending the node at all.
 */
function isEmptyNode(v: any): boolean {
  if (!v || typeof v !== 'object') return true;
  const keys = Object.keys(v).filter((k) => k !== '@attr');
  if (keys.length === 0) return true;
  return keys.every((k) => {
    const c = (v as any)[k];
    if (c === undefined || c === null) return true;
    if (Array.isArray(c)) return c.length === 0;
    if (typeof c === 'object') return Object.keys(c).filter((x) => x !== '@attr').length === 0;
    return false;
  });
}

/**
 * Deck node sanitization.
 *
 * Replaying usr_deck preserves "deck name / currently selected deck", but the game's
 * `CreateDeckList` unconditionally does `new Guid(usrDeck.ContenterIndex.Value)` -- a single
 * empty slot makes it throw FormatException, and that code is **not inside a try**
 * (RepairCharacterDeck is outside), so one throw cuts off the whole FetchAsync, which means the
 * login fails. That is why every non-GUID slot is replaced with the empty GUID and the game's
 * own RepairCharacterDeck fills it back in.
 */
function sanitizeDeck(raw: any): any {
  const GUID_FIELDS = [
    'contenter_index',
    'supportsnap1_index',
    'supportsnap2_index',
    'supportsnap3_index',
    'supportsnap4_index',
  ];
  for (const deck of asArray(raw?.deck)) {
    if (!deck || typeof deck !== 'object') continue;
    for (const f of GUID_FIELDS) {
      const node = deck[f];
      if (!node || typeof node !== 'object') continue;
      const v = String(leaf(node) ?? '');
      if (!GUID_RE.test(v)) node['@content'] = GUID_EMPTY;
    }
  }
  return raw;
}

/**
 * Title id parsing: the client packs the whole owned list into one "id,id,..." string element
 */
function titleIdsFromRaw(raw: any): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const el of asArray(raw?.title)) {
    const s = typeof el === 'object' ? String(leaf(el) ?? '') : String(el ?? '');
    for (const part of s.split(',')) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/* -------- sort / filter (the real reason the card list shows only 4~5 cards) -------- */

/**
 * `CardFilterType` (game.common.foundation) is a **bitmask**, meaning "check the cards you want
 * to display":
 *
 *   NONE=0
 *   RARITY_N=0x01  RARITY_R=0x02  RARITY_SR=0x04  RARITY_SSR=0x08
 *   ENABLE_LEVEL_TRAINING=0x10  UNENABLE_LEVEL_TRAINING=0x20
 *   ENABLE_SKILL_LEVEL_TRAINING=0x40  UNENABLE_SKILL_LEVEL_TRAINING=0x80
 *   RANK_SINGLE=0x100  RANK_DOUBLE=0x200  RANK_TRIPLE=0x400
 *   SKILL_*(Contenter)=0x800..0x3F800
 *   SKILL_*(Support)  =0x40000..0x1FC0000
 *
 * `CardFilterTypeExtentions.DEFAULT` = ALLRARITY|ALLLEVEL|ALLSKILLLEVEL|ALLRANK
 *                                    |ALLCONTENTERSKILL|ALLSUPPORTSKILL = **0x1FFFFFF**
 * (dumped one by one with dump_il: 0x0F | 0x30 | 0xC0 | 0x700 | 0x3F800 | 0x1FC0000)
 *
 * And the filtering logic of the card list
 * (`CharacterCardReplacementListDataUtil.GenerateCardList`) is:
 *
 *     foreach (card in all cards) {
 *         if (!CardInfo.TryGet(...)) continue;
 *         if (CardType != cardType of the current tab) continue;
 *         data = new CharacterCardReplacementListData{ ... IsDecked = whether it is in a deck ... };
 *         if (CardListFilterEliminate(filterType, data)) continue;   // <- dropped if the bitmask lacks the bit
 *         list.Add(data);
 *     }
 *
 *     bool CardListFilterEliminate(t, data) {
 *         if (data.IsDecked) return false;          // cards **already in a deck are always shown**
 *         if (RarityEliminate(t, data)) return true;
 *         if (LevelEliminate(t, data)) return true;
 *         ...
 *     }
 *
 * So with `filterType == 0` (NONE), **only the few cards already put into a deck can be shown**.
 * The player's deck is 5 **rental cards** (`usr_deck` is full of UserCardIds of
 * `CharacterRentalCardMaster`), and in `RarityEliminate` `rarity = card.IsRental ? 0 :
 * card.CardRarity` -- **rental cards are always displayed with rarity 0, i.e. N**.
 *
 * This is the complete explanation of "the card list has only 4~5 cards, all of them N cards,
 * and no names are visible"; it has nothing whatsoever to do with the card data.
 *
 * Why filterType would be 0: the game's `PlayerSortSetting.Default` (select all) is only
 * constructed in `.cctor`, while `CreateSortSetting(res)` uses `new PlayerSortSetting()` when
 * the server field is missing or 0 -- and the field default is 0. As long as the player does
 * not touch the filters, what gets reported stays 0, and the server replays it verbatim ->
 * an endless loop.
 */
const CARD_FILTER_DEFAULT = 0x1ffffff;   // CardFilterTypeExtentions.DEFAULT
const MUSIC_FILTER_DEFAULT = 0xe21;      // FilterTypeExtensions.Default = 3617

/** Lists all 12 fields of usr_sort_setting in order (3 groups × sort/filter/order) */
const SORT_FIELDS: Array<[string, number]> = [
  ['musicselect_sort', 0],
  ['musicselect_filter', MUSIC_FILTER_DEFAULT],
  ['musicselect_order', 0],
  ['character_training_list_sort', 0],
  ['character_training_list_filter', CARD_FILTER_DEFAULT],
  ['character_training_list_order', 0],
  ['character_replacement_list_sort', 1],
  ['character_replacement_list_filter', CARD_FILTER_DEFAULT],
  ['character_replacement_list_order', 0],
  ['character_material_list_sort', 6],
  ['character_material_list_filter', CARD_FILTER_DEFAULT],
  ['character_material_list_order', 0],
];

/**
 * Repairs / constructs usr_sort_setting.
 *
 * Rule: **every filter field whose value is 0 is replaced with "select all"** (0 means "not a
 * single card checked" in the game, and a player who really wants filtering writes a non-zero
 * value there, so nothing is changed by mistake).
 * Missing fields are filled with the defaults of the game's `PlayerSortSetting.Default`, so the
 * node does not degrade because it is empty.
 */
function fixSortSetting(raw: any): any {
  const out = raw && typeof raw === 'object' ? raw : {};
  const s32 = (v: number) => ({ '@attr': { __type: 's32' }, '@content': [v] });
  for (const [key, def] of SORT_FIELDS) {
    const node = (out as any)[key];
    if (!node || typeof node !== 'object') {
      (out as any)[key] = s32(def);
      continue;
    }
    const c = node['@content'];
    const v = Number(Array.isArray(c) ? c[0] : c);
    if (!Number.isFinite(v)) {
      node['@content'] = [def];
      continue;
    }
    // The three filter fields: 0 = NONE = nothing displayed, must be replaced with select-all
    if (key.endsWith('_filter') && v === 0) node['@content'] = [def];
  }
  return out;
}

/**
 * Title ownership = save ∪ static baseline.
 * The save holds the complete owned list maintained by the game itself (including the titles
 * newly obtained this session); the baseline guarantees that a full set of titles is available
 * on the very first login; a plain union loses neither side.
 */
function mergeTitleIds(saved: string[], baseline: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of saved) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of baseline) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function readJsonArray(file: string): Promise<any[]> {
  try {
    const p = IO.Resolve(file);
    if (!IO.Exists(p)) return [];
    const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    enqueue(`!! failed to read ${file}: ${e}\n`);
    return [];
  }
}

/**
 * Builds the complete player data body + item list.
 * The order strictly follows the field declarations of GetPlayDataModeler+ResponseXrpc; not a
 * single node may be missing (a missing node makes GetPlayDataStepRunner judge
 * RegisteredUserNoData -> new-player flow).
 */
export async function buildPlayerBody(): Promise<{ body: Record<string, any>; items: any[] }> {
  const items = await buildChartItems();
  const u = await loadUser();

  // The order strictly follows the field declarations of GetPlayDataModeler+ResponseXrpc:
  //   usr_id(1), usr_profile(2), usr_play_info(3), usr_main_option(4), usr_privacy(5),
  //   usr_nametag(6), usr_sort_setting(7), usr_unlock_music(8), usr_item(9), …
  //   … usr_count(18)
  // Non-standard fields (result / now_date / crew_id) always go at the end: they do not belong
  // to this response type, and sitting in the middle they could disturb XmlSerializer's
  // positional matching.
  const body: Record<string, any> = {
    result: K.ITEM('s32', 0), // SignUpType.Registered
    now_date: K.ITEM('str', nowStr()),
    usr_id: K.ITEM('s32', u.usr_id),
    crew_id: K.ITEM('str', '00000001'), // CrewId.Validate(): ^[0-9]{12}$|^[0-9]{8}$
    usr_profile: K.ATTR({}, {
      usr_name: K.ITEM('str', u.name),
      usr_rank: K.ITEM('s32', u.rank),
      exp: K.ITEM('s32', u.exp),
      comment: K.ITEM('str', u.comment),
      is_tutorial_cleared: K.ITEM('bool', u.tutorial),
    }),
    // 3rd position: without it the game judges "no data" -> new-player flow, see buildPlayInfo
    usr_play_info: K.ATTR({}, buildPlayInfo()),
  };

  // usr_main_option: the structure comes from the raw template (the original node reported by
  // the game), the values come from option (the player's latest settings).
  // See the comment on buildMainOption -- one wrong field type makes the whole section fall
  // back to the defaults.
  body.usr_main_option = K.ATTR({}, buildMainOption(u));

  /*
   * Fill in **all** the nodes declared by GetPlayDataResponse, not one may be missing:
   * when GetPlayDataStepRunner parses the response, a missing node makes it judge Result as
   * ResultType.RegisteredUserNoData(2) -> the game takes the new-player branch -> all settings
   * revert to their defaults.
   *
   * Note: `K.ATTR({}, {})` with an empty object is skipped entirely by asphyxia's serializer
   * (measured), so each node gets a placeholder element `zzz` that the game does not know --
   * XmlSerializer's default behaviour for unknown child elements is to ignore them, yet the node
   * itself still shows up in the response normally.
   * The order follows the game's declaration: privacy(5) nametag(6) sort(7) unlock_music(8)
   *   item(9) name_titles(10) deck(11) character_card(12) character(13)
   *   login_bonus(14) music_mission(15) extend_music_mission(16) mission(17)
   *   count(18) chatstamp(19) action_count(20) notice(21)
   */

  /* ---- login bonus progress ----
   * Prefer the save (the progress maintained by the game itself); when the save has nothing,
   * fall back to the fully-complete baseline in data/login_bonus.json.
   * Sending an empty one makes playerData.LoginBonusInternal.Initialize(empty) reset the
   * progress to zero, which shows up as "the daily bonus is granted again on every login".
   */
  const savedLoginBonus = rawNode(u, 'usr_login_bonus');
  const savedLoginList = asArray(savedLoginBonus?.login_bonus).filter((x) => x && typeof x === 'object');
  if (savedLoginList.length > 0) {
    body.usr_login_bonus = savedLoginBonus;
  } else {
    const list = (await readJsonArray('data/login_bonus.json')) as Array<{ event_id: string; progress: number }>;
    if (list.length > 0) {
      body.usr_login_bonus = K.ATTR({}, {
        login_bonus: list.map((x) => K.ATTR({}, {
          // event_id must be `event ID.form ID` (regex ^\d{5}\.\d{4}$),
          // e.g. 00001.0001; sending only the event ID makes LoginBonusEventId throw
          // FormatException -> usr.get parsing fails -> the login does not get through.
          event_id: K.ITEM('str', x.event_id),
          progress: K.ITEM('s32', x.progress),
        })),
      });
    }
  }

  /* ---- title ownership ----
   * Save (the owned list reported by the game) ∪ static baseline. This chain used to be broken:
   * `usr_name_titles` is in REPLAY_KEYS but not in RAW_KEYS -- replay was intended,
   * but it was never stored, so it was always the static 189 titles and a title obtained this
   * session was gone in the next one.
   */
  const savedTitleIds = titleIdsFromRaw(rawNode(u, 'usr_name_titles'));
  const baselineTitles = (await readJsonArray('data/name_titles.json') as string[])
    .map((t) => String(t));
  const titleIds = mergeTitleIds(savedTitleIds, baselineTitles);
  if (titleIds.length > 0) {
    // The client's PlayerNameTagTitleInventory.OnPlayerDataFetched splits every <title> again on
    // ',', so a single element is combined here (saves space, semantics unchanged).
    body.usr_name_titles = K.ATTR({}, { title: [K.ITEM('str', titleIds.join(','))] });
  }

  const placeholder = () => K.ATTR({}, { zzz: K.ITEM('s32', 0) });
  body.usr_privacy = placeholder();
  body.usr_nametag = placeholder();
  body.usr_sort_setting = placeholder();
  body.usr_unlock_music = placeholder();

  /* ---- characters / character cards ----
   * Baseline (the 113 cards of characters.json) + save (the real state reported by the game) +
   * the cards pulled in this session.
   * Previously only the static baseline was sent here and `usr_character_card` was never
   * persisted -- "pulled cards are not saved / trained cards lose their progress" was exactly
   * because of this.
   */
  const charCfg = await loadCharacters();
  const savedState = savedCardState(u);
  const cards = mergeCards(
    charCfg.enabled ? charCfg.cards : [],
    savedState.cards,
    readExtraCards(u)
  );
  const charas = mergeCharas(charCfg.enabled ? charCfg.characters : [], savedState.charas);
  if (cards.length > 0) {
    body.usr_character_card = K.ATTR({}, { card: cardNodes(cards) });
    // item_id looks like chara_card.00030001; the game uses it to decide "does the player own
    // this card"
    items.push(...cardItems(cards));
  }
  if (charas.length > 0) {
    body.usr_character = K.ATTR({}, { chara: charaNodes(charas) });
  }

  // Story tickets: every episode of Watako ep1 has RequireItem=True, and GetStatus decides with
  // ItemInventory.HasItem(story.StoryId.ToItemId()),
  // the item format being story.chara.{8-digit story id} (hard-coded in
  // CharacterStoryId.ToItemId).
  // With the ticket -> story status 3 (viewable but unread), which becomes 2 together with the
  // read flag in usr_count.
  for (const sid of ['11000001', '11000002', '11000003', '11000004', '11000005']) {
    items.push(K.ATTR({}, {
      item_id: K.ITEM('str', `story.chara.${sid}`),
      count: K.ITEM('s32', 1),
      income: K.ITEM('s32', 0),
      expense: K.ITEM('s32', 0),
    }));
  }

  // Event tickets: the payment currency of the collaboration shops (in ChangeItemMaster
  // Source=ticket.event.*, each item costs 80~360 of them). The official server drops them from
  // events; here they are simply granted in full.
  // The amount is controlled by the WebUI config entry ticket_count (default 999 = basically
  // unlimited).
  const ticketCount = cfg<number>('ticket_count', 999);
  for (const t of [
    'normal_00001', 'normal_00002', 'normal_00003', 'normal_00004',
    'normal_00005', 'normal_00006', 'normal_00007', 'normal_00008',
    'normal_00009', 'normal_00010', 'normal_00011', 'normal_00012',
    'special_00001', 'special_00003',
  ]) {
    items.push(K.ATTR({}, {
      item_id: K.ITEM('str', `ticket.event.${t}`),
      count: K.ITEM('s32', ticketCount),
      income: K.ITEM('s32', 0),
      expense: K.ITEM('s32', 0),
    }));
  }

  // Merge the persistent item table (cross-session accumulation of shop purchases / gacha
  // rewards / song drops etc.)
  mergePersistentItems(items, u);

  body.usr_item = K.ATTR({}, { item: items });

  /* ---- action count (the counters behind PA missions / title conditions) ----
   * The game only reports incremental logs; the server accumulates the total.
   */
  const actionCount = buildActionCountNode(u);
  if (actionCount) body.usr_action_count = actionCount;

  for (const key of [
    'usr_name_titles', 'usr_deck', 'usr_character_card', 'usr_character',
    'usr_login_bonus', 'usr_music_mission', 'usr_extend_music_mission',
    'usr_mission', 'usr_chatstamp', 'usr_action_count', 'usr_notice',
  ]) {
    if (body[key]) continue;   // real data already sent above, do not overwrite it with placeholder
    body[key] = placeholder();
  }

  /* ---- replay of pure passthrough nodes ---- */
  for (const key of REPLAY_KEYS) {
    // usr_sort_setting cannot be a pure passthrough: with filter = 0 the card list shows only
    // the cards already put into a deck (see fixSortSetting)
    if (key === 'usr_sort_setting') {
      body[key] = fixSortSetting(rawNode(u, key));
      continue;
    }
    const v = rawNode(u, key);
    if (key === 'usr_count' && charCfg.enabled && Array.isArray(charCfg.stories)) {
      // Build this node even for a brand-new profile. `usr_count` holds the story unlock
      // markers plus the generic counters; on a fresh save it is empty, and the
      // `isEmptyNode` guard below would drop the whole node — the game then sees an
      // account with no story progress at all.
      //   in raw, usr_count = { count: [ {key,value}, … ] } (count is directly an array)
      const arr: any[] = Array.isArray(v?.count)
        ? v.count
        : v?.count && Array.isArray(v.count.count)
          ? v.count.count
          : [];
      const have = new Set(
        arr.map((c: any) => {
          const kv = c && c.key && c.key['@content'];
          return Array.isArray(kv) ? kv[0] : kv;
        })
      );
      for (const sid of charCfg.stories) {
        const k = `Story.CharacterStoryId(${sid})`;
        if (!have.has(k)) {
          have.add(k);
          arr.push({
            key: { '@attr': { __type: 'str' }, '@content': k },
            value: { '@attr': { __type: 's32' }, '@content': [1] },
          });
        }
      }
      // Generic progress flags. They only ever come from the save file, so a brand-new
      // profile has none of them — and then the game concludes the tutorial was never
      // finished, i.e. "new player": it replays the tutorial flow and keeps most charts
      // locked regardless of what unlock.json says.
      for (const [k, n] of BASELINE_COUNTERS) {
        if (!have.has(k)) {
          have.add(k);
          arr.push({
            key: { '@attr': { __type: 'str' }, '@content': k },
            value: { '@attr': { __type: 's32' }, '@content': [n] },
          });
        }
      }
      body[key] = isEmptyNode(v) ? { count: arr } : v;
      continue;
    }
    // An empty node must not be sent: the whole node would vanish -> judged as a new player
    if (isEmptyNode(v)) continue;
    body[key] = v;
  }

  /* ---- deck: replay it when possible (deck name / current deck) ----
   * It used to be deliberately not replayed, because the character cards were empty and a deck
   * pointing at non-existent cards broke the party-building screen.
   * Now that the card instances travel with the save, the deck can be replayed safely -- but the
   * illegal GUIDs must be sanitized first, see the comment on sanitizeDeck (an empty GUID makes
   * the game's new Guid("") throw and the whole login fail).
   */
  const deckRaw = rawNode(u, 'usr_deck');
  if (deckRaw && asArray(deckRaw.deck).length > 0 && cards.length > 0) {
    body.usr_deck = sanitizeDeck(deckRaw);
    // Record the deck summary being sent into xrpc.log -- the usr.get response itself is not
    // logged, so when investigating "the party got reset" this is the only trace proving
    // "what the server actually sent".
    logDeckSummary(body.usr_deck, cards);
  }

  return { body, items };
}

/** Writes the replayed deck summary (index and owner of each slot) into xrpc.log */
function logDeckSummary(deckNode: any, cards: Array<{ index: string; item_id: string }>): void {
  try {
    const byIndex = new Map(cards.map((c) => [String(c.index), String(c.item_id)]));
    const lines: string[] = [`usr_deck replay, ${asArray(deckNode?.deck).length} deck(s):`];
    for (const d of asArray(deckNode?.deck)) {
      const num = leaf(d?.deck_number);
      const slots: string[] = [];
      for (const key of ['contenter_index', 'supportsnap1_index', 'supportsnap2_index', 'supportsnap3_index', 'supportsnap4_index']) {
        const idx = String(leaf(d?.[key]) ?? '');
        const own = byIndex.get(idx);
        slots.push(`${idx.slice(0, 8) || '(empty)'}${own ? '=' + own : ''}`);
      }
      lines.push(`  deck${num} select=${leaf(d?.is_select)} ${slots.join(' ')}`);
    }
    enqueue(lines.join('\n') + '\n');
  } catch (e) {
    enqueue(`!! failed to log deck summary: ${e}\n`);
  }
}
