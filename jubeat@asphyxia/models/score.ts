export interface Score {
    collection: "score";
  
    musicId: number;
    seq: number;
    score: number;
    clear: number;
    musicRate: number;
    bar: number[];
    playCount: number;
    clearCount: number;
    fullcomboCount: number;
    excellentCount: number;
    isHardMode: boolean;
  }