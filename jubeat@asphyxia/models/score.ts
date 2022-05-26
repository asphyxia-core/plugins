export interface Score {
  collection: 'score';

  musicId: number;
  seqId: number;
  score: number;
  clearFlag: number;
  maxCombo: number;
  marker: number;
  theme: number;
  musicBar: number[];
  playCount: number;
  clearCount: number;
  fullComboCount: number;
  excCount: number;
}
