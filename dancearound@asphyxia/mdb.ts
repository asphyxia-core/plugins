/// <reference types="node" />

import { FumenType, UnlockMusicEntry } from './models';

const MDB_BUNDLE = [
  'game',
  'dancearound_data',
  'StreamingAssets',
  'aa',
  'win64',
  'audioWorks',
  'musicassetgroup_assets_music_config',
  'mdb_cabinet_base.bundle',
];

export interface MdbMusic {
  music_id: number;
  title_name: string;
  title_yomigana: string;
  artist_name: string;
  artist_yomigana: string;
  bpm_max: number;
  bpm_min: number;
  distribution_date: string;
  release_code: string;
  volume: number;
  bg_no: number;
  region: number;
  tags: string[];
  limitation_type: number;
  license: string;
  color1: string;
  color2: string;
  color3: string;
  has_mv: number;
  demo_pri: number;
  video_flags: { JP: number; US: number };
  motion_flags: { JP: number; US: number };
  fumens: Array<{
    fumen_type: FumenType;
    level: number;
    playable: number;
    has_official_dance: number;
    backdancer_id: number;
    price: number;
    limitation_type: number;
  }>;
}

export interface LocalMdbCatalog {
  sourcePath: string;
  musicCount: number;
  chartCount: number;
  lockedChartCount: number;
  baselineChartCount: number;
  musics: MdbMusic[];
  unlocks: UnlockMusicEntry[];
}

class Reader {
  offset = 0;

  constructor(readonly data: Buffer) {}

  bytes(size: number): Buffer {
    const value = this.data.slice(this.offset, this.offset + size);
    this.offset += size;
    return value;
  }

  cstring(): string {
    const end = this.data.indexOf(0, this.offset);
    if (end < 0) throw new Error('unterminated UnityFS string');
    const value = this.data.toString('utf8', this.offset, end);
    this.offset = end + 1;
    return value;
  }

  u16(): number {
    const value = this.data.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  u32(): number {
    const value = this.data.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  u64(): number {
    return this.u32() * 0x100000000 + this.u32();
  }

  align(size: number): void {
    this.offset = Math.ceil(this.offset / size) * size;
  }
}

function lz4Length(
  input: Buffer,
  position: { value: number },
  length: number
): number {
  if (length !== 15) return length;
  let next = 255;
  while (next === 255) {
    next = input[position.value++];
    length += next;
  }
  return length;
}

function lz4(input: Buffer, outputSize: number): Buffer {
  const output = Buffer.alloc(outputSize);
  const position = { value: 0 };
  let target = 0;
  while (position.value < input.length) {
    const token = input[position.value++];
    const literalSize = lz4Length(input, position, token >>> 4);
    input.copy(output, target, position.value, position.value + literalSize);
    position.value += literalSize;
    target += literalSize;
    if (position.value >= input.length) break;

    const distance = input[position.value] | (input[position.value + 1] << 8);
    position.value += 2;
    const matchSize = lz4Length(input, position, token & 0x0f) + 4;
    for (let i = 0; i < matchSize; ++i) {
      output[target] = output[target - distance];
      ++target;
    }
  }
  if (target !== outputSize)
    throw new Error(`LZ4 size mismatch: ${target}/${outputSize}`);
  return output;
}

function decompress(input: Buffer, outputSize: number, flags: number): Buffer {
  switch (flags & 0x3f) {
    case 0:
      return input;
    case 2:
    case 3:
      return lz4(input, outputSize);
    default:
      throw new Error(`unsupported UnityFS compression ${flags & 0x3f}`);
  }
}

function unpackUnityFs(bundle: Buffer): Buffer {
  const header = new Reader(bundle);
  if (header.cstring() !== 'UnityFS') throw new Error('not a UnityFS bundle');
  const version = header.u32();
  header.cstring();
  header.cstring();
  header.u64();
  const compressedInfoSize = header.u32();
  const infoSize = header.u32();
  const flags = header.u32();
  if (version >= 7) header.align(16);

  const infoAtEnd = (flags & 0x80) !== 0;
  const infoOffset = infoAtEnd
    ? bundle.length - compressedInfoSize
    : header.offset;
  const info = new Reader(
    decompress(
      bundle.slice(infoOffset, infoOffset + compressedInfoSize),
      infoSize,
      flags
    )
  );
  info.bytes(16);

  const blocks: Array<{ raw: number; packed: number; flags: number }> = [];
  for (let count = info.u32(); count > 0; --count) {
    blocks.push({ raw: info.u32(), packed: info.u32(), flags: info.u16() });
  }

  const nodes: Array<{ offset: number; size: number }> = [];
  for (let count = info.u32(); count > 0; --count) {
    const offset = info.u64();
    const size = info.u64();
    info.u32();
    info.cstring();
    nodes.push({ offset, size });
  }

  let dataOffset = infoAtEnd ? header.offset : infoOffset + compressedInfoSize;
  if ((flags & 0x200) !== 0) dataOffset = Math.ceil(dataOffset / 16) * 16;
  const chunks: Buffer[] = [];
  for (const block of blocks) {
    chunks.push(
      decompress(
        bundle.slice(dataOffset, dataOffset + block.packed),
        block.raw,
        block.flags
      )
    );
    dataOffset += block.packed;
  }

  const data = Buffer.concat(chunks);
  return Buffer.concat(
    nodes.map(node => data.slice(node.offset, node.offset + node.size))
  );
}

function findJsonEnd(data: Buffer, start: number): number {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < data.length; ++i) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (data[i] === 0x5c) escaped = true;
      else if (data[i] === 0x22) quoted = false;
    } else if (data[i] === 0x22) quoted = true;
    else if (data[i] === 0x7b) ++depth;
    else if (data[i] === 0x7d && --depth === 0) return i + 1;
  }
  return -1;
}

