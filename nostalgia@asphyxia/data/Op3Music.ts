import { readB64JSON, readXML } from './helper';

const OP3_XML_CANDIDATES = [
  'data/op3_mdb.xml',
  'data/music_list.xml',
];

const OP3_B64 = 'data/op3_mdb.json.b64';
const OP3_PROCESSED_B64 = 'data/op3_mdb_processed.json.b64';

export type ProcessedOp3Music = {
  revision: string;
  release_code: string;
  music_spec: any[];
  overwrite_spec: any[];
  max_index: number;
};

type RawSong = Record<string, string | undefined>;

let processedMemo: ProcessedOp3Music | null = null;

function songNodes(data: any): any[] {
  const list = data?.music_list;
  if (!list) return [];

  const specs = list.music_spec;
  if (specs) return _.isArray(specs) ? specs : [specs];

  const entries = _.isArray(list) ? list : [list];
  if (entries.length === 1 && entries[0]?.music_spec) {
    const inner = entries[0].music_spec;
    return _.isArray(inner) ? inner : [inner];
  }

  const root = data.music_list?.['@attr'] ? data.music_list : data;
  const children = Object.keys(root)
    .filter((k) => k !== '@attr' && k !== 'music_spec')
    .flatMap((k) => {
      const v = root[k];
      return _.isArray(v) ? v : v ? [v] : [];
    });

  if (children.length > 0) return children;
  return [];
}

function readField(node: any, name: string, fallback = '0'): string {
  const el = node?.[name];
  if (el == null) return fallback;
  if (typeof el === 'string' || typeof el === 'number') return `${el}`;
  return `${_.get(el, '@content.0', fallback)}`;
}

function toSong(node: any): { index: string; fields: RawSong } {
  const index = `${node?.['@attr']?.index ?? node?.index ?? '0'}`;
  const fields: RawSong = {};
  const keys = [
    'priority', 'category_flag', 'primary_category',
    'level_normal', 'level_hard', 'level_extreme', 'level_real',
    'demo_popular', 'demo_bemani',
    'destination_j', 'destination_a', 'destination_y', 'destination_k',
    'offline', 'unlock_type', 'volume_bgm', 'volume_key',
    'jk_jpn', 'jk_asia', 'jk_kor', 'jk_idn',
    'real_unlock_type', 'real_once_price', 'real_forever_price',
  ];
  for (const key of keys) {
    fields[key] = readField(node, key);
  }
  return { index, fields };
}

function musicSpec(index: string, s: RawSong, overwrite = false) {
  const bool = (k: string, def = '1') => K.ITEM('bool', readField({ [k]: s[k] }, k, def) !== '0');
  const base: any = {
    basename: K.ITEM('str', ''),
    title: K.ITEM('str', ''),
    title_kana: K.ITEM('str', ''),
    artist: K.ITEM('str', ''),
    artist_kana: K.ITEM('str', ''),
    license: K.ITEM('str', ''),
    license_site: K.ITEM('str', ''),
    priority: K.ITEM('s8', parseInt(s.priority || '0', 10)),
    category_flag: K.ITEM('s32', parseInt(s.category_flag || '0', 10)),
    primary_category: K.ITEM('s8', parseInt(s.primary_category || '0', 10)),
    level_normal: K.ITEM('s8', parseInt(s.level_normal || '0', 10)),
    level_hard: K.ITEM('s8', parseInt(s.level_hard || '0', 10)),
    level_extreme: K.ITEM('s8', parseInt(s.level_extreme || '0', 10)),
    level_real: K.ITEM('s8', parseInt(s.level_real || '0', 10)),
    demo_popular: bool('demo_popular', '0'),
    demo_bemani: bool('demo_bemani', '0'),
    destination_j: bool('destination_j'),
    destination_a: bool('destination_a'),
    destination_y: bool('destination_y'),
    destination_k: bool('destination_k'),
    offline: bool('offline', '0'),
    unlock_type: K.ITEM('s8', parseInt(s.unlock_type || '0', 10)),
    volume_bgm: K.ITEM('s8', parseInt(s.volume_bgm || '0', 10)),
    volume_key: K.ITEM('s8', parseInt(s.volume_key || '0', 10)),
    start_date: K.ITEM('str', '2017-03-01 10:00'),
    end_date: K.ITEM('str', '9999-12-31 23:59'),
    expiration_date: K.ITEM('str', '9999-12-31 23:59'),
    description: K.ITEM('str', ''),
  };

  if (overwrite) {
    return K.ATTR({ index }, {
      jk_jpn: bool('jk_jpn'),
      jk_asia: bool('jk_asia'),
      jk_kor: bool('jk_kor'),
      jk_idn: bool('jk_idn'),
      unlock_type: K.ITEM('s8', parseInt(s.unlock_type || '0', 10)),
      real_unlock_type: K.ITEM('s8', parseInt(s.real_unlock_type || '0', 10)),
      start_date: K.ITEM('str', '2017-03-01 10:00'),
      end_date: K.ITEM('str', '9999-12-31 23:59'),
      real_once_price: K.ITEM('s32', parseInt(s.real_once_price || '300', 10)),
      real_forever_price: K.ITEM('s32', parseInt(s.real_forever_price || '7500', 10)),
      real_start_date: K.ITEM('str', '2017-03-01 10:00'),
      real_end_date: K.ITEM('str', '9999-12-31 23:59'),
    });
  }

  return K.ATTR({ index }, base);
}

