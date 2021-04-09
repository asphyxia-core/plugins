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

export async function readB64JSON(b64path: string) {
  const buff = await IO.ReadFile(b64path, 'utf-8');
  return JSON.parse(Buffer.from(buff, 'base64').toString('utf-8'));
}
