import { gameInfoGet, shopInfoRegist } from "./handlers/info";
import { playableMusic } from "./handlers/MusicList"
import { getPlayer, check, regist, savePlayers } from "./handlers/profiles";
import { updatePlayerInfo } from "./handlers/webui";
import { isAsphyxiaDebugMode, isRequiredCoreVersion } from "./utils";
import Logger from "./utils/logger";

const logger = new Logger("main")

export function register() {
  if(!isRequiredCoreVersion(1, 20)) {
    console.error("A newer version of Asphyxia Core (v1.20 or later) is required.")
  }

  R.GameCode('M32');

  R.Config("encore_version", {
    name: "Encore Version",
    desc: "Set encore version",
    type: "integer",
    default: 13,
  })

  R.Config("nextage_dummy_encore", {
    name: "Dummy Encore for SPE (Nextage Only)",
    desc: "Since Nextage's Special Premium Encore system is bit complicated, \n"
        + "SPE System isn't fully implemented. \n"
        + "This option is a workaround for this issue as limiting some Encores for SPE.",
    type: "boolean",
    default: false
  })

  R.Config("enable_custom_mdb", {
    name: "Enable Custom MDB",
    desc: "If disabled, the server will provide the default MDB (song list) to Gitadora clients, depending on which version of the game they are running." + 
    "Enable this option to provide your own custom MDB instead. MDB files are stored in the 'gitadora@asphyxia/data/mdb' folder, and can be in .xml, .json or .b64 format.",
    type: "boolean",
    default: false,
  })

  R.Config("shared_favorite_songs", {
    name: "Shared Favorite Songs (Experimental)",
    desc: "If disabled, players will be able to keep separate lists of favorite songs for each version of Gitadora, as well as between Guitar Freaks and Drummania. " + 
    "Enable this option to have a single unified list of favorite songs for both games, and across all versions. Default is false, to match original arcade behaviour.",
    type: "boolean",
    default: false,
  })

  R.DataFile("data/mdb/custom.xml", {
    accept: ".xml",
    name: "Custom MDB",
    desc: "Remember to enable the 'Enable Custom MDB' option for the uploaded file to have any effect."
  })

  R.WebUIEvent('updatePlayerInfo', updatePlayerInfo);

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    R.Route(`exchain_${method}`, handler);
    R.Route(`matixx_${method}`, handler);
    R.Route(`nextage_${method}`, handler)
    R.Route(`highvoltage_${method}`, handler)
    // TODO: TB, TBRE and more older version?
  };

  // Info
  MultiRoute('shopinfo.regist', shopInfoRegist)
  MultiRoute('gameinfo.get', gameInfoGet)

  // MusicList
  MultiRoute('playablemusic.get', playableMusic)

  // Profile
  MultiRoute('cardutil.regist', regist);
  MultiRoute('cardutil.check', check);
  MultiRoute('gametop.get', getPlayer);
  MultiRoute('gameend.regist', savePlayers);

  // Misc
  R.Route('bemani_gakuen.get_music_info', true) 

  R.Unhandled(async (info, data, send) => {
    if (["eventlog"].includes(info.module)) return;
    logger.error(`Received Unhandled Request on Method "${info.method}" by ${info.model}/${info.module}`)
    logger.debugError(`Received Request: ${JSON.stringify(data, null, 4)}`)
  })
}