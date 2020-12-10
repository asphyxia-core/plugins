import { load, load_m, newProfile, save, save_m } from "./handler/player";
import { setUnlockState } from "./handler/webui";

const common: EPR = async (req, data, send) => {
  send.object(
    {
      flag: K.ATTR({ id: '1', s1: '1', s2: '1', t: '1' }),
      cnt_music: K.ITEM('u32', 36),
    },
    { encoding: 'euc-jp' }
  );
};

const shop: EPR = async (req, data, send) => {
  send.success()
}

export function register() {
    R.GameCode("JMP")

    R.WebUIEvent("setUnlockState", setUnlockState)

    // const Route = (method: string, handler: EPR) =>
    //     R.Route(`game.${method}`, handler)
    
    // Common
    R.Route("game.common", common)
    R.Route("game.shop", shop)

    // Player
    R.Route("game.new", newProfile)
    R.Route("game.load", load)
    R.Route("game.load_m", load_m)
    R.Route("game.save", save)
    R.Route("game.save_m", save_m)


    R.Unhandled()
}