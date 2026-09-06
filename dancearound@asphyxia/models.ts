export type FumenType = 'BASIC' | 'ADVANCED' | 'MASTER';

export interface PrivacySetting {
  publishSetting: number;
}

export interface DancerGrade {
  grade: number;
  gvGauge: number;
  achievedGv: number;
  receivedGv: number;
  increaseGv: number;
}

export interface AvatarSetting {
  physique: number;
  skinColor: number;
  face: number;
  eyeColor: number;
  hairstyle: number;
  hairColor: number;
  costumeUpper: number;
  costumeLower: number;
  accessoryHead: number;
  accessoryFace: number;
  accessoryBody: number;
  accessoryHand: number;
  baseChara: number;
}

export interface PlayOptionSetting {
  noteSpeed: number;
  noteSize: number;
  judgeSeType: number;
  judgeSeVolume: number;
  judgeTiming: number;
  noteTiming: number;
  guide: number;
  invert: number;
  stealth: number;
  timelineDisplay: number;
  avatarAction: number;
  timelineModelDirection: number;
  avatarModelDirection: number;
}

export interface PlayInfo {
  locationId: string;
  modeId: number;
  styleId: number;
  folderId: number;
  musicId: number;
  fumenType: FumenType;
  startDate: number;
  endDate: number;
  lightPlayCount: number;
  standardPlayCount: number;
  trainingPlayCount: number;
  pcbId: string;
  softcode: string;
}

export interface UnlockMusicEntry {
  musicId: number;
  fumens: FumenType[];
}

export interface ViewFlagEntry {
  viewId: string;
  flag: number;
}

export interface MusicUnlockGaugeEntry {
  eventId: string;
  progress: number;
}

export interface DeltaEntry {
  name: string;
  income: number;
  expense: number;
}

export interface ProfileDocument {
  collection: 'profile';
  schemaVersion: number;
  name: string;
  dataId: string;
  cardNumber: string;
  userCode: number;
  dancerId: string;
  privacy: PrivacySetting;
  dancerGrade: DancerGrade;
  avatar: AvatarSetting;
  playOption: PlayOptionSetting;
  playInfo: PlayInfo;
  unlockedMusics: UnlockMusicEntry[];
  viewFlags: ViewFlagEntry[];
  musicUnlockGauges: MusicUnlockGaugeEntry[];
  deltaGroup: DeltaEntry[];
  loginCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface StageResult {
  musicId: number;
  fumenType: FumenType;
  clearStatus: number;
  score: number;
  rank: number;
  combo: number;
  perfect: number;
  great: number;
  good: number;
  bad: number;
}

export interface MusicScoreEntry extends StageResult {
  gameStartDate: number;
  mode: number;
  style: number;
  stageNo: number;
  playCount: number;
  playDate: number;
  bestScoreDate: number;
  pcbId: string;
  locationId: string;
  shopName: string;
  recordCount: number;
  gvScore: number;
  dropFrame: number;
  dropFrameMax: number;
  dropCount: number;
  videoKey: string;
}

export interface ScoreDocument {
  collection: 'scores';
  schemaVersion: number;
  entries: MusicScoreEntry[];
  updatedAt: number;
}

export interface MotionEntry {
  motionId: string;
  active: boolean;
  publishSetting: number;
  playCount: number;
  totalGv: number;
  playResult: StageResult;
  playDate: number;
  locationId: string;
  shopName: string;
  avatar: AvatarSetting;
  motionFullBase64: string;
  motionPreviewBase64: string;
  createdAt: number;
}

export interface MotionDocument {
  collection: 'motions';
  schemaVersion: number;
  entries: MotionEntry[];
  updatedAt: number;
}
