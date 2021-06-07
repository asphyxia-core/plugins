export enum Difficulty {
  SINGLE_BEGINNER,
  SINGLE_BASIC,
  SINGLE_DIFFICULT,
  SINGLE_EXPERT,
  SINGLE_CHALLENGE,
  DOUBLE_BASIC,
  DOUBLE_DIFFICULT,
  DOUBLE_EXPERT,
  DOUBLE_CHALLENGE
}

export enum Rank {
  AAA,
  AA_PLUS,
  AA,
  AA_MINUS,
  A_PLUS,
  A,
  A_MINUS,
  B_PLUS,
  B,
  B_MINUS,
  C_PLUS,
  C,
  C_MINUS,
  D_PLUS,
  D,
  E
}

export enum ClearKind {
  NONE = 6,
  GOOD_COMBO,
  GREAT_COMBO,
  PERPECT_COMBO,
  MARVELOUS_COMBO
}

export interface Score {
  collection: "score";

  songId: number;
  difficulty: Difficulty;
  rank: Rank;
  clearKind: ClearKind;
  score: number;
  maxCombo: number;
}
