import { IBatchResult } from "../../models/utility/batch"
import { IPluginVersion } from "../../models/utility/plugin_version"
import { isHigherVersion } from "../../utility/utility_functions"
import { DBM } from "./db_manager"

export namespace Batch {
    let registeredBatch = <{ id: string, version: string, batch: () => Promise<any> }[]>[]

    export async function execute(version: string): Promise<void> {
        for (let b of registeredBatch) {
            if ((await DB.Find<IBatchResult>({ collection: "bst.batchResult", batchId: b.id })).length == 0) if (!isHigherVersion(version, b.version)) {
                await b.batch()
                await DBM.insert<IBatchResult>(null, { collection: "bst.batchResult", batchId: b.id })
            }
        }
    }
    export function register(id: string, version: string, batch: () => Promise<any>) {
        registeredBatch.push({ id: id, version: version, batch: batch })
    }

}