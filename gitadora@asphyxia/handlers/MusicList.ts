import { getVersion } from "../utils";
import { findMDBFile, readMDBFile, loadSongsForGameVersion } from "../data/mdb";
import { CommonMusicDataField } from "../models/commonmusicdata";
import Logger from "../utils/logger"
import { getPlayableMusicResponse, PlayableMusicResponse } from "../models/Responses/playablemusicresponse";

const logger = new Logger("MusicList")

export const playableMusic: EPR = async (info, data, send) => {
  const version = getVersion(info);
  const start = Date.now()
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

  const end = Date.now()
  const timeDiff = end - start
  logger.debugInfo(`MDB loading took ${timeDiff} ms`)

  let response : PlayableMusicResponse = getPlayableMusicResponse(music)
  await send.object(response)
};

