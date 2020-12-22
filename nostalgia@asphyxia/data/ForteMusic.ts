import { CommonMusicDataField, readB64JSON, readXML } from "./helper";

export async function processData() {
  if (IO.Exists("data/forte_mdb.json.b64")) {
    return await readB64JSON("data/forte_mdb.json.b64");
  }
  const data = await readJSONOrXML("data/forte_mdb.json", "data/forte_mdb.xml")
  // await IO.WriteFile("data/forte_mdb.json.b64", Buffer.from(JSON.stringify(data)).toString("base64"))
  return data
}

export async function processMdbData(path: string): Promise<CommonMusicData> {
  const data = await readXML(path);
  const attr = $(data).attr("music_list");
  const mdb = $(data).elements("music_list.music_spec");
  const music: CommonMusicDataField[] = [];
  for (const m of mdb) {
    music.push(K.ATTR({ index: m.attr().index }, {
      basename: K.ITEM("str", m.str("basename")),
      title: K.ITEM("str", m.str("title", "title")),
      title_kana: K.ITEM("str", m.str("title_kana", "title_kana")),
      artist: K.ITEM("str", m.str("artist", "artist")),
      artist_kana: K.ITEM("str", m.str("artist_kana", "artist_kana")),
      priority: K.ITEM("s8", m.number("priority")),
      category_flag: K.ARRAY("s32", m.numbers("category_flag")),
      primary_category: K.ITEM("s8", m.number("primary_category")),
      level_normal: K.ITEM("s8", m.number("level_normal")),
      level_hard: K.ITEM("s8", m.number("level_hard")),
      level_extreme: K.ITEM("s8", m.number("level_extreme")),
      demo_popular: K.ITEM("bool", m.bool("demo_popular")),
      demo_bemani: K.ITEM("bool", m.bool("demo_bemani")),
      destination_j: K.ITEM("bool", true),
      destination_a: K.ITEM("bool", true),
      destination_y: K.ITEM("bool", true),
      destination_k: K.ITEM("bool", true),
      offline: K.ITEM("bool", m.bool("offline")),
      unlock_type: K.ITEM("s8", m.number("unlock_type") == 3 ? 1 : m.number("unlock_type")),
      volume_bgm: K.ITEM("s8", m.number("volume_bgm")),
      volume_key: K.ITEM("s8", m.number("volume_key")),
      start_date: K.ITEM("str", m.str("start_date")),
      end_date: K.ITEM("str", "9999-12-31 23:59"),
      description: K.ITEM("str", m.str("description", "description"))
    }));
  }
  return K.ATTR({
    release_code: attr.release_code,
    revision: attr.revision,
  }, {
    music_spec: music,
  });
}

export async function readJSONOrXML(jsonPath: string, xmlPath: string): Promise<CommonMusicData> {
  if (!IO.Exists(jsonPath)) {
    const data = await processMdbData(xmlPath)
    await IO.WriteFile(jsonPath, JSON.stringify(data))
    await IO.WriteFile(jsonPath.replace(".json", ".json.b64"), Buffer.from((JSON.stringify(data))).toString('base64'));
    return data
  } else {
    const json = JSON.parse(await IO.ReadFile(jsonPath, 'utf-8'))
    return json
  }
}

interface CommonMusicData {
  "@attr": {
    revision: string,
    release_code: string
  }
  music_spec: CommonMusicDataField[]
}