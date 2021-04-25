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

export async function readJSONOrXML(jsonPath: string, xmlPath: string, processHandler: (path: string) => Promise<CommonMusicData>): Promise<CommonMusicData> {
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
