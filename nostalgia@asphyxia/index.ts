import { get_common_info, get_music_info } from "./handler/common";
import { get_musicdata, get_playdata, regist_playdata, set_total_result } from "./handler/player"

export function register() {
    R.GameCode('PAN');

    const MultiRoute = (method: string, handler: EPR | boolean) => {
        // Helper for register multiple versions.
        R.Route(method, handler); // First version and Forte.
        R.Route(`op2_${method}`, handler);
    };

    const CommonRoute = (method: string, handler: EPR | boolean) =>
        MultiRoute(`common.${method}`, handler)

    const PlayerRoute = (method: string, handler: EPR | boolean) =>
        MultiRoute(`player.${method}`, handler)

    // Common
    CommonRoute('get_common_info', get_common_info);
    CommonRoute('get_music_info', get_music_info);

    // Player
    PlayerRoute('get_musicdata', get_musicdata)
    PlayerRoute('get_playdata', get_playdata)
    PlayerRoute('regist_playdata', regist_playdata)
    PlayerRoute('set_total_result', set_total_result)

    //TODO:  Fix this things with actual working handler.
    PlayerRoute('set_stage_result', true)

    R.Unhandled(async (info, data, send) => {
        if (["eventlog"].includes(info.module)) return;
        console.error(`Received Unhandled Response on ${info.method} by ${info.model}/${info.module}`)
        console.error(`Received Request: ${JSON.stringify(data, null, 4)}`)
    })
}