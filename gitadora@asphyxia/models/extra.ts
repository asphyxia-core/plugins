import { PLUGIN_VER } from "../const";

export interface Extra {
  collection: 'extra';

  game: 'gf' | 'dm';
  version: string;
  pluginVer: number
  id: number;

  playstyle: number[];
  custom: number[];
  list_1: number[];
  list_2: number[];
  list_3: number[];
  recommend_musicid_list: number[];
  reward_status: number[];
}

export function getDefaultExtra(game: 'gf' | 'dm', version: string, id: number) : Extra {
  const result : Extra = {
    collection: 'extra',
    pluginVer: PLUGIN_VER,

    game,
    version,
    id,
    playstyle: Array(50).fill(0),
    custom: Array(50).fill(0),
    list_1: Array(100).fill(-1),
    list_2: Array(100).fill(-1),
    list_3: Array(100).fill(-1),
    recommend_musicid_list: Array(5).fill(-1),
    reward_status: Array(50).fill(0),
  }
  result.playstyle[1] = 1    // Note scroll speed (should default to 1.0x)
  result.playstyle[36] = 20  // Unknown
  result.playstyle[48] = 20  // Unknown
  
  return result
}
