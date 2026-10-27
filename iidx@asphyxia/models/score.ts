export interface score {
  collection: "score";

  mid: number;

  pgArray: number[];
  gArray: number[];
  mArray: number[];
  cArray: number[];
  rArray: number[];
  esArray: number[];

  optArray: number[];
  opt2Array: number[];
  playTimeArray?: number[];
}

export interface score_top {
  collection: "score_top";

  play_style: number;
  mid: number;

  names: string[];
  scores: number[];
  clflgs: number[];
}

export interface old_score {
  music_id: number;

  spmArray: number[];
  dpmArray: number[];

  optArray: number[];
  opt2Array: number[];

  option_1: number;
  option_2: number;
}
