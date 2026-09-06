import { PLUGIN_VER } from "../const";

export interface PlayerInfo {
  collection: 'playerinfo',

  pluginVer: number;

  id: number;
  version: string,
  name: string;
  title: string;

  card?: {
    id: number;
    position: number[];
    scale: number[];
    rotation: number;
  }[];

  /**
   * Playerboard data returned by gametop.get.
   *
   * `card` is kept for backwards compatibility with older documents. New
   * edits should use this wire-shaped representation so every playerboard
   * field can be changed from the WebUI.
   */
  playerboard?: {
    index: number;
    is_active: boolean;
    sticker: {
      id: number;
      pos_x: number;
      pos_y: number;
      scale_x: number;
      scale_y: number;
      rotate: number;
    }[];
  };
}

export function getDefaultPlayerInfo(version: string, id: number) : PlayerInfo {
  return {
    collection: 'playerinfo',
    pluginVer: PLUGIN_VER,
    id,
    version,
    name: 'ASPHYXIA-CORE USER',
    title: 'Please edit on WebUI',
  }
}
