import { PlayerInfo } from "../models/playerinfo"
import { Rival } from "../models/rival"

export const updatePlayerInfo = async (data: {
  refid: string;
  version: string;
  name?: string;
  title?: string;
  playerboard?: string | PlayerInfo['playerboard'];
}) => {
  if (data.refid == null) return;

  const update: Update<PlayerInfo>['$set'] = {};

  if (data.name && data.name.length > 0) {
    //TODO: name validator
    update.name = data.name;
  }

  if (data.title && data.title.length > 0) {
    //TODO: title validator
    update.title = data.title;
  }

  if (data.playerboard !== undefined) {
    const playerboard = parsePlayerBoard(data.playerboard);
    if (playerboard) update.playerboard = playerboard;
  }

  await DB.Update<PlayerInfo>(
    data.refid,
    { collection: 'playerinfo', version: data.version },
    { $set: update }
  );
};

/** Parse and normalize the JSON editor payload before persisting it. */
function parsePlayerBoard(input: string | PlayerInfo['playerboard']): PlayerInfo['playerboard'] | null {
  let value: any = input;
  if (typeof input === 'string') {
    try {
      value = input.trim() ? JSON.parse(input) : {};
    } catch (error) {
      console.warn('[gitadora] Ignoring invalid playerboard JSON:', error);
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const numberOr = (candidate: unknown, fallback: number) => {
    const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const boolOr = (candidate: unknown, fallback: boolean) => {
    if (candidate === undefined || candidate === null || candidate === '') return fallback;
    if (typeof candidate === 'boolean') return candidate;
    if (candidate === 1 || candidate === '1' || candidate === 'true') return true;
    if (candidate === 0 || candidate === '0' || candidate === 'false') return false;
    return fallback;
  };

  const stickers = Array.isArray(value.sticker) ? value.sticker : [];
  const normalizedStickers = stickers.slice(0, 11).reduce((result: any[], sticker: any) => {
    if (!sticker || typeof sticker !== 'object') return result;
    const position = Array.isArray(sticker.position) ? sticker.position : [];
    const scale = Array.isArray(sticker.scale) ? sticker.scale : [];
    const id = numberOr(sticker.id, NaN);
    const posX = numberOr(sticker.pos_x ?? position[0], NaN);
    const posY = numberOr(sticker.pos_y ?? position[1], NaN);
    const scaleX = numberOr(sticker.scale_x ?? scale[0], NaN);
    const scaleY = numberOr(sticker.scale_y ?? scale[1], NaN);
    const rotate = numberOr(sticker.rotate ?? sticker.rotation, NaN);
    if (![id, posX, posY, scaleX, scaleY, rotate].every(Number.isFinite)) return result;
    result.push({
      id: Math.trunc(id),
      pos_x: posX,
      pos_y: posY,
      scale_x: scaleX,
      scale_y: scaleY,
      rotate,
    });
    return result;
  }, []);

  return {
    index: Math.trunc(numberOr(value.index, 1)),
    is_active: boolOr(value.is_active, false),
    sticker: normalizedStickers,
  };
}

/**
 * Replace the rival list for one game/version pair.
 *
 * Rival documents live in the owner's profile space, so removing a player from
 * Asphyxia also removes their outgoing rival list automatically.
 */
export const updateRival = async (data: {
  refid: string;
  version: string;
  game: 'gf' | 'dm';
  rival1?: string;
  rival2?: string;
  rival3?: string;
  rival4?: string;
  rival5?: string;
}) => {
  if (!data.refid || !data.version || (data.game !== 'gf' && data.game !== 'dm')) return;

  const requestedRefids = [data.rival1, data.rival2, data.rival3, data.rival4, data.rival5];
  const seenRefids = new Set<string>();
  const rivalSlots = requestedRefids.reduce((result: Array<{ rivalRefid: string; slot: number }>, input, index) => {
    const rivalRefid = input?.trim();
    if (!rivalRefid || rivalRefid === data.refid || seenRefids.has(rivalRefid)) return result;
    seenRefids.add(rivalRefid);
    result.push({ rivalRefid, slot: index + 1 });
    return result;
  }, [] as Array<{ rivalRefid: string; slot: number }>);

  // Store only players that have a profile in the same game version. This keeps
  // the later game response from referencing a player whose DID/profile is absent.
  const validRivalSlots: Array<{ rivalRefid: string; slot: number }> = [];
  for (const rival of rivalSlots) {
    const player = await DB.FindOne<PlayerInfo>(rival.rivalRefid, {
      collection: 'playerinfo',
      version: data.version,
    });
    if (player) validRivalSlots.push(rival);
  }

  await DB.Remove<Rival>(data.refid, {
    collection: 'rival',
    game: data.game,
    version: data.version,
  });

  for (const { rivalRefid: rival_refid, slot } of validRivalSlots) {
    await DB.Insert<Rival>(data.refid, {
      collection: 'rival',
      game: data.game,
      version: data.version,
      rival_refid,
      slot,
    });
  }
};












