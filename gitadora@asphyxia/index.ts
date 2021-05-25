import { gameInfoGet, shopInfoRegist } from "./handlers/info";
import { playableMusic } from "./handlers/MusicList"
import { getPlayer, check, regist, savePlayer } from "./handlers/profiles";
import { updatePlayerInfo } from "./handlers/webui";
import { isAsphyxiaDebugMode, isRequiredCoreVersion } from "./utils";

export function register() {
  if(!isRequiredCoreVersion(1, 20)) {
    console.error("You need newer version of Core. v1.20 or newer required.")
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
        + "This thing is bandage of these problem as limiting some Encores for SPE.",
    type: "boolean",
    default: false
  })

  R.Config("enable_custom_mdb", {
    name: "Enable Custom MDB",
    desc: "For who uses own MDB. eg) Omnimix.",
    type: "boolean",
    default: false,
  })

  R.DataFile("data/mdb/custom.xml", {
    accept: ".xml",
    name: "Custom MDB",
    desc: "You need to enable Custom MDB option first."
  })

  R.WebUIEvent('updatePlayerInfo', updatePlayerInfo);

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    R.Route(`exchain_${method}`, handler);
    R.Route(`matixx_${method}`, handler);
    R.Route(`nextage_${method}`, handler)
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
  MultiRoute('gameend.regist', savePlayer);

  R.Unhandled(async (info, data, send) => {
    if (["eventlog"].includes(info.module)) return;
    console.error(`Received Unhandled Response on ${info.method} by ${info.model}/${info.module}`)
    if (isAsphyxiaDebugMode()){
      console.error(`Received Request: ${JSON.stringify(data, null, 4)}`)
    }
  })
}