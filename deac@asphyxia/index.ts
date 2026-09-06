// Legacy CORE exposes these at runtime without TypeScript declarations.
declare const Buffer: any;
declare const BigInt: any;
declare const require: any;
declare const process: any;

const Fs = require('fs');
const Path = require('path');

interface StoredRecord {
  raw: string;
  bin: string;
}

interface PlayerData {
  collection: 'data';
  records?: StoredRecord[];
  // Compatibility with saves created by v1.0.0.
  str?: string[];
  bin?: string[];
}

interface PlayerProfile {
  collection: 'profile';
  name?: string;
  showEpassNumber?: boolean;
}

interface CoreCard {
  __refid?: string;
  cid?: string;
  print?: string;
  _id?: string;
}

interface LampHistory {
  songId: number;
  chart: string;
  score: number;
  grade: string;
  combo: number;
  fullCombo: boolean;
  playedAt?: number;
}

interface BestScore {
  collection: 'score';
  songId: number;
  song: string;
  chart: string;
  score: number;
  grade: string;
  combo: number;
  fullCombo: boolean;
  updatedAt: number;
}

const RESULT_OK = () => ({ result: K.ITEM('s32', 0) });
const MASTER_DATA_UNLOCKED = ['2011081000', ...Array(47).fill('1')].join(':');
const MASTER_DATA_LOCKED = ['2011081000', ...Array(47).fill('0')].join(':');
const CHART_NAMES = ['LIGHT', 'STANDARD', 'EXTREME', 'STEALTH', 'MASTER'];
const GRADE_NAMES = ['FAILED', 'E', 'D', 'C', 'B', 'A', 'AA', 'AAA'];
const MAX_VALID_SCORE = 10000000;
const SONG_UNLOCK_FIELD = 17;
const EVENT_DIFFICULTY_FIELD = 27;
const EVENT_DIFFICULTY_SONG_COUNT = 47; // Song IDs 79 through 125.
const ALL_SONGS_OPEN_MASK = '7fffffffffffffff'; // KDM uses 63 bits per bank.

// Extracted from this build's data/arc/resource_lists.arc. Array index = song ID.
const SONG_TITLES = [
  "INTO YOUR HEART (Ruffage remix)", "A Geisha's Dream", 'La receta',
  'L’amour et la liberté (Darwin & DJ Silver remix)', 'HYSTERIA 2001',
  "Keep on movin'", "CAN'T STOP FALLIN' IN LOVE -super euro version-",
  'exotic ethnic', '桜', 'Secret Rendez-vous', 'MY SUMMER LOVE',
  'Crazy Control', 'Every Day, Every Night (NM STYLE)', 'Open Your Eyes',
  'We Can Win the Fight', 'KIMONO♥PRINCESS', 'HIGHER', "Lover's High",
  'Mess With My Emotions', 'Unity', "BURNIN' THE FLOOR",
  'My Only Shining Star', 'STILL IN MY HEART', 'SUPER SAMURAI',
  'Let the beat hit em! (CLASSIC R&B STYLE)', 'Brilliant 2U',
  'AFRONOVA PRIMEVAL', 'BABY BABY GIMME YOUR LOVE', 'ヘビーローテーション',
  'ヘビーローテーション (かんたん振り付け)', 'irony',
  'irony (かんたん振り付け)', 'チュートリアル', '恋愛レボリューション21',
  '恋愛レボリューション21 (かんたん振り付け)', 'マル・マル・モリ・モリ！',
  'Brave', 'She is my wife', '女々しくて', 'PONPONPON',
  'ルカルカ★ナイトフィーバー', 'マジLOVE1000％',
  '行くぜっ！怪盗少女 -Zver.-', '外周チュートリアル', 'MERRY GO ROUND',
  'Follow Tomorrow', 'NIGHT OF FIRE', '華爛漫 -Flowers- (2nd EDITION)',
  '前略、道の上より', 'LOVE&JOY', 'なめこのうた', 'FLOWER',
  'Mickey (Hawaii version)', '恋愛サーキュレーション', 'Daisuke',
  'Do The Evolution', 'Wow Wow VENUS', 'おどるポンポコリン',
  'サイバーサンダーサイダー', 'Sweetiex2', 'Colorful World',
  'Gravity=Reality', 'メグメグ☆ファイアーエンドレスナイト',
  '恋するフォーチュンクッキー', 'マジLOVE2000％', '未確認中学生X',
  'Chu☆Chu☆Tonight', 'インベーダーインベーダー', '朧', 'LOVEマシーン',
  'ちくわパフェだよ☆CKP', 'Sweet Rain', '回レ！雪月花',
  '大藝術家 -The Great Artist-', '全城熱愛 -Feel the Love-',
  'FUJIMORI -祭- FESTIVAL', 'Mermaid girl', '心のプラカード',
  'ふな ふな ふなっしー♪ ～ふなっしー公式テーマソング～',
  'Watch Out Pt.2', '凛として咲く花の如く', '轟け！恋のビーンボール！！',
  '轟け！恋のビーンボール！！ (9回裏振付ver)', 'Sakura Sunrise',
  'Little Star', '罪と罰', 'Reaching for the Stars', 'LUV CAN SAVE U',
  'チョコレートスマイル', 'TA・DA ☆ YO・SHI', 'ハッピーシンセサイザ',
  'アルストロメリア (walk with you remix)', 'Kind Lady', 'Gimme a Big Beat',
  'YESTERDAY', 'Din Don Dan', "I'm so Happy", '無双',
];

