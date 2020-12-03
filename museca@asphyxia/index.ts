import { common, exception, lounge, shop, hiscore, frozen } from "./handlers/common";
import { load, load_m, newProfile, save, save_m } from "./handlers/player";

export function register() {
  if(!R.DataFile) { // TODO: Better implementation.
    return console.error("You need newer version of Core.")
  }

  R.GameCode('PIX');

  R.Config("unlock_all_songs", {
    name: "Force unlock all songs",
    type: "boolean",
    default: false
  })

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

  const Route = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    // Use this when plugin supports first version.
    R.Route(`game_3.${method}`, handler);
  };

  // Common
  Route("common", common)
  Route("shop", shop)
  Route("exception", exception)
  Route("hiscore", hiscore),
  Route("lounge", lounge),
  Route("frozen", frozen)
  Route("play_e", true)

  // Player
  Route("new", newProfile)
  Route("save", save)
  Route("save_m", save_m)
  //Route("save_c", save_c)
  Route("load", load)
  Route("load_m", load_m)

  R.Unhandled(async (info, data, send) => {
    if (["eventlog"].includes(info.module)) return;
    console.error(`Received Unhandled Response on ${info.method} by ${info.model}/${info.module}`)
    console.error(`Received Request: ${JSON.stringify(data, null, 4)}`)
  })
}