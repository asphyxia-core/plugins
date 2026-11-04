/*
 * 玩家数据体（GetPlayDataResponse）的构建。
 *
 * 两份响应共用同一份构建逻辑：
 *   - usr.get 的响应体
 *   - gacha.end_gacha 的 player_data（游戏抽卡后刷新存档用）
 * 两者必须**完全同构** —— 缺任何一个节点，游戏端
 * GetPlayDataStepRunner 会判 RegisteredUserNoData / 通信失败。
 *
 * 数据来源有两条线，必须分清楚：
 *   ① **静态基线**：data/*.json（全卡、全称号、全部谱面、票券）—— 让离线环境能玩；
 *   ② **存档**：usr.save 上报的玩家真实状态 —— 让「抽到的卡 / 买到的道具 / 拿到的称号」
 *      跨局保留。
 * 规则是 **基线 ∪ 存档**（存档优先）：既不会因为存档缺项而少东西，也不会因为
 * 只有基线而把玩家这一局的变化抹掉。
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
 * 生成 usr_play_info（GetPlayDataResponse 第 3 位，位置就在 usr_profile 后面）。
 *
 * **必须发**：客户端日志实测，游戏会把没有这个节点的账号判成
 * `RegisteredUserNoData`（已注册但无数据）→ 走新玩家流程 → 设置全部回默认。
 * （来源：Game.Scene.Entry.ContinueGetPlayDataRunner 的 Log-Error 输出）
 *
 * 字段与类型照抄游戏 usr.save 上报的原始节点，值是当前会话的合理初值。
 * softcode / asset_version 必须与游戏匹配，否则可能被判成「不是本游戏的数据」。
 */
export function buildPlayInfo(): any {
  // 游戏上报格式是 7 位小数：2026-10-29T17:28:40.0000000Z
  // toISOString() 只给 3 位（…46.005Z），用正则整体替换掉小数段
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
    // 必须是合法日期！游戏上报「无记录」时是 "0001-01-01"（DateTime.MinValue），
    // CreatePlayerStatus 做 UTC 时区转换时越界抛
    // 「The UTC time represented when the offset is applied must be between year 0
    //   and 10,000」→ FetchAsync 中断 → 整个玩家数据应用失败 → 每次登录都当新玩家
    // （每日奖励/称号重复发、道具不保留全部由此而来）。
    // 格式必须是带横线的 YYYY-MM-DD！反编译 Core.Extensions.DateTimeUtil.ParseYYYYMMDD：
    //   string[] array = str.Split('-');  ← 按 '-' 分割，要求 3 段
    //   if (array.Length == 3) return new DateTime(y, m, d);  else return null;
    // 发紧凑 "20261031" → Split('-') 只有 1 段 → null → 回落 DateTime.MinValue。
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
    // **这两个必须非零**：GetPlayDataStepRunner 会检查
    // SoloModePlayCount + MatchingModePlayCount，为 0 就把玩家当「新账号」，
    // 用 PlayerOption.Default 覆盖掉服务端下发的全部设置（流速恒 1.0 的真凶）。
    // 游戏自身上报里单人模式对应 standard_play_count，对战对应 local_matching_play_count。
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
 * 把 usr_play_info 里所有 "0001-01-01" 开头的日期换成当前 UTC。
 *
 * 游戏上报的 MinValue 日期（从没游玩过时就是它）会让 CreatePlayerStatus 的
 * UTC 时区转换抛「The UTC time ... offset」→ 302 / 数据应用中断。
 * gacha.end_gacha 复用 usr.get 的数据体时也要过一遍。
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
      // last_play_week 走 ParseYYYYMMDD（要带横线的日期），其余走 ParseISO8601
      (pi as any)[k] = K.ITEM('str', k === 'last_play_week' ? nowUtc.slice(0, 10) : nowUtc);
    }
  }
}

/* ---------------- 小工具 ---------------- */

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
 * 判断一个透传节点是不是「空的」。
 *
 * asphyxia 的序列化器会**整个跳过**没有子元素的节点，游戏端拿到缺节点就会把
 * 玩家判成 RegisteredUserNoData（新玩家流程）。所以空的透传节点不能直接发，
 * 得退回带 `zzz` 占位符的版本。典型例子：`usr_chatstamp` 在客户端没贴纸历史时
 * 上报的是 `<usr_chatstamp/>`，存下来就是 `{}` —— 直接回放等于没发这个节点。
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
 * 卡组节点消毒。
 *
 * 回放 usr_deck 能保住「卡组名 / 当前选择的卡组」，但游戏端
 * `CreateDeckList` 会无条件 `new Guid(usrDeck.ContenterIndex.Value)` ——
 * 只要有一个槽位是空串就直接抛 FormatException，而这段代码**不在 try 里**
 * （RepairCharacterDeck 在外面），一抛整段 FetchAsync 就断，等于登录失败。
 * 所以非 GUID 的槽位一律换成空 GUID，游戏自己的 RepairCharacterDeck 会补上。
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

