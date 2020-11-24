import { gameInfoGet, shopInfoRegist } from "./handlers/info";
import { playableMusic } from "./handlers/MusicList"
import { getPlayer, check, regist, savePlayer } from "./handlers/profiles";
import { updatePlayerInfo } from "./models/webui";

export function register() {
  R.GameCode('M32');

  R.Config("enable_custom_mdb", {
    name: "Enable Custom MDB",
    desc: "For who uses own MDB",
    type: "boolean",
    default: false,
  })

  R.Config("custom_mdb_path", {
    name: "Custom MDB PATH",
    desc: "You need to enabled Custom MDB option first. USE ABSOLUTE PATH !!",
    type: "string",
    default: "",
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