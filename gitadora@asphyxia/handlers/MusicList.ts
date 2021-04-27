import { getVersion } from "../utils";
import { defaultProcessRawData, processDataBuilder } from "../data"
import { CommonMusicDataField, readJSONOrXML, readXML } from "../data";

export const playableMusic: EPR = async (info, data, send) => {
  const version = getVersion(info);
  let music: CommonMusicDataField[] = [];
  try {
    if (U.GetConfig("enable_custom_mdb")) {
      music = (await defaultProcessRawData('data/custom_mdb.xml')).music
    }
  } catch (e) {
    console.error(e.stack);
    console.error("Fallback: Using default MDB method.")
    music = [];
  }

  if (music.length == 0) {
      music = _.get(await processDataBuilder(version), 'music', []);
  }


  await send.object({
    hot: {
      major: K.ITEM('s32', 1),
      minor: K.ITEM('s32', 1),
    },
    musicinfo: K.ATTR({ nr: `${music.length}` }, {
      music,
    }),
  });
};