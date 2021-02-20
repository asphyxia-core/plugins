export interface Profile {
  collection: 'profile',

  unlockAll: boolean;
  history: {
    chara: number;
    level: number;
    mid: number;
    style: number;
  };
  charas: { [id: string]: number };
}