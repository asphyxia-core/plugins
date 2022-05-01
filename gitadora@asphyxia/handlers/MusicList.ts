import { getVersion } from "../utils";
import { CommonMusicDataField, findMDBFile, readMDBFile, loadSongsForGameVersion } from "../data/mdb";
import Logger from "../utils/logger"

const logger = new Logger("MusicList")

export const playableMusic: EPR = async (info, data, send) => {
  const version = getVersion(info);
  let music: CommonMusicDataField[] = [];
  try {
    if (U.GetConfig("enable_custom_mdb")) {
      let customMdb = findMDBFile("custom")

      music = (await readMDBFile(customMdb)).music
    }
  } catch (e) {
    logger.warn("Read Custom MDB failed. Using default MDB as a fallback.")
    logger.debugWarn(e.stack);
    music = [];
  }

  if (music.length == 0) {
      music = (await loadSongsForGameVersion(version)).music
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