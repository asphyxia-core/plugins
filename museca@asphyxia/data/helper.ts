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

export async function readJSONOrXML(jsonPath: string, xmlPath: string) {
  const str: string | null = await IO.ReadFile(jsonPath, 'utf-8');
  if (str == null || str.length == 0) {
    const data = await processMdbData(xmlPath)
    await IO.WriteFile(jsonPath, JSON.stringify(data))
    return data
  } else {
    const json = JSON.parse(str)
    return json
  }
}

export async function processMdbData(path: string) {
  const data = await readXML(path);
  const mdb = $(data).elements("mdb.music");
  const diff_list = ["novice", "advanced", "exhaust", "infinite"]
  const music: any[] = [];
  for (const m of mdb) {
    for (const [i, d] of diff_list.entries()) {
      const elem = m.element(`difficulty.${d}`)
      if (elem.number("difnum", 0) == 0) {
        continue;
      }

      music.push({
        music_id: K.ITEM("s32", parseInt(m.attr().id)),
        music_type: K.ITEM("u8", i),
        limited: K.ITEM("u8", elem.number("limited"))
      });
    }
  };
  return {
    music,
  };
}