function getRefId(data: any): string {
  const request = $(data).element('data');
  return request.str('eaid', request.str('refid', ''));
}

function splitCsv(raw: any): any[] {
  const fields: any[] = [];
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 0x2c) {
      fields.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  fields.push(raw.slice(start));
  return fields;
}

function joinCsv(fields: any[]): any {
  const chunks: any[] = [];
  const comma = Buffer.from(',', 'ascii');
  for (let i = 0; i < fields.length; i++) {
    if (i > 0) chunks.push(comma);
    chunks.push(fields[i]);
  }
  return Buffer.concat(chunks);
}

function recordType(record: StoredRecord): string {
  try {
    const fields = splitCsv(Buffer.from(record.raw, 'base64'));
    return fields.length > 1 ? fields[1].toString('ascii') : '';
  } catch (err) {
    return '';
  }
}

function blankStoredRecord(type: string): StoredRecord {
  const fields: any[] = [];
  fields.push(Buffer.from('ffffffff', 'ascii'));
  fields.push(Buffer.from(type, 'ascii'));
  // KDM's common player-data record consists of 17 hexadecimal integers,
  // eight floats and eight strings after the two transport fields.
  for (let i = 0; i < 17; i++) fields.push(Buffer.from(i === 0 ? '1' : '0', 'ascii'));
  for (let i = 0; i < 8; i++) fields.push(Buffer.from('0.000000', 'ascii'));
  for (let i = 0; i < 8; i++) fields.push(Buffer.alloc(0));
  return { raw: joinCsv(fields).toString('base64'), bin: '' };
}

function unlockStoredRecord(record: StoredRecord, type: string): StoredRecord {
  if (type !== 'DATA02' && type !== 'DATA12') return record;
  const fields = splitCsv(Buffer.from(record.raw, 'base64'));
  if (fields.length < 35) return record;

  // IDA: sub_100BE370 reads a 63-bit song-open bank from DATA02/DATA12.
  // In the wire CSV this is integer field 17 (hexadecimal, without 0x).
  fields[SONG_UNLOCK_FIELD] = Buffer.from(ALL_SONGS_OPEN_MASK, 'ascii');

  if (type === 'DATA12') {
    // IDA: sub_100BE7D0 indexes this string by songId - 79.  A character
    // from '0' through '4' is the highest selectable difficulty.
    const oldLevels = fields[EVENT_DIFFICULTY_FIELD] || Buffer.alloc(0);
    const levels = Buffer.alloc(Math.max(oldLevels.length, EVENT_DIFFICULTY_SONG_COUNT));
    oldLevels.copy(levels);
    levels.fill(0x34, 0, EVENT_DIFFICULTY_SONG_COUNT); // ASCII '4'
    fields[EVENT_DIFFICULTY_FIELD] = levels;
  }

  return { raw: joinCsv(fields).toString('base64'), bin: record.bin };
}

function configBoolean(name: string, fallback: boolean): boolean {
  const value: any = U.GetConfig(name);
  if (value === undefined || value === null || value === '') return fallback;
  if (value === false || value === 0 || String(value).toLowerCase() === 'false') return false;
  return true;
}

function normaliseCardKey(value: any): string {
  return String(value || '').replace(/\s/g, '').toUpperCase();
}