/** 称号 id 解析：客户端把整个持有列表打包成 "id,id,..." 的字符串元素 */
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

/* ---------------- 排序 / 筛选（卡一览只能看到 4~5 张的真凶） ---------------- */

/**
 * `CardFilterType`（game.common.foundation）是**位掩码**，语义是「勾选要显示的卡」：
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
 * （逐个 dump_il 出来的：0x0F | 0x30 | 0xC0 | 0x700 | 0x3F800 | 0x1FC0000）
 *
 * 而卡一览的过滤逻辑（`CharacterCardReplacementListDataUtil.GenerateCardList`）是：
 *
 *     foreach (card in 全部卡) {
 *         if (!CardInfo.TryGet(...)) continue;
 *         if (CardType != 当前页签的 cardType) continue;
 *         data = new CharacterCardReplacementListData{ ... IsDecked = 是否已编入卡组 ... };
 *         if (CardListFilterEliminate(filterType, data)) continue;   // ← 位掩码没勾就丢弃
 *         list.Add(data);
 *     }
 *
 *     bool CardListFilterEliminate(t, data) {
 *         if (data.IsDecked) return false;          // 已编入卡组的卡**永远显示**
 *         if (RarityEliminate(t, data)) return true;
 *         if (LevelEliminate(t, data)) return true;
 *         ...
 *     }
 *
 * 所以 `filterType == 0`（NONE）时，**只有已经编进卡组的那几张卡能显示**。
 * 玩家的卡组是 5 张**租借卡**（`usr_deck` 里全是 `CharacterRentalCardMaster` 的 UserCardId），
 * 而 `RarityEliminate` 里 `rarity = card.IsRental ? 0 : card.CardRarity` ——
 * **租借卡一律按稀有度 0 显示，也就是 N**。
 *
 * 这就是「卡一览只有 4~5 张、全是 N 卡、看不到名字」的完整解释，跟卡数据一点关系都没有。
 *
 * 为什么 filterType 会是 0：游戏端 `PlayerSortSetting.Default`（全选）只在 `.cctor` 里构造，
 * 而 `CreateSortSetting(res)` 在服务端字段缺失/为 0 时用的是 `new PlayerSortSetting()`
 * —— 字段默认值 0。玩家不动筛选，上报的就一直是 0，服务端又原样回放 → 死循环。
 */
const CARD_FILTER_DEFAULT = 0x1ffffff;   // CardFilterTypeExtentions.DEFAULT
const MUSIC_FILTER_DEFAULT = 0xe21;      // FilterTypeExtensions.Default = 3617

/** 有序地列出 usr_sort_setting 的全部 12 个字段（3 组 × sort/filter/order） */
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
 * 修补 / 构造 usr_sort_setting。
 *
 * 规则：**值为 0 的 filter 字段一律换成「全选」**（0 在游戏里表示"一张都不勾"，
 * 玩家真想要筛选时会写成非 0，所以不会被误改）。
 * 缺字段时按游戏 `PlayerSortSetting.Default` 的默认值补齐，避免因为空节点退化。
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
    // 三个 filter 字段：0 = NONE = 什么都不显示，必须换成全选
    if (key.endsWith('_filter') && v === 0) node['@content'] = [def];
  }
  return out;
}

/**
 * 称号持有 = 存档 ∪ 静态基线。
 * 存档里是游戏自己维护的完整持有列表（含这一局新拿到的），基线保证
 * 首次登录就有整副称号可用；纯并集不会丢任何一边。
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
    enqueue(`!! 读取 ${file} 失败: ${e}\n`);
    return [];
  }
}

/**
 * 构建完整的玩家数据体 + 道具列表。
 * 顺序严格照 GetPlayDataModeler+ResponseXrpc 的字段声明，全部节点一个不能少
 * （GetPlayDataStepRunner 缺节点会判 RegisteredUserNoData → 新玩家流程）。
 */
