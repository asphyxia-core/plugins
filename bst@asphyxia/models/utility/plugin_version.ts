import { ICollection } from "./definitions"

export interface IPluginVersion<TMajor extends number = number, TMinor extends number = number, TRevision extends number = number> extends ICollection<"bst.pluginVersion"> {
    version: string
}