function findCoreCard(cardId: string): CoreCard | null {
  const candidates: string[] = [];
  for (const part of String(cardId || '').split('|')) {
    const key = normaliseCardKey(part);
    if (key) candidates.push(key);
  }
  if (!candidates.length) return null;

  const corePaths = [
    Path.join(Path.dirname(process.execPath), 'savedata', 'core.db'),
    Path.join(process.cwd(), 'savedata', 'core.db'),
  ];
  for (const corePath of corePaths) {
    try {
      if (!Fs.existsSync(corePath)) continue;
      const documents: { [id: string]: any } = {};
      const lines = String(Fs.readFileSync(corePath, 'utf8')).split(/\r?\n/);
      for (const line of lines) {
        if (!line) continue;
        let document: any;
        try { document = JSON.parse(line); }
        catch (err) { continue; }
        const id = String(document._id || '');
        if (!id) continue;
        if (document.$$deleted) delete documents[id];
        else documents[id] = document;
      }
      for (const id of Object.keys(documents)) {
        const card = documents[id];
        if (card.__s !== 'card') continue;
        const keys = [
          normaliseCardKey(card.__refid),
          normaliseCardKey(card.cid),
          normaliseCardKey(card.print),
        ];
        for (const candidate of candidates) {
          if (keys.indexOf(candidate) >= 0) return card as CoreCard;
        }
      }
    } catch (err) {
      console.warn(`[deac] Unable to read CORE card database: ${err}`);
    }
  }
  return null;
}

function isScoreRecord(type: string): boolean {
  return /^DATA(0[1-5]|1[1-5])$/.test(type);
}

function scoreRecordType(songId: number, chart: string): string {
  const chartIndex = CHART_NAMES.indexOf(chart);
  if (chartIndex < 0 || songId < 0) return '';
  const number = (songId < 63 ? 1 : 11) + chartIndex;
  return `DATA${number < 10 ? '0' : ''}${number}`;
}

function scoreRecordOffset(songId: number): number {
  return (songId < 63 ? songId : songId - 63) * 8;
}

function mergeScoreBins(oldEncoded: string, newEncoded: string): string {
  if (!oldEncoded) return newEncoded || '';
  if (!newEncoded) return oldEncoded;
  const oldData = Buffer.from(oldEncoded, 'base64');
  const newData = Buffer.from(newEncoded, 'base64');
  const result = Buffer.alloc(Math.max(oldData.length, newData.length));
  oldData.copy(result);

  for (let offset = 0; offset < newData.length; offset += 8) {
    const length = Math.min(8, newData.length - offset);
    if (length < 8) {
      newData.copy(result, offset, offset, offset + length);
      continue;
    }
    const oldPlayed = offset + 5 < oldData.length && oldData[offset + 5] !== 0;
    const newPlayed = newData[offset + 5] !== 0;
    if (!oldPlayed) {
      newData.copy(result, offset, offset, offset + 8);
      continue;
    }
    if (!newPlayed) continue;

    const oldScore = oldData.readUInt32LE(offset);
    const newScore = newData.readUInt32LE(offset);
    const oldValid = oldScore > 0 && oldScore <= MAX_VALID_SCORE;
    const newValid = newScore > 0 && newScore <= MAX_VALID_SCORE;
    const preferred = (!oldValid && newValid) ||
      (oldValid === newValid && newScore > oldScore) ? newData : oldData;
    preferred.copy(result, offset, offset, offset + 8);
    if (oldValid !== newValid) continue;
    if (oldValid || newValid) {
      result.writeUInt32LE(oldValid && newValid
        ? Math.max(oldScore, newScore)
        : (oldValid ? oldScore : newScore), offset);
    }
    result[offset + 4] = Math.max(oldData[offset + 4], newData[offset + 4]);
    result[offset + 5] = Math.max(oldData[offset + 5], newData[offset + 5]);
    const oldStats = oldData[offset + 7];
    const newStats = newData[offset + 7];
    const grade = Math.max((oldStats >>> 1) & 7, (newStats >>> 1) & 7);
    result[offset + 7] = ((oldStats | newStats) & 0xe1) |
      ((oldStats | newStats) & 0x10) | (grade << 1);
  }
  return result.toString('base64');
}

function mergeStoredRecord(oldRecord: StoredRecord, incoming: StoredRecord): StoredRecord {
  const type = recordType(incoming).toUpperCase();
  if (!isScoreRecord(type)) return incoming;
  return { raw: incoming.raw, bin: mergeScoreBins(oldRecord.bin, incoming.bin) };
}