function extractMdb(bundle: Buffer): any {
  const data = unpackUnityFs(bundle);
  const marker = data.indexOf(Buffer.from('"music_count"'));
  if (marker < 0) throw new Error('mdb_cabinet_base TextAsset was not found');
  for (
    let start = data.lastIndexOf(0x7b, marker);
    start >= 0;
    start = data.lastIndexOf(0x7b, start - 1)
  ) {
    const end = findJsonEnd(data, start);
    if (end < 0) continue;
    try {
      const document = JSON.parse(data.toString('utf8', start, end));
      if (Array.isArray(document.musics)) return document;
    } catch (_) {}
  }
  throw new Error('mdb_cabinet_base TextAsset was not found');
}

function number(value: any, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: any): string {
  return value == null ? '' : `${value}`;
}

function flagPair(value: any): { JP: number; US: number } {
  return { JP: number(value && value.JP), US: number(value && value.US) };
}

function catalog(document: any, sourcePath: string): LocalMdbCatalog {
  const musics: MdbMusic[] = [];
  const unlocks: UnlockMusicEntry[] = [];
  let lockedChartCount = 0;
  let baselineChartCount = 0;

  for (const source of document.musics) {
    const musicId = number(source.music_id);
    const limitation = number(source.limitation_type);
    const fumens = (source.fumens || [])
      .filter(
        (fumen: any) =>
          number(fumen.playable) === 1 || number(fumen.playable) === 2
      )
      .map((fumen: any) => {
        const playable = number(fumen.playable);
        if (playable === 1) ++lockedChartCount;
        else ++baselineChartCount;
        return {
          fumen_type: text(fumen.fumen_type) as FumenType,
          level: number(fumen.level),
          playable,
          has_official_dance: number(fumen.has_official_dance),
          backdancer_id: number(fumen.backdancer_id),
          price: number(fumen.fumen_price),
          limitation_type: playable === 1 ? 2 : limitation,
        };
      });
    if (!fumens.length) continue;

    musics.push({
      music_id: musicId,
      title_name: text(source.title_name),
      title_yomigana: text(source.title_yomigana),
      artist_name: text(source.artist_name),
      artist_yomigana: text(source.artist_yomigana),
      bpm_max: number(source.bpm_max),
      bpm_min: number(source.bpm_min),
      distribution_date: text(source.distribution_date),
      release_code: text(source.release_code),
      volume: number(source.volume),
      bg_no: number(source.bg_no),
      region: number(source.region),
      tags: Array.isArray(source.tags) ? source.tags.map(text) : [],
      limitation_type: limitation,
      license: text(source.license),
      color1: text(source.color1),
      color2: text(source.color2),
      color3: text(source.color3),
      has_mv: number(source.has_mv),
      demo_pri: number(source.demo_pri),
      video_flags: flagPair(source.video_flags),
      motion_flags: flagPair(source.motion_flags),
      fumens,
    });
    unlocks.push({ musicId, fumens: fumens.map(fumen => fumen.fumen_type) });
  }

  return {
    sourcePath,
    musicCount: musics.length,
    chartCount: lockedChartCount + baselineChartCount,
    lockedChartCount,
    baselineChartCount,
    musics,
    unlocks,
  };
}

function findBundle(gamePath: string): string | null {
  const fs = require('fs');
  const path = require('path');
  const roots = gamePath
    ? [gamePath]
    : [process.cwd(), path.dirname(process.cwd())];
  for (const value of roots) {
    const root = path.resolve(value);
    const candidates =
      path.extname(root).toLowerCase() === '.bundle'
        ? [root]
        : [MDB_BUNDLE, MDB_BUNDLE.slice(1), MDB_BUNDLE.slice(2)].map(parts =>
            path.join(root, ...parts)
          );
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile())
        return candidate;
    }
  }
  return null;
}

let cacheKey = '';
let cache: LocalMdbCatalog | null = null;
let reportedError = '';

export function readLocalMdb(bundlePath: string): LocalMdbCatalog {
  const fs = require('fs');
  const path = require('path');
  const resolved = path.resolve(bundlePath);
  return catalog(extractMdb(fs.readFileSync(resolved)), resolved);
}

export async function loadLocalMdb(): Promise<LocalMdbCatalog | null> {
  const fs = require('fs');
  const configured = text(U.GetConfig('game_path')).trim();
  const bundlePath = findBundle(configured);
  if (!bundlePath) {
    const error = configured
      ? `MDB was not found under ${configured}`
      : 'game_path is not set';
    if (reportedError !== error) console.warn(`[Dance Around] ${error}`);
    reportedError = error;
    return null;
  }

  const stat = fs.statSync(bundlePath);
  const key = `${bundlePath}:${stat.size}:${stat.mtimeMs}`;
  if (cache && cacheKey === key) return cache;
  try {
    cache = readLocalMdb(bundlePath);
    cacheKey = key;
    reportedError = '';
    console.log(
      `[Dance Around] loaded ${cache.musicCount} music / ${cache.chartCount} charts from local MDB`
    );
    return cache;
  } catch (error) {
    const message = `${bundlePath}: ${error}`;
    if (reportedError !== message)
      console.error(`[Dance Around] failed to load MDB: ${message}`);
    reportedError = message;
    return null;
  }
}
