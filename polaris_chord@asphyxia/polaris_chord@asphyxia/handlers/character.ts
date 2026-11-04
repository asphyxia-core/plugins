/*
 * Characters / character cards: static baseline (data/characters.json) merged with the
 * savedata (reported by usr.save) before being sent down.
 *
 * usr_character(13) / usr_character_card(12) must be paired with the
 * `chara_card.{card number}` items in usr_item — the game uses the item to decide
 * "do I own this card".
 *
 * The "plain data" types here (PlainCard / PlainChara) are the **only** intermediate
 * representation:
 *   data/characters.json ─┐
 *   nodes reported by usr.save ──┼→ merge → PlainCard[] → XML nodes / usr_item
 *   card instances from gacha ─────┘
 * Previously the XML was assembled straight from characters.json and never persisted,
 * so "cards drawn / cards trained" fell back to the static 113 cards every session.
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

/* ---------------- plain data → XML nodes ---------------- */

/**
 * [Field names MUST be lower_snake_case] decompiling with ilspycmd shows
 * Game.Common.Infra.Arcade.Network.UsrData.UsrCharacterCard has [XmlElement] on every
 * member:
 *   index / item_id / card_limit_over_count / character_card_exp /
 *   character_card_skill_exp / additional_skills(skill_id) / is_favorite /
 *   source / deleted / created_at
 * XmlSerializer is strictly case-sensitive — sending PascalCase (Index/ItemId/…) makes
 * every card's item_id parse as empty → LoadCharacterCard's ItemId.TryParse("") fails →
 * all of them get filtered out.
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
      // An empty array is skipped wholesale by asphyxia's serializer (the node vanishes),
      // so only send this when there really are skills — otherwise don't send the node at
      // all (it defaults to an empty List inside UsrCharacterCard)
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
    // UsrCharacter.CharacterId is XrpcString ([XmlText] string), so send it as str
    chara_id: K.ITEM('str', String(c.chara_id ?? '0')),
    closeness: K.ITEM('s32', Number(c.closeness) || 0),
    home_touch_count: K.ITEM('s32', Number(c.home_touch_count) || 0),
  }));
}

/** Character card items (appended to usr_item; the game checks "own this card" with them) */
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

/* ---------------- legacy interface compatibility ---------------- */

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

/* ---------------- XML nodes → plain data ---------------- */

function leaf(node: any): any {
  const c = node?.['@content'];
  return Array.isArray(c) ? c[0] : c;
}

function asArray(v: any): any[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Parse usr_character_card from the savedata (raw node shape: {card: [...]}) */
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

/** Parse usr_character from the savedata (raw node shape: {chara: [...]}) */
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

/* ---------------- merge ---------------- */

/**
 * Card instance merge: baseline (every card in master) → savedata (the latest state reported
 * by the game) → temporary gacha instances.
 *
 * - For the same index **the savedata wins**: exp, limit break, favorites and skills are the
 *   player's real state;
 * - New cards in the savedata (indexes the baseline does not have) are appended, so drawn
 *   cards are not lost when the baseline overwrites;
 * - Cards marked `deleted` are dropped (the game flags them as deleted);
 * - Gacha instances that already appear in the savedata (after the next usr.save) are
 *   de-duplicated by index, so they do not double.
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
      out[at] = c;   // later ones overwrite earlier ones (savedata > baseline)
    }
  };
  for (const c of baseline) push(c);
  for (const c of saved) push(c);
  for (const c of extra) {
    if (pos.has(c.index)) continue;   // already in the savedata, keep the player's version
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

/** Character merge: by chara_id, the savedata (closeness / head-pat count) overwrites baseline */
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
 * Pull the merged card / character lists out of the savedata (used by playerdata).
 * When the savedata holds no cards at all, fall back to the pure baseline.
 */
export function savedCardState(u: XifUser): { cards: PlainCard[]; charas: PlainChara[] } {
  const cardRaw = rawNode(u, 'usr_character_card');
  const charaRaw = rawNode(u, 'usr_character');
  return { cards: parseCards(cardRaw), charas: parseCharas(charaRaw) };
}
