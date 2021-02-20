import { processMdbData,readJSONOrXML } from './helper';

export async function processData() {
  const { music } = await readJSONOrXML("./data/mdb_one_plus_half.json", "./data/mdb_one_plus_half.xml")
  return {
    music
  };
}

export async function processRawData() {
  return await processMdbData("./data/mdb_one_plus_half.xml");
}