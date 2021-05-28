import { getVersion } from "../utils";
import { defaultProcessRawData, processDataBuilder } from "../data/mdb"
import { CommonMusicDataField, readJSONOrXML, readXML } from "../data/mdb";
import Logger from "../utils/logger"

const logger = new Logger("MusicList")

export const playableMusic: EPR = async (info, data, send) => {
  const version = getVersion(info);
  let music: CommonMusicDataField[] = [];
  try {
    if (U.GetConfig("enable_custom_mdb")) {
      music = (await defaultProcessRawData('data/mdb/custom.xml')).music
    }
  } catch (e) {
    logger.warn("Read Custom MDB failed. Using default MDB as a fallback.")
    logger.debugWarn(e.stack);
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