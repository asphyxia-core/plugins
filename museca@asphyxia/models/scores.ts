export interface Scores {
  collection: 'scores',

  scores: {
    [mid: string]: {
      [type: string]: {
        score: number;
        count: number;
        clear_type: number;
        score_grade: number;
        btn_rate: number;
        long_rate: number;
        vol_rate: number;
      };
    }
  };
} 