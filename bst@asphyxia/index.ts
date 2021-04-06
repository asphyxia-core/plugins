import { UtilityHandlersCommon } from "./handlers/utility/common"
import { UtilityHandlersWebUI } from "./handlers/utility/webui"
import { initialize } from "./handlers/utility/initialize"
import { Bst2HandlersCommon } from "./handlers/bst2/common"
import { Bst2HandlersWebUI } from "./handlers/bst2/webui"

export function register() {
    R.GameCode("NBT")

    routeBst2()

    R.WebUIEvent("removeWebUIMessage", UtilityHandlersWebUI.removeWebUIMessage)

    R.Unhandled()

    initialize()
}

function routeBst2() {
    R.Route("info2.common", Bst2HandlersCommon.Common)
    R.Route("pcb2.boot", Bst2HandlersCommon.BootPcb)
    R.Route("player2.start", Bst2HandlersCommon.StartPlayer)
    R.Route("player2.continue", Bst2HandlersCommon.StartPlayer)
    R.Route("player2.succeed", Bst2HandlersCommon.PlayerSucceeded)
    R.Route("player2.read", Bst2HandlersCommon.ReadPlayer)
    R.Route("player2.write", Bst2HandlersCommon.WritePlayer)
    R.Route("player2.stagedata_write", Bst2HandlersCommon.WriteStageLog)
    R.Route("player2.course_stage_data_write", Bst2HandlersCommon.WriteCourseStageLog)
    R.Route("player2.course_data_write", Bst2HandlersCommon.WriteCourseLog)

    R.WebUIEvent("bst2UpdateSettings", Bst2HandlersWebUI.UpdateSettings)
}