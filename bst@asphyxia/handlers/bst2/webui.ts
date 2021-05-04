import { IBst2Base, IBst2Customization } from "../../models/bst2/profile"
import { WebUIMessageType } from "../../models/utility/webui_message"
import { DBM } from "../utility/db_manager"
import { UtilityHandlersWebUI } from "../utility/webui"

export namespace Bst2HandlersWebUI {
    export const UpdateSettings = async (data: {
        refid: string
        name: string
        rippleNote: number
        sfxNormalNote: number
        sfxRippleNote: number
        sfxSlashNote: number
        sfxStreamNote: number
        backgroundBrightness: number
        judgeText: number
        rippleNoteGuide: number
        streamNoteGuide: number
        sfxFine: number
        sfxStreamNoteTail: number
    }) => {
        try {
            let base = await DB.FindOne<IBst2Base>(data.refid, { collection: "bst.bst2.player.base" })
            let customization = await DB.FindOne<IBst2Customization>(data.refid, { collection: "bst.bst2.player.customization" })
            if (!customization || !base) throw new Error("No profile for refid=" + data.refid)
            base.name = data.name
            customization.custom[0] = data.rippleNote
            customization.custom[2] = data.sfxNormalNote
            customization.custom[3] = data.sfxRippleNote
            customization.custom[4] = data.sfxSlashNote
            customization.custom[5] = data.sfxStreamNote
            customization.custom[6] = data.backgroundBrightness
            customization.custom[7] = (data.judgeText << 0) | (data.rippleNoteGuide << 1) | (data.streamNoteGuide << 2) | (data.sfxStreamNoteTail << 3) | (data.sfxFine << 4)
            customization.custom[9] = data.judgeText
            DBM.update<IBst2Base>(data.refid, { collection: "bst.bst2.player.base" }, base)
            DBM.update<IBst2Customization>(data.refid, { collection: "bst.bst2.player.customization" }, customization)
            UtilityHandlersWebUI.pushMessage("Save BeatStream Animtribe settings succeeded!", 2, WebUIMessageType.success, data.refid)
        } catch (e) {
            UtilityHandlersWebUI.pushMessage("Error while save BeatStream Animtribe settings: " + e.message, 2, WebUIMessageType.error, data.refid)
        }
    }
}