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
