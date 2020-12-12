export interface Scores {
  collection: 'scores',

  scores: {
    [key: string]: {
      clearmedal?: number;
      clear_type?: number;
      clear_rank?: number;
      score: number;
      cnt: number;
    };
  };
}