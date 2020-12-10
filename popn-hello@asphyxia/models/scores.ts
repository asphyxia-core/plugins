export interface Scores {
  collection: 'scores',

  scores: {
    [mid: string]: {
      [style: string]: {
        [level: string]: {
          score: number;
          clear: number;
        };
      };
    }
  };
}