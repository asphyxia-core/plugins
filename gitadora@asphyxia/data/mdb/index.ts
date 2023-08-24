import Logger from "../../utils/logger";
import { CommonMusicData } from "../../models/commonmusicdata";


export enum DATAVersion {
  HIGHVOLTAGE = "hv",
  NEXTAGE     = "nt",
  EXCHAIN     = "ex",
  MATTIX      = "mt"
}

const allowedFormats = ['.json', '.xml', '.b64']
const mdbFolder =  "data/mdb/"

type processRawDataHandler = (path: string) => Promise<CommonMusicData>

const logger = new Logger("mdb")

export async function readXML(path: string) {
  const xml = await IO.ReadFile(path, 'utf-8');
  const json = U.parseXML(xml, false)
  return json
}

export async function readMDBFile(path: string, processHandler?: processRawDataHandler): Promise<CommonMusicData> {

  if (!IO.Exists(path)) {
    throw "Unable to find MDB file at " + path
  }

  logger.debugInfo(`Loading MDB data from ${path}.`)

  let result : CommonMusicData;
  const fileType = path.substring(path.lastIndexOf('.')).toLowerCase()

  switch (fileType) {
    case '.json':
      const str = await IO.ReadFile(path, 'utf-8');
      result = JSON.parse(str)
    break;
    case '.xml':
      processHandler = processHandler ?? defaultProcessRawXmlData
      result = await processHandler(path)
      // Uncomment to save the loaded XML file as JSON.
      // await IO.WriteFile(path.replace(".xml", ".json"), JSON.stringify(result))
    break;
    case '.b64':
      const buff = await IO.ReadFile(path, 'utf-8');
      const json = Buffer.from(buff, 'base64').toString('utf-8')
      // Uncomment to save the decoded base64 file as JSON.
      // await IO.WriteFile(path.replace(".b64",".json"), json)
      result = JSON.parse(json)
    break;
      default:
        throw `Invalid MDB file type: ${fileType}. Only .json, .xml, .b64 are supported.`
  }

  let gfCount = result.music.filter((e) => e.cont_gf["@content"][0]).length
  let dmCount = result.music.filter((e) => e.cont_dm["@content"][0]).length
  logger.debugInfo(`Loaded ${result.music.length} songs from MDB file. ${gfCount} songs for GF, ${dmCount} songs for DM.`)
  return result
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

/**
 * Attempts to find a .json, .xml, or .b64 file (in that order) matching the given name in the specified folder.
 * @param fileNameWithoutExtension - The name of the file to find (without the extension).
 * @param path - The path to the folder to search. If left null, the default MDB folder ('data/mdb' in the plugin folder) will be used.
 * @returns - The path of the first matching file found, or null if no file was found.
 */
export function findMDBFile(fileNameWithoutExtension: string, path: string = null): string {

  path = path ?? mdbFolder
  if (!IO.Exists(path)) {
    throw `Path does not exist: ${path}`
  }

  if (!path.endsWith("/")) {
    path += "/"
  }

  for (const ext of allowedFormats) {
    const filePath = path + fileNameWithoutExtension + ext
    if (IO.Exists(filePath)) {
      return filePath
    }
  }

  return null
}

export async function loadSongsForGameVersion(gameVer: string, processHandler?: processRawDataHandler) {
  const ver = gameVerToDataVer(gameVer)

  let mdbFile = findMDBFile(ver, mdbFolder)

  if (mdbFile == null) {
    throw `No valid MDB files were found in the data/mdb subfolder. Ensure that this folder contains at least one of the following: ${ver}.json, ${ver}.xml or ${ver}.b64`
  }

  const music = await readMDBFile(mdbFile, processHandler ?? defaultProcessRawXmlData)
  return music   
}

export async function defaultProcessRawXmlData(path: string): Promise<CommonMusicData> {
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
      is_secret: K.ITEM('bool', m.number("is_secret", 0)),
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