export interface CommonMusicDataField {
  id: KITEM<"s32">;
  cont_gf: KITEM<"bool">;
  cont_dm: KITEM<"bool">;
  is_secret: KITEM<"bool">;
  is_hot: KITEM<"bool">;
  data_ver: KITEM<"s32">;
  diff: KARRAY<"u16">;
}

export interface CommonMusicData {
  music: CommonMusicDataField[]
}

export enum DATAVersion {
  HIGHVOLTAGE = "hv",
  NEXTAGE     = "nt",
  EXCHAIN     = "ex",
  MATTIX      = "mt"
}

type processRawDataHandler = (path: string) => Promise<CommonMusicData>

export async function readXML(path: string) {
  const xml = await IO.ReadFile(path, 'utf-8');
  const json = U.parseXML(xml, false)
  return json
}

export async function readJSON(path: string) {
  const str = await IO.ReadFile(path, 'utf-8');
  const json = JSON.parse(str)
  return json
}

export async function readJSONOrXML(jsonPath: string, xmlPath: string, processHandler: processRawDataHandler): Promise<CommonMusicData> {
  if (!IO.Exists(jsonPath)) {
    const data = await processHandler(xmlPath)
    await IO.WriteFile(jsonPath, JSON.stringify(data))
    return data
  } else {
    const json = JSON.parse(await IO.ReadFile(jsonPath, 'utf-8'))
    return json
  }
}

export async function readB64JSON(b64path: string) {
  const buff = await IO.ReadFile(b64path, 'utf-8');
  return JSON.parse(Buffer.from(buff, 'base64').toString('utf-8'));
}

export function gameVerToDataVer(ver: string): DATAVersion {
  switch(ver) {
    case 'highvoltage':
      return DATAVersion.HIGHVOLTAGE
    case 'nextage':
      return DATAVersion.NEXTAGE
    case 'exchain':
      return DATAVersion.EXCHAIN
    case 'matixx':
    default:
      return DATAVersion.MATTIX
  }
}

export async function processDataBuilder(gameVer: string, processHandler?: processRawDataHandler) {
  const ver = gameVerToDataVer(gameVer)
  const base = `data/mdb/${ver}`
  if (IO.Exists(`${base}.b64`)) {
    return await readB64JSON(`${base}.b64`);
  }
  const { music } = await readJSONOrXML(`${base}.json`, `${base}.xml`, processHandler ?? defaultProcessRawData)
  // await IO.WriteFile(`${base}.b64`, Buffer.from(JSON.stringify({music})).toString("base64"))
  return { music };
}


export async function defaultProcessRawData(path: string): Promise<CommonMusicData> {
  const data = await readXML(path)
  const mdb = $(data).elements("mdb.mdb_data");
  const music: any[] = [];
  for (const m of mdb) {
    const d = m.numbers("xg_diff_list");
    const contain = m.numbers("contain_stat");
    const gf = contain[0];
    const dm = contain[1];

    if (gf == 0 && dm == 0) {
      continue;
    }

    let type = gf;
    if (gf == 0) {
      type = dm;
    }

    music.push({
      id: K.ITEM('s32', m.number("music_id")),
      cont_gf: K.ITEM('bool', gf == 0 ? 0 : 1),
      cont_dm: K.ITEM('bool', dm == 0 ? 0 : 1),
      is_secret: K.ITEM('bool', 0),
      is_hot: K.ITEM('bool', type == 2 ? 0 : 1),
      data_ver: K.ITEM('s32', m.number("data_ver", 115)),
      diff: K.ARRAY('u16', [
        d[0],
        d[1],
        d[2],
        d[3],
        d[4],
        d[10],
        d[11],
        d[12],
        d[13],
        d[14],
        d[5],
        d[6],
        d[7],
        d[8],
        d[9],
      ]),
    });
  }
  return {
    music,
  };
}