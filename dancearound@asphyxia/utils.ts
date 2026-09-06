/// <reference lib="es2020.bigint" />

declare const Buffer: any;

import {
  AvatarSetting,
  DancerGrade,
  DeltaEntry,
  FumenType,
  MotionEntry,
  MusicScoreEntry,
  MusicUnlockGaugeEntry,
  PlayInfo,
  PlayOptionSetting,
  ProfileDocument,
  StageResult,
  UnlockMusicEntry,
  ViewFlagEntry,
} from './models';

export const PROFILE_SCHEMA_VERSION = 1;

export function nowMs(): number {
  return Date.now();
}

export function nowS64(): bigint {
  return BigInt(Date.now());
}

export function makeUserCode(refid: string): number {
  let hash = 2166136261;
  for (let i = 0; i < refid.length; ++i) {
    hash ^= refid.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return 100000000 + (hash % 900000000);
}

export function makeDancerId(userCode: number): string {
  return `${userCode}`.padStart(9, '0');
}

export function makeUuid(): string {
  const bytes = Buffer.alloc(16);
  let timestamp = Date.now();
  for (let i = 0; i < bytes.length; ++i) {
    const timeByte = timestamp & 0xff;
    bytes[i] = (Math.floor(Math.random() * 256) ^ timeByte) & 0xff;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function defaultAvatar(): AvatarSetting {
  return {
    physique: 0,
    skinColor: 0,
    face: 0,
    eyeColor: 0,
    hairstyle: 0,
    hairColor: 0,
    costumeUpper: 0,
    costumeLower: 0,
    accessoryHead: 0,
    accessoryFace: 0,
    accessoryBody: 0,
    accessoryHand: 0,
    baseChara: 1,
  };
}

export function defaultPlayOption(): PlayOptionSetting {
  return {
    noteSpeed: 0,
    noteSize: 0,
    judgeSeType: 0,
    judgeSeVolume: 5,
    judgeTiming: 0,
    noteTiming: 0,
    guide: 0,
    invert: 0,
    stealth: 0,
    timelineDisplay: 0,
    avatarAction: 0,
    timelineModelDirection: 0,
    avatarModelDirection: 0,
  };
}

export function defaultPlayInfo(model = ''): PlayInfo {
  return {
    locationId: '',
    modeId: -1,
    styleId: 0,
    folderId: 0,
    musicId: 0,
    // The managed response parser throws on values outside the three XRPC
    // fumen names, including an empty string on a brand-new profile.
    fumenType: 'BASIC',
    startDate: 0,
    endDate: 0,
    lightPlayCount: 0,
    standardPlayCount: 0,
    trainingPlayCount: 0,
    pcbId: '',
    softcode: model,
  };
}

export function defaultDancerGrade(): DancerGrade {
  return {
    grade: 0,
    gvGauge: 0,
    achievedGv: 0,
    receivedGv: 0,
    increaseGv: 0,
  };
}

export function createProfile(
  refid: string,
  name: string,
  dataId = '',
  cardNumber = '',
  model = ''
): ProfileDocument {
  const createdAt = nowMs();
  const userCode = makeUserCode(refid);
  return {
    collection: 'profile',
    schemaVersion: PROFILE_SCHEMA_VERSION,
    name: name || 'PLAYER',
    dataId,
    cardNumber,
    userCode,
    dancerId: makeDancerId(userCode),
    privacy: { publishSetting: 0 },
    dancerGrade: defaultDancerGrade(),
    avatar: defaultAvatar(),
    playOption: defaultPlayOption(),
    playInfo: defaultPlayInfo(model),
    unlockedMusics: [],
    viewFlags: [],
    musicUnlockGauges: [],
    deltaGroup: [],
    loginCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

export function normalizeFumen(value: string): FumenType {
  if (value === 'ADVANCED' || value === 'MASTER') {
    return value;
  }
  return 'BASIC';
}

export function readNumber(
  reader: KDataReader,
  path: string,
  fallback = 0
): number {
  return reader.number(path, fallback);
}

export function readString(
  reader: KDataReader,
  path: string,
  fallback = ''
): string {
  return reader.str(path, fallback);
}

export function readAvatar(reader: KDataReader, prefix: string): AvatarSetting {
  const p = prefix ? `${prefix}.` : '';
  return {
    physique: readNumber(reader, `${p}physique`),
    skinColor: readNumber(reader, `${p}skin_color`),
    face: readNumber(reader, `${p}face`),
    eyeColor: readNumber(reader, `${p}eye_color`),
    hairstyle: readNumber(reader, `${p}hairstyle`),
    hairColor: readNumber(reader, `${p}hair_color`),
    costumeUpper: readNumber(reader, `${p}costume_upper`),
    costumeLower: readNumber(reader, `${p}costume_lower`),
    accessoryHead: readNumber(reader, `${p}accessory_head`),
    accessoryFace: readNumber(reader, `${p}accessory_face`),
    accessoryBody: readNumber(reader, `${p}accessory_body`),
    accessoryHand: readNumber(reader, `${p}accessory_hand`),
    baseChara: readNumber(reader, `${p}base_chara`, 1),
  };
}

export function readPlayOption(
  reader: KDataReader,
  prefix: string
): PlayOptionSetting {
  const p = prefix ? `${prefix}.` : '';
  return {
    noteSpeed: readNumber(reader, `${p}note_speed`),
    noteSize: readNumber(reader, `${p}note_size`),
    judgeSeType: readNumber(reader, `${p}judge_se_type`),
    judgeSeVolume: readNumber(reader, `${p}judge_se_vol`, 5),
    judgeTiming: readNumber(reader, `${p}judge_timing`),
    noteTiming: readNumber(reader, `${p}note_timing`),
    guide: readNumber(reader, `${p}guide`),
    invert: readNumber(reader, `${p}invert`),
    stealth: readNumber(reader, `${p}stealth`),
    timelineDisplay: readNumber(reader, `${p}timeline_disp`),
    avatarAction: readNumber(reader, `${p}avatar_action`),
    timelineModelDirection: readNumber(reader, `${p}timeline_model_dir`),
    avatarModelDirection: readNumber(reader, `${p}avatar_model_dir`),
  };
}

export function readPlayInfo(
  reader: KDataReader,
  prefix: string,
  model = ''
): PlayInfo {
  const p = prefix ? `${prefix}.` : '';
  return {
    locationId: readString(reader, `${p}loc_id`),
    modeId: readNumber(reader, `${p}mode_id`, -1),
    styleId: readNumber(reader, `${p}style_id`),
    folderId: readNumber(reader, `${p}folder_id`),
    musicId: readNumber(reader, `${p}music_id`),
    fumenType: normalizeFumen(readString(reader, `${p}fumen_type`, 'BASIC')),
    startDate: readNumber(reader, `${p}start_date`),
    endDate: readNumber(reader, `${p}end_date`),
    lightPlayCount: readNumber(reader, `${p}light_play_count`),
    standardPlayCount: readNumber(reader, `${p}standard_play_count`),
    trainingPlayCount: readNumber(reader, `${p}training_play_count`),
    pcbId: readString(reader, `${p}pcb_id`),
    softcode: readString(reader, `${p}softcode`, model),
  };
}

export function readStageResult(reader: KDataReader, prefix = ''): StageResult {
  const p = prefix ? `${prefix}.` : '';
  return {
    musicId: readNumber(reader, `${p}music_id`),
    fumenType: normalizeFumen(readString(reader, `${p}fumen_type`, 'BASIC')),
    clearStatus: readNumber(reader, `${p}clear_status`),
    score: readNumber(reader, `${p}score`),
    rank: readNumber(reader, `${p}rank`),
    combo: readNumber(reader, `${p}combo`),
    perfect: readNumber(reader, `${p}perfect`),
    great: readNumber(reader, `${p}great`),
    good: readNumber(reader, `${p}good`),
    bad: readNumber(reader, `${p}bad`),
  };
}

export function readMusicScore(reader: KDataReader): MusicScoreEntry {
  const playResult = readStageResult(reader);
  const playDate = readNumber(reader, 'play_date', nowMs());
  return {
    ...playResult,
    gameStartDate: readNumber(reader, 'start_date'),
    mode: readNumber(reader, 'mode'),
    style: readNumber(reader, 'style'),
    stageNo: readNumber(reader, 'stage_no'),
    playCount: readNumber(reader, 'play_cnt', 1),
    playDate,
    bestScoreDate: playDate,
    pcbId: '',
    locationId: readString(reader, 'loc_id'),
    shopName: readString(reader, 'shopname'),
    recordCount: readNumber(reader, 'rec_cnt'),
    gvScore: 0,
    dropFrame: readNumber(reader, 'drop_frame'),
    dropFrameMax: readNumber(reader, 'drop_frame_max'),
    dropCount: readNumber(reader, 'drop_count'),
    videoKey: readString(reader, 'video_key'),
  };
}

export function mergeScore(
  existing: MusicScoreEntry | undefined,
  incoming: MusicScoreEntry
): MusicScoreEntry {
  if (!existing) {
    return incoming;
  }

  const isNewBest = incoming.score >= existing.score;
  const best = isNewBest ? incoming : existing;
  return {
    ...best,
    playCount: Math.max(existing.playCount, incoming.playCount),
    playDate: Math.max(existing.playDate, incoming.playDate),
    bestScoreDate: isNewBest ? incoming.playDate : existing.bestScoreDate,
    clearStatus: Math.max(existing.clearStatus, incoming.clearStatus),
    combo: Math.max(existing.combo, incoming.combo),
    recordCount: Math.max(existing.recordCount, incoming.recordCount),
    gvScore: Math.max(existing.gvScore, incoming.gvScore),
  };
}

export function musicScoreKey(
  score: Pick<StageResult, 'musicId' | 'fumenType'>
): string {
  return `${score.musicId}:${score.fumenType}`;
}

export function readUnlocks(
  reader: KDataReader,
  path: string
): UnlockMusicEntry[] {
  const result: UnlockMusicEntry[] = [];
  for (const item of reader.elements(path)) {
    const musicId = parseInt(item.attr().music_id || '0', 10);
    if (!Number.isFinite(musicId) || musicId <= 0) {
      continue;
    }
    const fumens = item
      .elements('fumen_type')
      .map(f => normalizeFumen(f.str('', 'BASIC')));
    result.push({ musicId, fumens: uniqueFumens(fumens) });
  }
  return result;
}

export function readViewFlags(
  reader: KDataReader,
  path: string
): ViewFlagEntry[] {
  return reader.elements(path).map(item => ({
    viewId: readString(item, 'view_id'),
    flag: readNumber(item, 'flag'),
  }));
}

export function readMusicUnlockGauges(
  reader: KDataReader,
  path: string
): MusicUnlockGaugeEntry[] {
  return reader.elements(path).map(item => ({
    eventId: readString(item, 'event_id'),
    progress: readNumber(item, 'progress'),
  }));
}

export function readDeltaGroup(
  reader: KDataReader,
  path: string
): DeltaEntry[] {
  return reader.elements(path).map(item => ({
    name: readString(item, 'name'),
    income: readNumber(item, 'extra_income'),
    expense: readNumber(item, 'extra_expense'),
  }));
}

export function mergeUnlocks(
  left: UnlockMusicEntry[],
  right: UnlockMusicEntry[]
): UnlockMusicEntry[] {
  const merged: { [musicId: string]: FumenType[] } = {};
  for (const entry of [...left, ...right]) {
    const key = `${entry.musicId}`;
    merged[key] = uniqueFumens([...(merged[key] || []), ...entry.fumens]);
  }
  return Object.keys(merged)
    .map(key => ({ musicId: parseInt(key, 10), fumens: merged[key] }))
    .sort((a, b) => a.musicId - b.musicId);
}

function uniqueFumens(values: FumenType[]): FumenType[] {
  return ['BASIC', 'ADVANCED', 'MASTER'].filter(
    value => values.indexOf(value as FumenType) >= 0
  ) as FumenType[];
}

export function avatarResponse(avatar: AvatarSetting): any {
  return {
    physique: K.ITEM('s32', avatar.physique),
    skin_color: K.ITEM('s32', avatar.skinColor),
    face: K.ITEM('s32', avatar.face),
    eye_color: K.ITEM('s32', avatar.eyeColor),
    hairstyle: K.ITEM('s32', avatar.hairstyle),
    hair_color: K.ITEM('s32', avatar.hairColor),
    costume_upper: K.ITEM('s32', avatar.costumeUpper),
    costume_lower: K.ITEM('s32', avatar.costumeLower),
    accessory_head: K.ITEM('s32', avatar.accessoryHead),
    accessory_face: K.ITEM('s32', avatar.accessoryFace),
    accessory_body: K.ITEM('s32', avatar.accessoryBody),
    accessory_hand: K.ITEM('s32', avatar.accessoryHand),
    base_chara: K.ITEM('s32', avatar.baseChara),
  };
}

export function playOptionResponse(option: PlayOptionSetting): any {
  return {
    note_speed: K.ITEM('s32', option.noteSpeed),
    note_size: K.ITEM('s32', option.noteSize),
    judge_se_type: K.ITEM('s32', option.judgeSeType),
    judge_se_vol: K.ITEM('s32', option.judgeSeVolume),
    judge_timing: K.ITEM('s32', option.judgeTiming),
    note_timing: K.ITEM('s32', option.noteTiming),
    guide: K.ITEM('s32', option.guide),
    invert: K.ITEM('s32', option.invert),
    stealth: K.ITEM('s32', option.stealth),
    timeline_disp: K.ITEM('s32', option.timelineDisplay),
    avatar_action: K.ITEM('s32', option.avatarAction),
    timeline_model_dir: K.ITEM('s32', option.timelineModelDirection),
    avatar_model_dir: K.ITEM('s32', option.avatarModelDirection),
  };
}

export function dancerGradeResponse(grade: DancerGrade): any {
  return {
    grade: K.ITEM('s32', grade.grade),
    gv_gauge: K.ITEM('s32', grade.gvGauge),
    achieve_gv: K.ITEM('s32', grade.achievedGv),
    get_gv: K.ITEM('s32', grade.receivedGv),
    increase_gv: K.ITEM('s32', grade.increaseGv),
  };
}

export function playInfoResponse(info: PlayInfo): any {
  return {
    loc_id: K.ITEM('str', info.locationId),
    mode_id: K.ITEM('s32', info.modeId),
    style_id: K.ITEM('s32', info.styleId),
    folder_id: K.ITEM('s32', info.folderId),
    music_id: K.ITEM('s32', info.musicId),
    fumen_type: K.ITEM('str', normalizeFumen(info.fumenType)),
    start_date: K.ITEM('s64', BigInt(info.startDate)),
    end_date: K.ITEM('s64', BigInt(info.endDate)),
    light_play_count: K.ITEM('s32', info.lightPlayCount),
    standard_play_count: K.ITEM('s32', info.standardPlayCount),
    training_play_count: K.ITEM('s32', info.trainingPlayCount),
    pcb_id: K.ITEM('str', info.pcbId),
    softcode: K.ITEM('str', info.softcode),
  };
}

export function stageResultResponse(result: StageResult): any {
  return {
    music_id: K.ITEM('s32', result.musicId),
    fumen_type: K.ITEM('str', result.fumenType),
    clear_status: K.ITEM('s32', result.clearStatus),
    score: K.ITEM('s32', result.score),
    rank: K.ITEM('s32', result.rank),
    combo: K.ITEM('s32', result.combo),
    perfect: K.ITEM('s32', result.perfect),
    great: K.ITEM('s32', result.great),
    good: K.ITEM('s32', result.good),
    bad: K.ITEM('s32', result.bad),
  };
}

export function motionInfoResponse(entry: MotionEntry): any {
  return {
    motion_id: K.ITEM('str', entry.motionId),
    is_active: K.ITEM('bool', entry.active),
    publish_setting: K.ITEM('s32', entry.publishSetting),
    play_cnt: K.ITEM('s32', entry.playCount),
    total_gv: K.ITEM('s32', entry.totalGv),
    ...stageResultResponse(entry.playResult),
    play_date: K.ITEM('s64', BigInt(entry.playDate)),
    loc_id: K.ITEM('str', entry.locationId),
    shopname: K.ITEM('str', entry.shopName),
  };
}
