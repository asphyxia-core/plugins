/**
 * One chart's record, shared by every version.
 *
 * `clear` holds the game's clear flags, which every version numbers the same
 * way (see `Flag` in handlers/scores.ts). Versions before festo only have
 * normal mode, so they only read and write records with `isHardMode: false`.
 */
export interface Score {
  collection: "score";

  musicId: number;
  seq: number;
  score: number;
  clear: number;
  /** festo only. */
  musicRate?: number;
  bar?: number[];
  playCount: number;
  clearCount: number;
  fullcomboCount: number;
  excellentCount: number;
  isHardMode: boolean;
}
