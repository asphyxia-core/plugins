import { processMdbData,readJSONOrXML } from './helper';

export async function processData() {
  const { music } = await readJSONOrXML("./data/mdb_community_plus.json", "./data/mdb_community_plus.xml")
  return {
    music
  };
}

export async function processRawData() {
  return await processMdbData("./data/mdb_community_plus.xml")
}