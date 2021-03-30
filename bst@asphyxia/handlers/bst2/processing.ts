import { IBst2Player } from "../../models/bst2/profile"
import { KITEM2 } from "../../utility/mapping"
import { toFullWidth, toHalfWidth } from "../../utility/utility_functions"

export function readPlayerPostProcess(player: KITEM2<IBst2Player>): KITEM2<IBst2Player> {
    if (player.pdata.base?.name != null) player.pdata.base.name["@content"] = toFullWidth(player.pdata.base.name["@content"])
    return player
}
export function writePlayerPreProcess(player: KITEM2<IBst2Player>): KITEM2<IBst2Player> {
    if (player.pdata.base?.name != null) player.pdata.base.name["@content"] = toHalfWidth(player.pdata.base.name["@content"])
    return player
}