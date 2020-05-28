export interface Profile {
  collection: 'profile';

  pluginVer: number;

  name: string;
  appeal: number;
  akaname: number;

  currency: {
    packets: number;
    blocks: number;
  };

  state: {
    lastMusicID: number;
    lastMusicType: number;
    sortType: number;
    headphone: number;
    blasterEnergy: number;
    blasterCount: number;
  };

  settings: {
    hiSpeed: number;
    laneSpeed: number;
    gaugeOption: number;
    arsOption: number;
    notesOption: number;
    earlyLateDisp: number;
    drawAdjust: number;
    effCLeft: number;
    effCRight: number;
    narrowDown: number;
  };
}