function makeScoreRecord(records: StoredRecord[], type: string): StoredRecord {
  for (const template of records) {
    if (!isScoreRecord(recordType(template).toUpperCase())) continue;
    const fields = splitCsv(Buffer.from(template.raw, 'base64'));
    if (fields.length > 1) {
      fields[1] = Buffer.from(type, 'ascii');
      return { raw: joinCsv(fields).toString('base64'), bin: '' };
    }
  }
  return {
    raw: Buffer.from(`ffffffff,${type},`, 'ascii').toString('base64'),
    bin: '',
  };
}

function historyMatchCount(type: string, encoded: string, histories: LampHistory[]): number {
  if (!encoded) return 0;
  const data = Buffer.from(encoded, 'base64');
  let matches = 0;
  for (const history of histories) {
    if (scoreRecordType(history.songId, history.chart) !== type) continue;
    const offset = scoreRecordOffset(history.songId);
    if (offset + 8 > data.length || data[offset + 5] === 0) continue;
    if (data.readUInt32LE(offset) === Number(history.score)) matches++;
  }
  return matches;
}

async function restoreLampsFromHistory(refid: string, records: StoredRecord[]): Promise<boolean> {
  const histories = await DB.Find<LampHistory>(refid, { collection: 'play_history' });
  let changed = false;

  // A score is never remotely close to a 32-bit Unix timestamp. Old versions
  // could slide profile bytes into a score slot, producing values such as
  // 1475432616. Remove those eight-byte blocks before deriving lamps/scores.
  for (let i = 0; i < records.length; i++) {
    const type = recordType(records[i]).toUpperCase();
    if (!isScoreRecord(type) || !records[i].bin) continue;
    const scoreData = Buffer.from(records[i].bin, 'base64');
    let recordChanged = false;
    for (let offset = 0; offset + 8 <= scoreData.length; offset += 8) {
      const score = scoreData.readUInt32LE(offset);
      if (score > MAX_VALID_SCORE) {
        scoreData.fill(0, offset, offset + 8);
        recordChanged = true;
      }
    }
    if (recordChanged) {
      records[i] = { raw: records[i].raw, bin: scoreData.toString('base64') };
      changed = true;
    }
  }

  // Versions before 1.1.0 omitted <NODATA> response slots. That could copy one
  // physical difficulty blob into another. Exact non-empty duplicates cannot
  // be legitimate; retain the interpretation supported by actual play history.
  for (let left = 0; left < records.length; left++) {
    const leftType = recordType(records[left]).toUpperCase();
    if (!isScoreRecord(leftType) || !records[left].bin) continue;
    for (let right = left + 1; right < records.length; right++) {
      const rightType = recordType(records[right]).toUpperCase();
      if (!isScoreRecord(rightType) || leftType === rightType) continue;
      if (!records[right].bin || records[left].bin !== records[right].bin) continue;
      const leftMatches = historyMatchCount(leftType, records[left].bin, histories);
      const rightMatches = historyMatchCount(rightType, records[right].bin, histories);
      if (leftMatches > rightMatches) {
        records[right] = { raw: records[right].raw, bin: '' };
        changed = true;
      } else if (rightMatches > leftMatches) {
        records[left] = { raw: records[left].raw, bin: '' };
        changed = true;
      }
    }
  }

  const positions: { [type: string]: number } = {};
  for (let i = 0; i < records.length; i++) {
    const type = recordType(records[i]).toUpperCase();
    if (type) positions[type] = i;
  }
  for (const history of histories) {
    const songId = Number(history.songId);
    const score = Number(history.score);
    const type = scoreRecordType(songId, String(history.chart || '').toUpperCase());
    if (!type || score <= 0 || score > MAX_VALID_SCORE) continue;
    let position = positions[type];
    if (position === undefined) {
      position = records.length;
      positions[type] = position;
      records.push(makeScoreRecord(records, type));
      changed = true;
    }

    const offset = scoreRecordOffset(songId);
    const patch = Buffer.alloc(offset + 8);
    patch.writeUInt32LE(score, offset);
    patch[offset + 4] = Number(history.combo || 0) & 0xff;
    patch[offset + 5] = 4;
    const grade = Math.max(0, GRADE_NAMES.indexOf(String(history.grade || '').toUpperCase()));
    patch[offset + 7] = (grade << 1) | (history.fullCombo ? 0x10 : 0);
    const merged = mergeScoreBins(records[position].bin, patch.toString('base64'));
    if (merged !== records[position].bin) {
      records[position] = { raw: records[position].raw, bin: merged };
      changed = true;
    }
  }
  return changed;
}

