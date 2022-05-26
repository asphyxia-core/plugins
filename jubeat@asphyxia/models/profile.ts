export default interface Profile {
  collection: 'profile';

  jid: number;
  name: string;

  ripples?: Ripples;
}

export interface Ripples {
  info?: {
    onlineCount: number;
    multiCount: number;
    matchCount: number;
    beatCount: number;
    saveCount: number;
    savedCount: number;
    grade: number;
    gradePoint: number;
  };

  last?: {
    mode: number;
    musicId: number;
    seqId: number;
    marker: number;
    title: number;
    theme: number;
    sort: number;
    filter: number;
    rankSort: number;
    comboDisp: number;
  };
}
