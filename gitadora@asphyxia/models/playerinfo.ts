export interface PlayerInfo {
  collection: 'playerinfo',

  pluginVer: Number;

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