function normaliseRecords(playerData: PlayerData | null): StoredRecord[] {
  if (!playerData) return [];
  if (playerData.records && Array.isArray(playerData.records)) return playerData.records;

  const records: StoredRecord[] = [];
  const legacyStr = playerData.str || [];
  const legacyBin = playerData.bin || [];
  for (let i = 0; i < legacyStr.length; i++) {
    records.push({
      // Old text may already be damaged, but this keeps v1.0.0 saves loadable.
      raw: Buffer.from(legacyStr[i], 'utf-8').toString('base64'),
      bin: legacyBin[i] || '',
    });
  }
  return records;
}

function songTitle(songId: number): string {
  return SONG_TITLES[songId] || `歌曲 #${songId}`;
}

function decodeProfileName(records: StoredRecord[]): string | null {
  for (const record of records) {
    if (recordType(record) !== 'DATA01') continue;
    try {
      const fields = splitCsv(Buffer.from(record.raw, 'base64'));
      // Two transport fields precede DATA01's payload; name offset is 25.
      if (fields.length <= 27) return null;
      return String(U.DecodeString(fields[27], 'shift_jis')).replace(/\0/g, '').trim();
    } catch (err) {
      return null;
    }
  }
  return null;
}

async function storePlayHistory(refid: string, record: StoredRecord) {
  if (recordType(record) !== 'RDAT01' || !record.bin) return;
  const history = Buffer.from(record.bin, 'base64');

  // The first three 32-byte chunks are the attempts from this credit.
  for (let offset = 0; offset < Math.min(history.length, 96); offset += 32) {
    if (offset + 16 > history.length) break;
    const score = history.readUInt32LE(offset);
    const params = history.readUInt32LE(offset + 4);
    const lowTime = history.readUInt32LE(offset + 8);
    const highTime = history.readUInt32LE(offset + 12);
    const playedAt = lowTime + highTime * 0x100000000;
    if (!score && !params && !playedAt) continue;

    const songId = params & 0xff;
    const chartIndex = (params >>> 8) & 0x0f;
    if (chartIndex >= CHART_NAMES.length) continue;
    const grade = (params >>> 27) & 0x07;
    const attempt = {
      collection: 'play_history',
      songId,
      song: songTitle(songId),
      chart: CHART_NAMES[chartIndex],
      score,
      grade: GRADE_NAMES[grade],
      combo: (params >>> 12) & 0x03ff,
      fullCombo: ((params >>> 30) & 0x03) !== 0,
      playedAt,
    };
    await DB.Upsert(
      refid,
      { collection: 'play_history', songId, chart: attempt.chart, score, playedAt },
      attempt
    );
  }
}

function matchingHistory(
  histories: LampHistory[], songId: number, chart: string, score: number
): LampHistory | null {
  let best: LampHistory | null = null;
  for (const history of histories) {
    if (Number(history.songId) !== songId ||
        String(history.chart || '').toUpperCase() !== chart ||
        Number(history.score) !== score) continue;
    const historyGrade = GRADE_NAMES.indexOf(String(history.grade || '').toUpperCase());
    const bestGrade = best
      ? GRADE_NAMES.indexOf(String(best.grade || '').toUpperCase()) : -1;
    if (!best ||
        (!!history.fullCombo !== !!best.fullCombo
          ? !!history.fullCombo
          : Number(history.combo || 0) !== Number(best.combo || 0)
            ? Number(history.combo || 0) > Number(best.combo || 0)
            : historyGrade !== bestGrade
              ? historyGrade > bestGrade
              : Number(history.playedAt || 0) > Number(best.playedAt || 0))) {
      best = history;
    }
  }
  return best;
}

function expandStoredCombo(lowByte: number, fullCombo: boolean): number {
  // DATAxx only persists the low eight bits. A full combo of 256 is stored as
  // 0 and 258 as 2. RDAT is authoritative when present; this conservative
  // fallback repairs wrapped FC values after RDAT has rotated out.
  return fullCombo && lowByte < 64 ? lowByte + 256 : lowByte;
}

