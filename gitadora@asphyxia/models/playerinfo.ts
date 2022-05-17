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

  // TODO: Add Board things.
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