function emptyProcessed(): ProcessedOp3Music {
  return {
    revision: '21261',
    release_code: '2021090800',
    music_spec: [],
    overwrite_spec: [],
    max_index: 0,
  };
}

function buildProcessedFromRaw(raw: any): ProcessedOp3Music {
  const attr = raw?.music_list?.['@attr'] ?? {};
  const revision = `${attr.revision ?? '21261'}`;
  const release_code = `${attr.release_code ?? '2021090800'}`;
  const songs = songNodes(raw).map(toSong).filter((s) => parseInt(s.index, 10) > 0);

  let maxIndex = 0;
  for (const s of songs) {
    maxIndex = Math.max(maxIndex, parseInt(s.index, 10));
  }

  return {
    revision,
    release_code,
    music_spec: songs.map((s) => musicSpec(s.index, s.fields, false)),
    overwrite_spec: songs.map((s) => musicSpec(s.index, s.fields, true)),
    max_index: maxIndex,
  };
}

async function readProcessedCache(): Promise<ProcessedOp3Music | null> {
  if (!IO.Exists(OP3_PROCESSED_B64)) {
    return null;
  }
  try {
    return await readB64JSON(OP3_PROCESSED_B64);
  } catch {
    return null;
  }
}

async function writeProcessedCache(data: ProcessedOp3Music): Promise<void> {
  await IO.WriteFile(
    OP3_PROCESSED_B64,
    Buffer.from(JSON.stringify(data)).toString('base64')
  );
}

async function loadRaw(): Promise<any | null> {
  if (IO.Exists(OP3_B64)) {
    return readB64JSON(OP3_B64);
  }

  let xmlPath: string | null = null;
  for (const candidate of OP3_XML_CANDIDATES) {
    if (IO.Exists(candidate)) {
      xmlPath = candidate;
      break;
    }
  }

  if (!xmlPath) {
    console.warn('[nostalgia@asphyxia] OP3 music DB missing. Copy music_list.xml to data/op3_mdb.xml');
    return null;
  }

  const raw = await readXML(xmlPath);
  await IO.WriteFile(
    OP3_B64,
    Buffer.from(JSON.stringify(raw)).toString('base64')
  );
  return raw;
}

export async function processOp3MusicData(): Promise<ProcessedOp3Music & { fromCache: boolean }> {
  if (processedMemo) {
    return { ...processedMemo, fromCache: true };
  }

  const raw = await loadRaw();
  if (!raw) {
    const empty = emptyProcessed();
    processedMemo = empty;
    return { ...empty, fromCache: false };
  }

  const attr = raw?.music_list?.['@attr'] ?? {};
  const revision = `${attr.revision ?? '21261'}`;
  const release_code = `${attr.release_code ?? '2021090800'}`;

  const cached = await readProcessedCache();
  if (cached && cached.revision === revision && cached.release_code === release_code) {
    processedMemo = cached;
    return { ...cached, fromCache: true };
  }

  const built = buildProcessedFromRaw(raw);
  processedMemo = built;
  await writeProcessedCache(built);
  return { ...built, fromCache: false };
}
