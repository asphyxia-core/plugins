export interface Extra {
  collection: 'extra';

  game: 'gf' | 'dm';
  version: string;
  pluginVer: number
  id: number;

  playstyle: number[];
  custom: number[];
  list_1: number[];
  list_2: number[];
  list_3: number[];
}