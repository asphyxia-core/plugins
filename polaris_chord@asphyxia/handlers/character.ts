/*
 * 角色 / 角色卡：静态基线（data/characters.json）与存档（usr.save 上报）合并后下发。
 *
 * usr_character(13) / usr_character_card(12) 必须与 usr_item 里的
 * `chara_card.{卡号}` 道具配套 —— 游戏用道具判定「是否拥有这张卡」。
 *
 * 这里的「纯数据」类型（PlainCard / PlainChara）是**唯一**的中间表示：
 *   data/characters.json ─┐
 *   usr.save 上报的节点 ──┼→ merge → PlainCard[] → XML 节点 / usr_item
 *   抽卡生成的卡实例 ─────┘
 * 之前直接拿 characters.json 拼 XML、从不落库，所以「抽到的卡 / 练过的卡」
 * 每局都退回静态 113 张的样子。
 */

import { enqueue } from './common';
import { ExtraCard, XifUser, rawNode } from './store';

export type PlainChara = {
  chara_id: number | string;
  closeness?: number;
  home_touch_count?: number;
};

export type PlainCard = {
  index: string;
  item_id: string;
  card_limit_over_count?: number;
  character_card_exp?: number;
  character_card_skill_exp?: number;
  is_favorite?: boolean;
  source?: number;
  deleted?: boolean;
  created_at?: string;
  additional_skills?: string[];
};

export type CharacterCfg = {
  enabled: boolean;
  characters: PlainChara[];
  cards: PlainCard[];
  stories?: string[];
};

let characterCache: CharacterCfg | null = null;

export async function loadCharacters(): Promise<CharacterCfg> {
  if (characterCache) return characterCache;
  const empty: CharacterCfg = { enabled: false, characters: [], cards: [] };
  try {
    const p = IO.Resolve('data/characters.json');
    if (IO.Exists(p)) {
      const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
      if (raw) characterCache = JSON.parse(raw) as CharacterCfg;
    }
  } catch (e) {
    enqueue(`!! failed to load data/characters.json: ${e}\n`);
  }
  return characterCache || empty;
}

/* ---------------- 纯数据 → XML 节点 ---------------- */

/**
 * 【字段名必须小写下划线】ilspycmd 反编译
 * Game.Common.Infra.Arcade.Network.UsrData.UsrCharacterCard 确认每个成员都带 [XmlElement]：
 *   index / item_id / card_limit_over_count / character_card_exp /
 *   character_card_skill_exp / additional_skills(skill_id) / is_favorite /
 *   source / deleted / created_at
 * XmlSerializer 严格区分大小写 —— 发 PascalCase（Index/ItemId/…）会让每张卡的
 * item_id 解析为空 → LoadCharacterCard 的 ItemId.TryParse("") 失败 → 全部被过滤。
 */
export function cardNodes(cards: PlainCard[]): any[] {
  return cards.map((c) => {
    const skills = Array.isArray(c.additional_skills) ? c.additional_skills : [];
    return K.ATTR({}, {
      index: K.ITEM('str', String(c.index || '')),
      item_id: K.ITEM('str', String(c.item_id || '')),
      card_limit_over_count: K.ITEM('s32', Number(c.card_limit_over_count) || 0),
      character_card_exp: K.ITEM('s32', Number(c.character_card_exp) || 0),
      character_card_skill_exp: K.ITEM('s32', Number(c.character_card_skill_exp) || 0),
      // 空数组会被 asphyxia 的序列化器整个跳过（节点消失），
      // 所以只有真有技能时才发，否则干脆不发这个节点（UsrCharacterCard 里默认就是空 List）
      ...(skills.length > 0
        ? { additional_skills: K.ATTR({}, { skill_id: skills.map((s) => K.ITEM('str', s)) }) }
        : {}),
      is_favorite: K.ITEM('bool', c.is_favorite ? 1 : 0),
      source: K.ITEM('s32', Number(c.source) || 0),
      deleted: K.ITEM('bool', c.deleted ? 1 : 0),
      created_at: K.ITEM('str', c.created_at || '2026-01-01T00:00:00.0000000Z'),
    });
  });
}

export function charaNodes(charas: PlainChara[]): any[] {
  return charas.map((c) => K.ATTR({}, {
    // UsrCharacter.CharacterId 是 XrpcString（[XmlText] string），按 str 发
    chara_id: K.ITEM('str', String(c.chara_id ?? '0')),
    closeness: K.ITEM('s32', Number(c.closeness) || 0),
    home_touch_count: K.ITEM('s32', Number(c.home_touch_count) || 0),
  }));
}

