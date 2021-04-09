import { initializeBatch } from "./batch_initialize"
import { IPluginVersion } from "../../models/utility/plugin_version"
import { isHigherVersion } from "../../utility/utility_functions"
import { Batch } from "./batch"
import { DBM } from "./db_manager"
import { version } from "../../utility/about"

export async function initialize() {
    let oldVersion = await DB.FindOne<IPluginVersion>({ collection: "bst.pluginVersion" })
    if ((oldVersion == null) || isHigherVersion(oldVersion.version, version)) {
        initializeBatch()
        await Batch.execute(version)
        await DBM.upsert<IPluginVersion>(null, { collection: "bst.pluginVersion" }, { collection: "bst.pluginVersion", version: version })
    }
}