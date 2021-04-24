export class Score {
  collection: "score" = "score";

  musicId: number;
  seq: number;
  score: number = 0;
  clearType: number = 0;
  playCount: number = 0;
  clearCount: number = 0;
  fullcomboCount: number = 0;
  excellentCount: number = 0;
  isHardmodeClear: boolean;
  bar: number[];
}
