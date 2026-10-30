import { PLUGIN_VER } from "../const";

const DEFAULT_NAME = 'ASPHYXIA-CORE USER';
const DEFAULT_TITLE = 'Please edit on WebUI';

export interface PlayerInfo {
  collection: 'playerinfo',

  pluginVer: number;

  id: number;
  version: string,
  name: string;
  title: string;

  /** Legacy (pre-playerboard) sticker list. Still read when `playerboard` is absent. */
  card?: {
    id: number;
    position: number[];
    scale: number[];
    rotation: number;
    /** 0-based WebUI slot index. Not sent to the game. */
    slot?: number;
  }[];

  /** Legacy background sheet id that accompanied `card`. */
  sheet?: number;

  /**
   * Playerboard data returned by gametop.get, stored wire-shaped.
   *
   * Written by the WebUI editor (see models/playerboard.ts): stickers sit on the
   * fixed 3x5 grid in one of two sizes, the background is kept separately in
   * `sheet` and sent first. Documents without `sheet` were written by the older
   * free-placement editor, where sticker[0] is the background.
   */
  playerboard?: {
    index: number;
    is_active: boolean;
    sheet?: number | null;
    sticker: {
      id: number;
      pos_x: number;
      pos_y: number;
      scale_x: number;
      scale_y: number;
      rotate: number;
      /** 0-based WebUI slot index. Not sent to the game. */
      slot?: number;
    }[];
  };
}

export function getDefaultPlayerInfo(version: string, id: number) : PlayerInfo {
  return {
    collection: 'playerinfo',
    pluginVer: PLUGIN_VER,
    id,
    version,
    name: DEFAULT_NAME,
    title: DEFAULT_TITLE,
  }
}

/**
 * Finds a playerinfo document from any other version for this refid, so a version
 * played for the first time can inherit the player's existing name/title instead
 * of resetting to the default. Prefers a version where the name/title were already
 * customized over one still sitting on the default placeholder values.
 */
export async function findInheritablePlayerInfo(refid: string): Promise<PlayerInfo | null> {
  const infos = await DB.Find<PlayerInfo>(refid, { collection: 'playerinfo' });
  if (!infos || infos.length === 0) {
    return null;
  }

  // Older builds used empty strings as the placeholder, so treat those as defaults too.
  const isDefaultName = (name?: string) => !name || name === DEFAULT_NAME;
  const isDefaultTitle = (title?: string) => !title || title === DEFAULT_TITLE;
  const customized = infos.find(info => !isDefaultName(info.name) || !isDefaultTitle(info.title));
  return customized ?? infos[0];
}
