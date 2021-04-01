import { IWebUIMessage, WebUIMessageType } from "../../models/utility/webui_message"
import { DBM } from "./db_manager"

export namespace UtilityHandlersWebUI {
    export function pushMessage(message: string, version: number, type: WebUIMessageType, rid?: string) {
        DBM.upsert<IWebUIMessage>(null, { collection: "utility.webuiMessage" }, { collection: "utility.webuiMessage", message: message, type: type, refid: rid, version: version })
    }

    export const removeWebUIMessage = async () => {
        await DBM.remove<IWebUIMessage>(null, { collection: "utility.webuiMessage" })
    }
}