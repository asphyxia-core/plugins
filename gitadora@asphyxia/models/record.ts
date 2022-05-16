import { PLUGIN_VER } from "../const";

export interface Record {
  collection: 'record';

  game: 'gf' | 'dm';
  version: string;
  pluginVer: number

  diff_100_nr: number;
  diff_150_nr: number;
  diff_200_nr: number;
  diff_250_nr: number;
  diff_300_nr: number;
  diff_350_nr: number;
  diff_400_nr: number;
  diff_450_nr: number;
  diff_500_nr: number;
  diff_550_nr: number;
  diff_600_nr: number;
  diff_650_nr: number;
  diff_700_nr: number;
  diff_750_nr: number;
  diff_800_nr: number;
  diff_850_nr: number;
  diff_900_nr: number;
  diff_950_nr: number;
  diff_100_clear: number[];
  diff_150_clear: number[];
  diff_200_clear: number[];
  diff_250_clear: number[];
  diff_300_clear: number[];
  diff_350_clear: number[];
  diff_400_clear: number[];
  diff_450_clear: number[];
  diff_500_clear: number[];
  diff_550_clear: number[];
  diff_600_clear: number[];
  diff_650_clear: number[];
  diff_700_clear: number[];
  diff_750_clear: number[];
  diff_800_clear: number[];
  diff_850_clear: number[];
  diff_900_clear: number[];
  diff_950_clear: number[];
}

export function getDefaultRecord(game: 'gf' | 'dm', version: string): Record {
  return {
    collection: 'record',
    pluginVer: PLUGIN_VER,
    game,
    version,

    diff_100_nr: 0,
    diff_150_nr: 0,
    diff_200_nr: 0,
    diff_250_nr: 0,
    diff_300_nr: 0,
    diff_350_nr: 0,
    diff_400_nr: 0,
    diff_450_nr: 0,
    diff_500_nr: 0,
    diff_550_nr: 0,
    diff_600_nr: 0,
    diff_650_nr: 0,
    diff_700_nr: 0,
    diff_750_nr: 0,
    diff_800_nr: 0,
    diff_850_nr: 0,
    diff_900_nr: 0,
    diff_950_nr: 0,
    diff_100_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_150_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_200_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_250_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_300_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_350_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_400_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_450_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_500_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_550_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_600_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_650_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_700_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_750_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_800_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_850_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_900_clear: [0, 0, 0, 0, 0, 0, 0],
    diff_950_clear: [0, 0, 0, 0, 0, 0, 0],
  }
}
