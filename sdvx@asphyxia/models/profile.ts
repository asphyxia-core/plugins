export interface Profile {
  collection: 'profile';

  pluginVer: number;

  id: number;
  name: string;
  appeal: number;
  akaname: number;

  packets: number;
  blocks: number;

  expPoint: number;
  mUserCnt: number;

  musicID: number;
  musicType: number;
  sortType: number;
  headphone: number;
  blasterEnergy: number;
  blasterCount: number;
  extrackEnergy: number;
  appeal_frame: number;
  support_team: number;

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
  
  bgm: number;
  subbg: number;
  nemsys: number;
  
  stampA: number;
  stampB: number;
  stampC: number;
  stampD: number;

  stampA_R: number;
  stampB_R: number;
  stampC_R: number;
  stampD_R: number;
  mainbg: number;

  boothFrame: number[];
}
