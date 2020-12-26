import { CommonMusicData, readJSONOrXML } from "./ForteMusic";
import { readB64JSON } from "./helper";

export async function processData(): Promise<CommonMusicData> {
  if (IO.Exists("data/first_mdb.json.b64")) {
    return await readB64JSON("data/first_mdb.json.b64");
  }
  const data = await readJSONOrXML("data/first_mdb.json", "data/first_mdb.xml")
  // await IO.WriteFile("data/first_mdb.json.b64", Buffer.from(JSON.stringify(data)).toString("base64"))
  return data;
}