async function storeBestScores(
  refid: string, record: StoredRecord, histories: LampHistory[]
) {
  if (!record.bin) return;
  const type = recordType(record);
  const match = /^DATA(0[1-5]|1[1-5])$/.exec(type);
  if (!match) return;

  const number = parseInt(match[1], 10);
  const chartIndex = number >= 11 ? number - 11 : number - 1;
  const firstSong = number >= 11 ? 63 : 0;
  const data = Buffer.from(record.bin, 'base64');
  for (let offset = 0; offset + 8 <= data.length; offset += 8) {
    const playMarker = data[offset + 5];
    if (!playMarker) continue;
    const songId = firstSong + offset / 8;
    const score = data.readUInt32LE(offset);
    if (score <= 0 || score > MAX_VALID_SCORE) continue;
    const chart = CHART_NAMES[chartIndex];
    const stats = data[offset + 7];
    const storedFullCombo = (stats & 0x10) !== 0;
    const history = matchingHistory(histories, songId, chart, score);
    const best: BestScore = {
      collection: 'score',
      songId,
      song: songTitle(songId),
      chart,
      score,
      grade: history ? String(history.grade) : GRADE_NAMES[(stats >>> 1) & 0x07],
      combo: history ? Number(history.combo) : expandStoredCombo(data[offset + 4], storedFullCombo),
      fullCombo: history ? !!history.fullCombo : storedFullCombo,
      updatedAt: Date.now(),
    };
    await DB.Upsert(refid, { collection: 'score', songId, chart: best.chart }, best);
  }
}

async function updateDerivedData(refid: string, records: StoredRecord[]) {
  const name = decodeProfileName(records);
  if (name !== null) {
    const profile = await DB.FindOne<PlayerProfile>(refid, { collection: 'profile' }) ||
      { collection: 'profile' } as PlayerProfile;
    profile.name = name;
    await DB.Upsert(refid, { collection: 'profile' }, profile);
  }
  // RDAT has the complete 10-bit combo while DATAxx keeps only its low byte.
  // Store every history entry first so score derivation can always join it.
  for (const record of records) await storePlayHistory(refid, record);
  const histories = await DB.Find<LampHistory>(refid, { collection: 'play_history' });

  // Scores are a derived WebUI index. Rebuilding prevents stale entries from
  // an old, shifted difficulty slot from surviving after the raw save is fixed.
  await DB.Remove<BestScore>(refid, { collection: 'score' });
  for (const record of records) await storeBestScores(refid, record, histories);
}

async function migrateDerivedData() {
  const players = await DB.Find<any>(null, { collection: 'data' });
  for (const player of players) {
    const refid = String(player.__refid || '');
    if (!refid) continue;
    const records = normaliseRecords(player as PlayerData);
    if (await restoreLampsFromHistory(refid, records)) {
      await DB.Upsert(refid, { collection: 'data' }, { collection: 'data', records });
    }
    await updateDerivedData(refid, records);
  }
}

const savePlayerData: EPR = async (info, data, send) => {
  const refid = getRefId(data);
  if (!refid) return send.deny();

  const existing = await DB.FindOne<PlayerData>(refid, { collection: 'data' });
  const records = normaliseRecords(existing);
  const positions: { [type: string]: number } = {};
  for (let i = 0; i < records.length; i++) positions[recordType(records[i])] = i;

  for (const item of $(data).elements('data.record.d')) {
    const encoded = item.str('', '');
    if (!encoded) continue;
    // Store KDM's exact Base64. Decoding the CP932 CSV through UTF-8 corrupts
    // the player name when the record is returned on the next credit.
    const incoming: StoredRecord = { raw: encoded, bin: item.str('bin1', '') };
    const type = recordType(incoming);
    if (type && positions[type] !== undefined) {
      const position = positions[type];
      records[position] = mergeStoredRecord(records[position], incoming);
    }
    else {
      if (type) positions[type] = records.length;
      records.push(incoming);
    }
  }

  await DB.Upsert(refid, { collection: 'data' }, { collection: 'data', records });
  await updateDerivedData(refid, records);
  return send.object(RESULT_OK());
};

