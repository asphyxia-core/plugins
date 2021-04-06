import { ICollection } from "./definitions"

export interface IWebUIMessage extends ICollection<"utility.webuiMessage"> {
    message: string
    type: WebUIMessageType
    refid?: string
    version: number
}

export enum WebUIMessageType {
    info = 0,
    success = 1,
    error = 2
}