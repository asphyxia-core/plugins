import { PLUGIN_VER } from "../const";

export interface Scores {
  collection: 'scores';

  game: 'gf' | 'dm';
  version?: string;
  pluginVer: number

  scores: {
    [mid: string]: {
      update: number[];
      diffs: {
        [seq: string]: {
          perc: number;
          rank: number;
          clear: boolean;
          fc: boolean;
          ex: boolean;
          meter: string;
          prog: number;
        };
      };
    };
  };
}

export function getDefaultScores (game: 'gf' | 'dm', version: string): Scores {
  return {
    collection: 'scores',
    version,
    pluginVer: PLUGIN_VER,
    game,
    scores: {}
  }
};