const loadPlayerData: EPR = async (info, data, send) => {
  const refid = getRefId(data);
  if (!refid) return send.deny();
  const playerData = await DB.FindOne<PlayerData>(refid, { collection: 'data' });
  const stored = normaliseRecords(playerData);
  const records: any[] = [];

  if (await restoreLampsFromHistory(refid, stored)) {
    await DB.Upsert(refid, { collection: 'data' }, { collection: 'data', records: stored });
  }

  // KDM identifies received profile blobs by their array position, not by a
  // type stored inside each returned blob. Always mirror recv_csv exactly and
  // emit <NODATA> placeholders for missing types, otherwise later difficulty
  // records slide into earlier slots (for example DATA14 -> DATA11).
  const recvCsv = $(data).element('data').str('recv_csv', '');
  const requestedTypes: string[] = [];
  const recvFields = recvCsv.split(',');
  for (let i = 0; i < recvFields.length; i += 2) {
    const type = String(recvFields[i] || '').toUpperCase();
    if (type) requestedTypes.push(type);
  }

  const storedByType: { [type: string]: StoredRecord } = {};
  for (const saved of stored) {
    const type = recordType(saved).toUpperCase();
    if (type) storedByType[type] = saved;
  }

  const responseTypes = requestedTypes.length
    ? requestedTypes
    : Object.keys(storedByType);
  const unlockAll = configBoolean('unlock_all_songs', true);
  for (const type of responseTypes) {
    let saved = storedByType[type];
    // Synthesize a missing unlock bank for new/partial profiles. This is only
    // a response copy: the player's real progression and score blobs remain
    // untouched in the database.
    if (!saved && unlockAll && (type === 'DATA02' || type === 'DATA12')) {
      saved = blankStoredRecord(type);
    }
    if (!saved) {
      records.push(K.ITEM('str', '<NODATA>'));
      continue;
    }
    try {
      const responseRecord = unlockAll ? unlockStoredRecord(saved, type) : saved;
      const raw = Buffer.from(responseRecord.raw, 'base64');
      const first = raw.indexOf(0x2c);
      const second = first < 0 ? -1 : raw.indexOf(0x2c, first + 1);
      if (second < 0) {
        records.push(K.ITEM('str', '<NODATA>'));
        continue;
      }
      // Strip only the two ASCII transport fields; preserve all CP932 bytes.
      const record: any = K.ITEM('str', raw.slice(second + 1).toString('base64'));
      if (responseRecord.bin) record.bin1 = K.ITEM('str', responseRecord.bin);
      records.push(record);
    } catch (err) {
      console.warn('[deac] Ignoring an invalid stored player-data record.');
      records.push(K.ITEM('str', '<NODATA>'));
    }
  }

  // Lazily builds the WebUI views for saves created before this version.
  await updateDerivedData(refid, stored);
  return send.object({
    result: K.ITEM('s32', 0),
    player: { record_num: K.ITEM('u32', records.length), record: { d: records } },
  });
};

async function updatePlayerName(refid: string, requestedName: string) {
  const playerData = await DB.FindOne<PlayerData>(refid, { collection: 'data' });
  if (!playerData) return;
  const records = normaliseRecords(playerData);
  const name = requestedName.replace(/[\r\n\0]/g, '').slice(0, 10);
  if (!name) return;

  for (let i = 0; i < records.length; i++) {
    if (recordType(records[i]) !== 'DATA01') continue;
    const fields = splitCsv(Buffer.from(records[i].raw, 'base64'));
    if (fields.length <= 27) return;
    fields[27] = U.EncodeString(name, 'shift_jis');
    records[i] = { raw: joinCsv(fields).toString('base64'), bin: records[i].bin };
    await DB.Upsert(refid, { collection: 'data' }, { collection: 'data', records });
    const profile = await DB.FindOne<PlayerProfile>(refid, { collection: 'profile' }) ||
      { collection: 'profile' } as PlayerProfile;
    profile.name = name;
    await DB.Upsert(refid, { collection: 'profile' }, profile);
    // Name editing is also a convenient migration point for v1.0.0 saves.
    await updateDerivedData(refid, records);
    return;
  }
}

async function updateEpassDisplay(refid: string, requestedValue: any) {
  if (!refid) return;
  const profile = await DB.FindOne<PlayerProfile>(refid, { collection: 'profile' }) ||
    { collection: 'profile' } as PlayerProfile;
  profile.showEpassNumber = !(requestedValue === false || requestedValue === 0 ||
    String(requestedValue).toLowerCase() === 'false' || String(requestedValue) === '0');
  await DB.Upsert(refid, { collection: 'profile' }, profile);
}

