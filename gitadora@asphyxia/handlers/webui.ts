import { PlayerInfo } from "../models/playerinfo"
import { isValidPickerBoard, pickerToPlayerBoard } from "../models/playerboard"
import { Rival } from "../models/rival"
import Logger from "../utils/logger"

const logger = new Logger("webui")

export const updatePlayerInfo = async (data: {
  refid: string;
  version: string;
  name?: string;
  title?: string;
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

  await DB.Update<PlayerInfo>(
    data.refid,
    { collection: 'playerinfo', version: data.version },
    { $set: update }
  );
};

// The playerboard is edited only through the WebUI board editor (the game client displays the
// board but never sends edits back). The editor submits grid/size presets, which are converted
// to coordinates here so stored boards always stay on the official 3x5 grid.
export const updatePlayerBoard = async (data: {
  refid: string;
  version: string;
  board?: string;
}) => {
  if (data.refid == null || !data.version) return;
  if (data.board == null || data.board.trim().length === 0) return;

  let parsed: any;
  try {
    parsed = JSON.parse(data.board);
  } catch (e) {
    logger.error(`Failed to parse player board JSON for refid ${data.refid}: ${e}`);
    return;
  }

  if (!isValidPickerBoard(parsed)) {
    logger.error(`Rejected invalid player board for refid ${data.refid}`);
    return;
  }

  await DB.Update<PlayerInfo>(
    data.refid,
    { collection: 'playerinfo', version: data.version },
    { $set: { playerboard: pickerToPlayerBoard(parsed) } }
  );
};

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