/** 角色卡道具（追加进 usr_item，游戏用它判定「是否拥有这张卡」） */
export function cardItems(cards: PlainCard[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const c of cards) {
    const id = String(c.item_id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(K.ATTR({}, {
      item_id: K.ITEM('str', id),
      count: K.ITEM('s32', 1),
      income: K.ITEM('s32', 0),
      expense: K.ITEM('s32', 0),
    }));
  }
  return out;
}

/* ---------------- 兼容旧接口 ---------------- */

export async function buildCharacterNodes(cfg: CharacterCfg): Promise<Record<string, any>> {
  const res: Record<string, any> = {};
  if (!cfg.enabled) return res;
  res.usr_character = K.ATTR({}, { chara: charaNodes(cfg.characters || []) });
  res.usr_character_card = K.ATTR({}, { card: cardNodes(cfg.cards || []) });
  return res;
}

export function buildCharacterItems(cfg: CharacterCfg): any[] {
  if (!cfg.enabled) return [];
  return cardItems(cfg.cards || []);
}

/* ---------------- XML 节点 → 纯数据 ---------------- */

function leaf(node: any): any {
  const c = node?.['@content'];
  return Array.isArray(c) ? c[0] : c;
}

function asArray(v: any): any[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** 解析存档里的 usr_character_card（raw 节点形态：{card: [...]}) */
export function parseCards(raw: any): PlainCard[] {
  const out: PlainCard[] = [];
  for (const c of asArray(raw?.card)) {
    if (!c || typeof c !== 'object') continue;
    const index = String(leaf(c.index) ?? '');
    const itemId = String(leaf(c.item_id) ?? '');
    if (!index || !itemId) continue;
    out.push({
      index,
      item_id: itemId,
      card_limit_over_count: Number(leaf(c.card_limit_over_count) ?? 0) || 0,
      character_card_exp: Number(leaf(c.character_card_exp) ?? 0) || 0,
      character_card_skill_exp: Number(leaf(c.character_card_skill_exp) ?? 0) || 0,
      is_favorite: Number(leaf(c.is_favorite) ?? 0) !== 0,
      source: Number(leaf(c.source) ?? 0) || 0,
      deleted: Number(leaf(c.deleted) ?? 0) !== 0,
      created_at: String(leaf(c.created_at) ?? ''),
      additional_skills: asArray(c.additional_skills?.skill_id).map((s) => String(leaf(s) ?? '')).filter(Boolean),
    });
  }
  return out;
}

/** 解析存档里的 usr_character（raw 节点形态：{chara: [...]}) */
export function parseCharas(raw: any): PlainChara[] {
  const out: PlainChara[] = [];
  for (const c of asArray(raw?.chara)) {
    if (!c || typeof c !== 'object') continue;
    const id = String(leaf(c.chara_id) ?? '');
    if (!id) continue;
    out.push({
      chara_id: id,
      closeness: Number(leaf(c.closeness) ?? 0) || 0,
      home_touch_count: Number(leaf(c.home_touch_count) ?? 0) || 0,
    });
  }
  return out;
}

/* ---------------- 合并 ---------------- */

/**
 * 卡实例合并：基线（master 里所有卡）→ 存档（游戏上报的最新状态）→ 抽卡临时实例。
 *
 * - 同 index 时**以存档为准**：经验、界限突破、收藏、技能都是玩家真实状态；
 * - 存档里的新卡（基线没有的 index）追加，抽到的卡不会因为基线覆盖而消失；
 * - `deleted` 的卡丢弃（游戏会把它标成已删除）；
 * - 抽卡实例若已出现在存档里（下次 usr.save 之后）按 index 去重，不会翻倍。
 */
export function mergeCards(
  baseline: PlainCard[],
  saved: PlainCard[],
  extra: ExtraCard[] = []
): PlainCard[] {
  const out: PlainCard[] = [];
  const pos = new Map<string, number>();
  const push = (c: PlainCard) => {
    if (!c || !c.index || !c.item_id || c.deleted) return;
    const at = pos.get(c.index);
    if (at === undefined) {
      pos.set(c.index, out.length);
      out.push(c);
    } else {
      out[at] = c;   // 后来的覆盖前面的（存档 > 基线）
    }
  };
  for (const c of baseline) push(c);
  for (const c of saved) push(c);
  for (const c of extra) {
    if (pos.has(c.index)) continue;   // 存档里已经有了，保留玩家版本
    push({
      index: c.index,
      item_id: c.item_id,
      card_limit_over_count: c.card_limit_over_count || 0,
      character_card_exp: c.character_card_exp || 0,
      character_card_skill_exp: c.character_card_skill_exp || 0,
      is_favorite: !!c.is_favorite,
      source: c.source || 0,
      created_at: c.created_at || '',
    });
  }
  return out;
}

/** 角色合并：按 chara_id，存档（亲密度/摸头次数）覆盖基线 */
export function mergeCharas(baseline: PlainChara[], saved: PlainChara[]): PlainChara[] {
  const out: PlainChara[] = [];
  const pos = new Map<string, number>();
  const push = (c: PlainChara) => {
    const id = String(c.chara_id ?? '');
    if (!id) return;
    const at = pos.get(id);
    if (at === undefined) {
      pos.set(id, out.length);
      out.push(c);
    } else {
      out[at] = c;
    }
  };
  for (const c of baseline) push(c);
  for (const c of saved) push(c);
  return out;
}

/**
 * 从存档取出合并后的卡/角色列表（供 playerdata 使用）。
 * 存档里没有任何卡时退回纯基线。
 */
export function savedCardState(u: XifUser): { cards: PlainCard[]; charas: PlainChara[] } {
  const cardRaw = rawNode(u, 'usr_character_card');
  const charaRaw = rawNode(u, 'usr_character');
  return { cards: parseCards(cardRaw), charas: parseCharas(charaRaw) };
}
