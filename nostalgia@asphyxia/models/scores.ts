export interface Scores {
  collection: 'scores',
  
    recitals: {
      [key: string]: {
        count: number;
        hall: number;
        cat: number[];
        audience: number;
        money: number;
        fame: number;
        player: number;
        score: number;
        start: string;
        end: string;
      };
    };
    scores: {
      [key: string]: {
        score: number;
        grade: number;
        recital: number;
        count: number;
        clear: number;
        multi: number;
        mode: number;
        flag: number;
      };
    };
  }