const convertCardNumber: EPR = async (info, data, send) => {
  const cardId = $(data).str('data.card_id', '');
  const parts = cardId.split('|');
  // For KDM, CORE passes the resolved RefID as card_id. Resolve that RefID
  // through savedata/core.db so the game receives the human-facing print
  // number and the per-profile visibility setting is read from the right card.
  const coreCard = findCoreCard(cardId);
  const refid = coreCard && coreCard.__refid
    ? String(coreCard.__refid)
    : (parts.length > 1 ? parts[parts.length - 1] : parts[0]);
  const profile = refid
    ? await DB.FindOne<PlayerProfile>(refid, { collection: 'profile' })
    : null;
  const showNumber = !profile || profile.showEpassNumber !== false;
  const printNumber = coreCard && coreCard.print ? String(coreCard.print) : parts[0];
  return send.object({
    result: K.ITEM('s32', 0),
    // KDM groups a 16-character card number into blocks of four on screen.
    data: { card_number: K.ITEM('str', showNumber ? printNumber : '****************') },
  });
};

export function register() {
  R.GameCode('KDM');
  R.Config('information_text', {
    type: 'string',
    default: 'Thank you for your playing.',
    name: 'Title INFORMATION text',
    desc: 'Title-screen message. Use Shift-JIS characters; blank hides the message.',
  });
  R.Config('unlock_all_songs', {
    type: 'boolean',
    default: true,
    name: 'Unlock all songs and difficulties',
    desc: 'Server-side switch for opening every song and chart difficulty.',
  });

  R.WebUIEvent('updateDeacName', async (data: any) => {
    try {
      await updatePlayerName(String(data.refid || ''), String(data.name || ''));
    } catch (err) {
      console.warn(`[deac] Unable to update player name: ${err}`);
    }
  });

  R.WebUIEvent('updateDeacEpassDisplay', async (data: any) => {
    try {
      await updateEpassDisplay(String(data.refid || ''), data.showEpassNumber);
    } catch (err) {
      console.warn(`[deac] Unable to update EPASS display setting: ${err}`);
    }
  });

  R.Route('eventlog.write', async (info, data, send) => send.object({
    gamesession: K.ITEM('s64', BigInt(1)), logsendflg: K.ITEM('s32', 0),
    logerrlevel: K.ITEM('s32', 0), evtidnosendflg: K.ITEM('s32', 0),
  }));

  R.Route('system.getmaster', async (info, data, send) => {
    const information = String(U.GetConfig('information_text') || '');
    const unlockAll = configBoolean('unlock_all_songs', true);
    const masterData = unlockAll ? MASTER_DATA_UNLOCKED : MASTER_DATA_LOCKED;
    // KDM stores strdata2 in the second half of its EVENTMSG record. The title
    // parser reads the visible message after the second comma, so two header
    // fields are required before the configured text.
    const eventMessage = `0,0,${information}`;
    return send.object({
      result: K.ITEM('s32', 1),
      strdata1: K.ITEM(
        'str',
        Buffer.from(masterData, 'utf-8').toString('base64')
      ),
      strdata2: K.ITEM('str', U.EncodeString(eventMessage, 'shift_jis').toString('base64')),
      // Use the request time so WebUI changes are not hidden by KDM's cached
      // master revision until CORE itself is restarted.
      updatedate: K.ITEM('u64', BigInt(String(Math.floor(Date.now() / 1000)))),
    });
  });

  R.Route('playerdata.usergamedata_send', savePlayerData);
  R.Route('playerdata.usergamedata_recv', loadPlayerData);
  R.Route('playerdata.usergamedata_condrecv', loadPlayerData);
  R.Route('playerdata.usergamedata_inheritance', async (info, data, send) => send.object(RESULT_OK()));
  R.Route('playerdata.usergamedata_scorerank', async (info, data, send) => send.object(RESULT_OK()));
  R.Route('system.convcardnumber', convertCardNumber);

  for (const method of [
    'matching.request', 'matching.wait', 'matching.finish',
    'system.getlocationiplist', 'system.xrpcproxy',
    'esoc.read', 'esoc.write',
  ]) R.Route(method, true);

  R.Unhandled((info, data, send) => {
    if (info.module !== 'eventlog') {
      console.warn(`[deac] Unhandled request: ${info.model}/${info.module}.${info.method}`);
    }
    return send.success();
  });

  // Repair stale score indexes immediately on CORE startup, without requiring
  // every card to be used once before the WebUI becomes correct.
  migrateDerivedData().catch((err: any) => {
    console.warn(`[deac] Unable to rebuild derived score data: ${err}`);
  });
}
