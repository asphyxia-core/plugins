import { ICollection } from "../../models/utility/definitions"
import { log } from "../../utility/utility_functions"

export namespace DBM {
    export interface IDBCollectionName extends ICollection<"dbManager.collectionName"> {
        name: string
    }
    export interface IDBOperation<T = any, TOperation extends "insert" | "update" | "upsert" | "remove" | "skip" = "insert" | "update" | "upsert" | "remove" | "skip"> {
        refid?: string
        query: TOperation extends "insert" ? null : Query<T>
        operation: TOperation
        doc: TOperation extends "remove" ? null : T | Doc<T>
        isPublicDoc?: boolean
    }
    export class DBOperationManager {
        public operations: IDBOperation[] = []

        public push(...op: IDBOperation[]): void {
            this.operations.push(...op)
        }
        public update<T extends ICollection<any>>(refid: string | null, query: Query<T>, data: Doc<T>, isPublicDoc: boolean = true): void {
            for (let o of this.operations) if (o.doc && DBOperationManager.isMatch(o.doc, query)) o.operation = "skip"
            this.operations.push({ refid: refid, query: query, operation: "update", doc: data, isPublicDoc: isPublicDoc })
        }
        public upsert<T extends ICollection<any>>(refid: string | null, query: Query<T>, data: Doc<T>, isPublicDoc: boolean = true): void {
            for (let o of this.operations) if (o.doc && DBOperationManager.isMatch(o.doc, query)) o.operation = "skip"
            this.operations.push({ refid: refid, query: query, operation: "upsert", doc: data, isPublicDoc: isPublicDoc })
        }
        public insert<T extends ICollection<any>>(refid: string | null, data: Doc<T>, isPublicDoc: boolean = true): void {
            this.operations.push({ refid: refid, operation: "insert", query: null, doc: data, isPublicDoc: isPublicDoc })
        }
        public remove<T extends ICollection<any>>(refid: string | null, query: Query<T>, isPublicDoc: boolean = true): void {
            for (let o of this.operations) if (o.doc && DBOperationManager.isMatch(o.doc, query)) o.operation = "skip"
            this.operations.push({ refid: refid, query: query, operation: "remove", doc: null, isPublicDoc: isPublicDoc })
        }
        public async findOne<T extends ICollection<any>>(refid: string | null, query: Query<T>, isPublicDoc: boolean = true): Promise<T | Doc<T>> {
            for (let i = this.operations.length - 1; i >= 0; i--) {
                let o = this.operations[i]
                if (o.doc == null) continue
                if (DBOperationManager.isMatch(o.doc, query) && ((o.refid && refid) ? (o.refid == refid) : true)) return o.doc
            }
            return ((refid == null) && isPublicDoc) ? await DB.FindOne<T>(query) : await DB.FindOne<T>(refid, query)
        }
        public async find<T extends ICollection<any>>(refid: string | null, query: Query<T>, isPublicDoc: boolean = true): Promise<(T | Doc<T>)[]> {
            let result: (T | Doc<T>)[] = []
            for (let o of this.operations) {
                if (o.doc == null) continue
                if (DBOperationManager.isMatch(o.doc, query) && ((o.refid && refid) ? (o.refid == refid) : true)) result.push(o.doc)
            }
            return result.concat(await (((refid == null) && isPublicDoc) ? DB.Find<T>(query) : DB.Find<T>(refid, query)))
        }
        private static isMatch<T>(entry: T | Doc<T>, query: Query<T>): boolean {
            if (entry == null) return query == null
            if (query.$where && !query.$where.apply(entry)) return false
            let $orResult = null
            let skipKeys = ["$where", "_id"]
            for (let qk in query) {
                if (skipKeys.includes(qk)) continue
                switch (qk) {
                    case "$or": {
                        if ($orResult == null) $orResult = false
                        for (let or of query.$or) if (this.isMatch(entry, or)) $orResult = true
                        break
                    }
                    case "$and": {
                        for (let and of query.$and) if (!this.isMatch(entry, and)) return false
                        break
                    }
                    case "$not": {
                        if (this.isMatch(entry, query.$not)) return false
                        break
                    }
                    default: {
                        let value = entry[qk]
                        let q = query[qk]
                        if (value == q) continue
                        if ((typeof q != "object") && (typeof q != "function")) return false
                        if ((q.$exists != null)) if ((q.$exists && (value == null)) || (!q.$exists && (value != null))) return false
                        if (Array.isArray(value)) {
                            if (q.$elemMatch && !this.isMatch(value, q.$elemMatch)) return false
                            if (q.$size && (value.length != q.$size)) return false
                            continue
                        } else if ((typeof value == "number") || (typeof value == "string")) {
                            if (q.$lt) if (value >= q.$lt) return false
                            if (q.$lte) if (value > q.$lte) return false
                            if (q.$gt) if (value <= q.$gt) return false
                            if (q.$gte) if (value < q.$gte) return false
                            if (q.$in) if (!value.toString().includes(q.$in)) return false
                            if (q.$nin) if (value.toString().includes(q.$nin)) return false
                            if (q.$ne) if (value == q.$ne) return false
                            if (q.$regex) if (value.toString().match(q.$regex).length == 0) return false
                            continue
                        } else if (typeof value == "object") {
                            if (!this.isMatch(value, q)) return false
                            continue
                        } else if (q != null) return false
                    }
                }
            }
            return ($orResult == null) || $orResult
        }
    }
    export async function getCollectionNames(filter?: string): Promise<IDBCollectionName[]> {
        let result = await DB.Find<IDBCollectionName>({ collection: "dbManager.collectionName" })
        if (filter != null) {
            let filters = filter.split(",")
            for (let i = 0; i < filter.length; i++) filters[i] = filters[i].trim()
            let i = 0
            while (i < result.length) {
                let removeFlag = false
                for (let f of filters) if (f.startsWith("!") ? !result[i].name.includes(f) : result[i].name.includes(f)) {
                    result.splice(i, 1)
                    removeFlag = true
                    break
                }
                if (!removeFlag) i++
            }
        }

        return result
    }

