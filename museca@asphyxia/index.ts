import { common, exception, lounge, shop, hiscore, frozen } from "./handlers/common";
import { load, load_m, newProfile, save, save_m } from "./handlers/player";

export function register() {
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

  R.Config("custom_mdb_path", {
    name: "Custom MDB PATH",
    desc: "You need to enable Custom MDB option first. USE ABSOLUTE PATH !!",
    type: "string",
    default: "",
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
  Route("load", load)
  Route("load_m", load_m)

  R.Unhandled(async (info, data, send) => {
    if (["eventlog"].includes(info.module)) return;
    console.error(`Received Unhandled Response on ${info.method} by ${info.model}/${info.module}`)
    console.error(`Received Request: ${JSON.stringify(data, null, 4)}`)
  })
}