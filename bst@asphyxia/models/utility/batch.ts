import { ICollection } from "./definitions"

export interface IBatchResult extends ICollection<"bst.batchResult"> {
    batchId: string
}