    async function checkData<T extends ICollection<any>>(data: T): Promise<void> {
        for (let k in data) if (k.startsWith("__")) delete data[k]
        if (await DB.FindOne<IDBCollectionName>({ collection: "dbManager.collectionName", name: data.collection }) == null) {
            await DB.Insert<IDBCollectionName>({ collection: "dbManager.collectionName", name: data.collection })
        }
    }
    export async function update<T extends ICollection<any>>(refid: string | null, query: Query<T>, data: Doc<T>, isPublicDoc: boolean = true) {
        checkData(data)
        if (refid == null) return isPublicDoc ? await DB.Update(query, data) : await DB.Update(null, query, data)
        else return await DB.Update(refid, query, data)
    }
    export async function upsert<T extends ICollection<any>>(refid: string | null, query: Query<T>, data: Doc<T>, isPublicDoc: boolean = true) {
        checkData(data)
        if (refid == null) return isPublicDoc ? await DB.Upsert(query, data) : await DB.Upsert(null, query, data)
        else return await DB.Upsert(refid, query, data)
    }
    export async function insert<T extends ICollection<any>>(refid: string | null, data: Doc<T>, isPublicDoc: boolean = true) {
        checkData(data)
        if (refid == null) return isPublicDoc ? await DB.Insert(data) : await DB.Insert(null, data)
        else return await DB.Insert(refid, data)
    }
    export async function remove<T extends ICollection<any>>(refid: string | null, query: Query<T>, isPublicDoc: boolean = true) {
        if (refid == null) return isPublicDoc ? await DB.Remove(query) : await DB.Remove(null, query)
        else return await DB.Remove(refid, query)
    }

    export async function operate(operations: DBOperationManager) {
        let result = []
        for (let o of operations.operations) {
            if (o.operation == "skip") continue
            if (o.doc) delete o.doc._id
            try {
                switch (o.operation) {
                    case "insert":
                        result.push(await insert(o.refid, o.doc, o.isPublicDoc))
                        break
                    case "update":
                        result.push(await update(o.refid, o.query, o.doc, o.isPublicDoc))
                        break
                    case "upsert":
                        result.push(await upsert(o.refid, o.query, o.doc, o.isPublicDoc))
                        break
                    case "remove":
                        result.push(await remove(o.refid, o.query, o.isPublicDoc))
                        break
                }
            } catch (e) {
                await log(new Date().toLocaleString() + " Error: " + (e as Error).message)
            }
        }
        return result
    }

    export async function removeAllData(refid?: string, filter?: string) {
        for (let c of await getCollectionNames(filter)) remove(refid, { collection: c.name })

        if ((refid == null) && (filter == null)) remove(null, { collection: "dbManager.collectionName" })
    }
    export async function overall(refid: string, userId: number, filter: string, operation: "delete" | "export" | "override", data?: any) {
        if (refid == null) return
        try {
            let collections = await DBM.getCollectionNames(filter)
            let traverse = async (f: (rid: string | null, query: Query<ICollection<any>>) => Promise<any>) => {
                let result = []
                for (let c of collections) {
                    if (c.name.includes("#userId") && (userId != null)) result.concat(...await f(null, { collection: c.name, userId: userId }))
                    else result.concat(...await f(refid, { collection: c.name }))
                }
                return result
            }
            switch (operation) {
                case "delete":
                    await traverse((rid, query) => DBM.remove(rid, query))
                    break
                case "export":
                    let result = await traverse((rid, query) => DB.Find(rid, query))
                    return JSON.stringify(result)
                case "override":
                    if (!Array.isArray(data)) return "The data may not be an Asphyxia CORE savedata."
                    await traverse((rid, query) => DBM.remove(rid, query))
                    for (let d of data) if ((typeof (d?.collection) == "string") && (!d.collection.includes(filter))) DB.Insert(d)
                    break
            }
        } catch (e) {
            return e.message
        }
        return null

    }
}