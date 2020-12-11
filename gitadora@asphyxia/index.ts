import { gameInfoGet, shopInfoRegist } from "./handlers/info";
import { playableMusic } from "./handlers/MusicList"
import { getPlayer, check, regist, savePlayer } from "./handlers/profiles";
import { updatePlayerInfo } from "./handlers/webui";
import { isRequiredVersion } from "./utils";

export function register() {
  if(!isRequiredVersion(1, 20)) {
    console.error("You need newer version of Core. v1.20 or newer required.")
  }

  R.GameCode('M32');

  R.Config("enable_custom_mdb", {
    name: "Enable Custom MDB",
    desc: "For who uses own MDB",
    type: "boolean",
    default: false,
  })

  R.DataFile("data/custom_mdb.xml", {
    accept: ".xml",
    name: "Custom MDB",
    desc: "You need to enable Custom MDB option first."
  })

  R.WebUIEvent('updatePlayerInfo', updatePlayerInfo);

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    R.Route(`exchain_${method}`, handler);
    R.Route(`matixx_${method}`, handler);
    // TODO: NEXTAGE
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
}