export async function processData() {
  return await readJSONOrXML("data/forte_mdb.json", "data/forte_mdb.xml")
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


export interface CommonMusicDataField {
  basename: KITEM<"str">;
  title: KITEM<"str">;
  title_kana: KITEM<"str">;
  artist: KITEM<"str">;
  artist_kana: KITEM<"str">
  priority: KITEM<"s8">;
  category_flag: KARRAY<"s32">;
  primary_category: KITEM<"s8">;
  level_normal: KITEM<"s8">;
  level_hard: KITEM<"s8">;
  level_extreme: KITEM<"s8">;
  demo_popular: KITEM<"bool">;
  demo_bemani: KITEM<"bool">
  destination_j: KITEM<"bool">;
  destination_a: KITEM<"bool">;
  destination_y: KITEM<"bool">;
  destination_k: KITEM<"bool">;
  unlock_type: KITEM<"s8">;
  offline: KITEM<"bool">;
  volume_bgm: KITEM<"s8">;
  volume_key: KITEM<"s8">;
  start_date: KITEM<"str">;
  end_date: KITEM<"str">;
  description: KITEM<"str">;
}

interface CommonMusicData {
  "@attr": {
    revision: string,
    release_code: string
  }
  music_spec: CommonMusicDataField[]
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


export async function readJSONOrXML(jsonPath: string, xmlPath: string): Promise<CommonMusicData> {
  if (!IO.Exists(jsonPath)) {
    const data = await processMdbData(xmlPath)
    await IO.WriteFile(jsonPath, JSON.stringify(data))
    return data
  } else {
    const json = JSON.parse(await IO.ReadFile(jsonPath, 'utf-8'))
    return json
  }
}