export async function buildPlayerBody(): Promise<{ body: Record<string, any>; items: any[] }> {
  const items = await buildChartItems();
  const u = await loadUser();

  // 顺序严格照 GetPlayDataModeler+ResponseXrpc 的字段声明：
  //   usr_id(1), usr_profile(2), usr_play_info(3), usr_main_option(4), usr_privacy(5),
  //   usr_nametag(6), usr_sort_setting(7), usr_unlock_music(8), usr_item(9), …
  //   … usr_count(18)
  // 非标准字段（result / now_date / crew_id）一律放最后：它们不属于这个响应类型，
  // 夹在中间有可能打乱 XmlSerializer 的位置匹配。
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
    // 第 3 位：没有它游戏会判「无数据」→ 走新玩家流程，见 buildPlayInfo 注释
    usr_play_info: K.ATTR({}, buildPlayInfo()),
  };

  // usr_main_option：结构取 raw 模板（游戏上报的原始节点），值取 option（玩家最新设置）。
  // 见 buildMainOption 的注释 —— 类型错一个字段就会整段回退默认。
  body.usr_main_option = K.ATTR({}, buildMainOption(u));

  /*
   * 补齐 GetPlayDataResponse 声明的**全部**节点，一个都不能少：
   * GetPlayDataStepRunner 解析响应时，缺节点就会把 Result 判成
   * ResultType.RegisteredUserNoData(2) → 游戏走新玩家分支 → 设置全部回默认。
   *
   * 注意：`K.ATTR({}, {})` 空对象会被 asphyxia 的序列化器整个跳过（实测），
   * 所以每个节点里放一个游戏不认识的占位元素 `zzz` —— XmlSerializer
   * 对未知子元素的默认行为是忽略，节点本身却能正常出现在响应里。
   * 顺序照游戏声明：privacy(5) nametag(6) sort(7) unlock_music(8)
   *   item(9) name_titles(10) deck(11) character_card(12) character(13)
   *   login_bonus(14) music_mission(15) extend_music_mission(16) mission(17)
   *   count(18) chatstamp(19) action_count(20) notice(21)
   */

  /* ---- 登录奖励进度 ----
   * 优先用存档（游戏自己维护的进度），存档没有时退回 data/login_bonus.json 的全满基线。
   * 发空会让 playerData.LoginBonusInternal.Initialize(空) 把进度清零，
   * 表现就是「每次进游戏都重发每日奖励」。
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
          // event_id 必须是 `活动ID.表单ID`（正则 ^\d{5}\.\d{4}$），
          // 例如 00001.0001；只发活动 ID 会让 LoginBonusEventId 抛
          // FormatException → usr.get 解析失败 → 登录进不去。
          event_id: K.ITEM('str', x.event_id),
          progress: K.ITEM('s32', x.progress),
        })),
      });
    }
  }

  /* ---- 称号持有 ----
   * 存档（游戏上报的持有列表）∪ 静态基线。之前这条链是断的：
   * `usr_name_titles` 在 REPLAY_KEYS 里、却不在 RAW_KEYS 里 —— 想回放，
   * 但从来没存过，所以永远是静态 189 个，这一局新拿的称号下一局就没了。
   */
  const savedTitleIds = titleIdsFromRaw(rawNode(u, 'usr_name_titles'));
  const baselineTitles = (await readJsonArray('data/name_titles.json') as string[])
    .map((t) => String(t));
  const titleIds = mergeTitleIds(savedTitleIds, baselineTitles);
  if (titleIds.length > 0) {
    // 客户端 PlayerNameTagTitleInventory.OnPlayerDataFetched 会把每个 <title>
    // 再按 ',' 拆开解析，所以这里合成单个元素（省体积，语义不变）。
    body.usr_name_titles = K.ATTR({}, { title: [K.ITEM('str', titleIds.join(','))] });
  }

  const placeholder = () => K.ATTR({}, { zzz: K.ITEM('s32', 0) });
  body.usr_privacy = placeholder();
  body.usr_nametag = placeholder();
  body.usr_sort_setting = placeholder();
  body.usr_unlock_music = placeholder();

  /* ---- 角色 / 角色卡 ----
   * 基线（characters.json 的 113 张）+ 存档（游戏上报的真实状态）+ 本次会话抽到的卡。
   * 之前这里只发静态基线，`usr_character_card` 从不落库 ——
   * 「抽到的卡不保存 / 练过的卡白练」就是这个原因。
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
    // item_id 形如 chara_card.00030001，游戏用它判定「是否拥有这张卡」
    items.push(...cardItems(cards));
  }
  if (charas.length > 0) {
    body.usr_character = K.ATTR({}, { chara: charaNodes(charas) });
  }

  // 剧情票：わたこ ep1 各话的 RequireItem=True，GetStatus 里用
  // ItemInventory.HasItem(story.StoryId.ToItemId()) 判定，
  // 道具格式为 story.chara.{剧情号8位}（CharacterStoryId.ToItemId 硬编码）。
  // 有票 → 剧情状态 3（可看未读），配合 usr_count 的已读标记变 2。
  for (const sid of ['11000001', '11000002', '11000003', '11000004', '11000005']) {
    items.push(K.ATTR({}, {
      item_id: K.ITEM('str', `story.chara.${sid}`),
      count: K.ITEM('s32', 1),
      income: K.ITEM('s32', 0),
      expense: K.ITEM('s32', 0),
    }));
  }

  // 活动票券：各联动商店的支付货币（ChangeItemMaster 里 Source=ticket.event.*，
  // 每件商品价格 80~360 张）。官服靠打活动掉落，这里直接发满。
  // 数量由 WebUI 配置项 ticket_count 控制（默认 999 = 基本无限）。
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

  // 合并持久道具表（商店购买 / 抽卡奖励 / 打歌掉落等的跨局累计）
  mergePersistentItems(items, u);

  body.usr_item = K.ATTR({}, { item: items });

  /* ---- action count（PA 任务 / 称号条件的计数器）----
   * 游戏只上报增量日志，总量由服务端累加。
   */
  const actionCount = buildActionCountNode(u);
  if (actionCount) body.usr_action_count = actionCount;

  for (const key of [
    'usr_name_titles', 'usr_deck', 'usr_character_card', 'usr_character',
    'usr_login_bonus', 'usr_music_mission', 'usr_extend_music_mission',
    'usr_mission', 'usr_chatstamp', 'usr_action_count', 'usr_notice',
  ]) {
    if (body[key]) continue;   // 上面已经发过真实数据，不用占位符覆盖
    body[key] = placeholder();
  }

  /* ---- 纯透传节点回放 ---- */
  for (const key of REPLAY_KEYS) {
    // usr_sort_setting 不能纯透传：filter 为 0 时卡一览只显示已编入卡组的卡（见 fixSortSetting）
    if (key === 'usr_sort_setting') {
      body[key] = fixSortSetting(rawNode(u, key));
      continue;
    }
    const v = rawNode(u, key);
    if (isEmptyNode(v)) continue;   // 空的不能发：会让整个节点消失 → 被判新玩家
    if (key === 'usr_count' && charCfg.enabled && Array.isArray(charCfg.stories)) {
      // raw 里 usr_count = { count: [ {key,value}, … ] }（count 直接是数组）
      const arr = Array.isArray(v.count)
        ? v.count
        : v.count && Array.isArray(v.count.count)
          ? v.count.count
          : null;
      if (arr) {
        const have = new Set(arr.map((c: any) => {
          const kv = c && c.key && c.key['@content'];
          return Array.isArray(kv) ? kv[0] : kv;
        }));
        for (const sid of charCfg.stories) {
          const k = `Story.CharacterStoryId(${sid})`;
          if (!have.has(k)) {
            arr.push({
              key: { '@attr': { __type: 'str' }, '@content': k },
              value: { '@attr': { __type: 's32' }, '@content': [1] },
            });
          }
        }
      }
    }
    body[key] = v;
  }

  /* ---- 卡组：能回放就回放（卡组名 / 当前卡组）----
   * 之前因为角色卡是空的、卡组里指向不存在的卡会让组队界面出错，所以故意不回放。
   * 现在卡实例已经跟着存档走了，卡组可以安全回放 —— 但必须先把非法 GUID 消毒，
   * 见 sanitizeDeck 的注释（空 GUID 会让游戏端 new Guid("") 抛异常、整段登录失败）。
   */
  const deckRaw = rawNode(u, 'usr_deck');
  if (deckRaw && asArray(deckRaw.deck).length > 0 && cards.length > 0) {
    body.usr_deck = sanitizeDeck(deckRaw);
    // 把下发的卡组摘要记进 xrpc.log —— usr.get 的响应本身不落日志，
    // 排查「配队被重置」时这是唯一能证明「服务端到底发了什么」的痕迹。
    logDeckSummary(body.usr_deck, cards);
  }

  return { body, items };
}

/** 把回放的卡组摘要（每个槽位的 index 与归属）写进 xrpc.log */
function logDeckSummary(deckNode: any, cards: Array<{ index: string; item_id: string }>): void {
  try {
    const byIndex = new Map(cards.map((c) => [String(c.index), String(c.item_id)]));
    const lines: string[] = [`usr_deck 回放 ${asArray(deckNode?.deck).length} 组：`];
    for (const d of asArray(deckNode?.deck)) {
      const num = leaf(d?.deck_number);
      const slots: string[] = [];
      for (const key of ['contenter_index', 'supportsnap1_index', 'supportsnap2_index', 'supportsnap3_index', 'supportsnap4_index']) {
        const idx = String(leaf(d?.[key]) ?? '');
        const own = byIndex.get(idx);
        slots.push(`${idx.slice(0, 8) || '(空)'}${own ? '=' + own : ''}`);
      }
      lines.push(`  deck${num} select=${leaf(d?.is_select)} ${slots.join(' ')}`);
    }
    enqueue(lines.join('\n') + '\n');
  } catch (e) {
    enqueue(`!! deck 摘要记录失败: ${e}\n`);
  }
}
