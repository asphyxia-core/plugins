import { ICollection } from "../models/utility/definitions"

export type KArrayType = KNumberType | KBigIntType
export type KGroupType = KNumberGroupType | KBigIntGroupType
export type KType = KArrayType | KGroupType | "str" | "bin" | "ip4" | "bool"
export type KTypeExtended = KType | null | "kignore"
export type TypeForKItem = number | string | bigint | BigIntProxy | boolean | Buffer | number[] | bigint[] | boolean[] | BufferArray | NumberGroup<number[] | bigint[]>
export type TypeForKObject<T> = T extends TypeForKItem ? never : T
export type TypeForKArray = number[] | bigint[] | BufferArray

export type KKey<T> = keyof T & (
    T extends string ? Exclude<keyof T, keyof string> :
    T extends Buffer ? Exclude<keyof T, keyof Buffer> :
    T extends boolean ? Exclude<keyof T, keyof boolean> :
    T extends number[] | bigint[] | boolean[] ? Exclude<keyof T, (keyof number[]) | (keyof bigint[]) | (keyof boolean[])> :
    T extends any[] ? Exclude<keyof T, keyof any[]> | number :
    T extends number ? Exclude<keyof T, keyof number> :
    T extends bigint | BigIntProxy ? Exclude<keyof T, keyof bigint> :
    T extends BufferArray ? Exclude<keyof T, keyof BufferArray> :
    T extends NumberGroup<infer TGroup> ? Exclude<keyof T, keyof NumberGroup<TGroup>> :
    keyof T)

export type KTypeConvert<T extends string | Buffer | number | bigint | boolean | number[] | bigint[] | unknown> =
    T extends string ? "str" :
    T extends Buffer ? "bin" :
    T extends number ? KNumberType | "ip4" | "bool" :
    T extends bigint | BigIntProxy ? KBigIntType :
    T extends boolean | boolean[] ? "bool" :
    T extends number[] ? KNumberType : // KARRAY 
    T extends bigint[] ? KBigIntType : // KARRAY 
    T extends NumberGroup<number[]> ? KNumberGroupType :
    T extends NumberGroup<bigint[]> ? KBigIntGroupType :
    T extends BufferArray ? "u8" | "s8" :
    never

export type KArrayTypeConvert<T extends Buffer | number[] | bigint[] | unknown> =
    T extends Buffer ? "s8" | "u8" :
    T extends number[] ? KNumberType :
    T extends bigint[] ? KBigIntType :
    never

export type KTypeConvertBack<TKType extends KTypeExtended> =
    TKType extends "str" ? string :
    TKType extends "bin" ? { type: "Buffer"; data: number[] } :
    TKType extends "s8" | "u8" ? [number] | number[] | { type: "Buffer"; data: number[] } :
    TKType extends KNumberType ? [number] | number[] :
    TKType extends KBigIntType ? [bigint] | bigint[] :
    TKType extends KNumberGroupType ? number[] :
    TKType extends KBigIntGroupType ? bigint[] :
    unknown

export type NumberGroup<T extends number[] | bigint[] = number[]> = {
    "@numberGroupValue": T
}
export const NumberGroup = <T extends number[] | bigint[] = number[]>(ng: T) => <NumberGroup>{ "@numberGroupValue": ng }
export function isNumberGroup(value: any): value is NumberGroup {
    try {
        return Array.isArray(BigInt(value["@numberGroupValue"]))
    } catch {
        return false
    }
}
export type BufferArray = {
    "@bufferArrayValue": Buffer
}
export const BufferArray = (ba: Buffer) => <BufferArray>{ "@bufferArrayValue": ba }
export function isBufferArray(value: any): value is BufferArray {
    try {
        return value["@bufferArrayValue"] instanceof Buffer
    } catch {
        return false
    }
}
export type BigIntProxy = {
    "@serializedBigInt": string
}
export const BigIntProxy = (value: bigint) => <BigIntProxy>{ "@serializedBigInt": value.toString() }
export function isBigIntProxy(value: any): value is BigIntProxy {
    try {
        return BigInt(value["@serializedBigInt"]).toString() == value["@serializedBigInt"]
    } catch {
        return false
    }
}
export function toBigInt(value: bigint | BigIntProxy): bigint {
    if (value == null) return null
    if (value instanceof BigInt) return <bigint>value
    else if (value["@serializedBigInt"] != null) return BigInt(value["@serializedBigInt"])
    else return BigInt(0)
}

export type KITEM2<T> = { [K in keyof T]?: K extends KKey<T> ? KITEM2<T[K]> : never } &
{
    ["@attr"]: KAttrMap2<T>
    ["@content"]:
    T extends string | Buffer | boolean | number[] | bigint[] ? T :
    T extends number | bigint ? [T] :
    T extends BufferArray ? Buffer :
    T extends NumberGroup<infer TGroup> ? TGroup :
    T extends BigIntProxy ? [bigint] : never
}

export type KAttrMap2<T> = { [key: string]: string } & {
    __type?: T extends TypeForKItem ? KTypeConvert<T> : never
    __count?: T extends TypeForKArray ? number : never
}

export function ITEM2<T>(ktype: KTypeConvert<T>, value: T, attr?: KAttrMap2<T>): KITEM2<T> {
    // let result
    // if (value instanceof NumberGroup && IsNumberGroupKType(ktype)) {
    //     result = K.ITEM(<KTypeConvert<T & NumberGroup>>ktype, value.value, attr)
    // } else if (Array.isArray(value) && IsNumericKType(ktype)) {
    //     result = K.ARRAY(<KTypeConvert<T & number[]>>ktype, <any>value, <any>attr)
    // } else if (value instanceof BufferArray && IsNumericKType(ktype)) {
    //     result = K.ARRAY(<KTypeConvert<T & BufferArray>>ktype, value.value, attr)
    // } else if (typeof value != "object" && typeof value != "function") {
    //     result = K.ITEM(<any>ktype, <any>value, attr)
    // } else {
    //     Object.assign(result, value, { ["@attr"]: attr })
    //     result["@attr"].__type = ktype
    // }

    // return <KITEM2<T>>result
    let result = <KITEM2<T>>{}
    result["@attr"] = Object.assign({}, attr, (!isNumberGroupKType(ktype) && isNumericKType(ktype) && Array.isArray(value)) ? { __type: ktype, __count: (<any[]>value).length } : { __type: ktype })

    if ((ktype == "bool") && (typeof value == "boolean")) {
        result["@content"] = <any>(value ? [1] : [0])
    } else if ((ktype == "bin") && value instanceof Buffer) {
        result = <any>K.ITEM("bin", value, result["@attr"])
    } else if (((ktype == "s8") || (ktype == "u8")) && isBufferArray(value)) {
        result["@content"] = <any>value["@bufferArrayValue"].toJSON()
        result["@attr"].__count = <any>value["@bufferArrayValue"].byteLength
    } else if (isNumericKType(ktype) && !Array.isArray(value)) {
        result["@content"] = <any>[value]
    } else if (isNumberGroupKType(ktype) && isNumberGroup(value)) {
        result["@content"] = <any>value["@numberGroupValue"]
    } else if (isBigIntProxy(value)) {
        result["@content"] = <any>BigInt(value["@serializedBigInt"])
    }
    else {
        result["@content"] = <any>value
    }
    if (isKIntType(ktype) && Array.isArray(result["@content"])) for (let i = 0; i < result["@content"].length; i++) (<number[]>result["@content"])[i] = Math.trunc(result["@content"][i])
    return result
}

export type KObjectMappingRecord<T> = { [K in KKey<T>]: T[K] extends TypeForKItem ? KObjectMappingElementInfer<T[K]> : KObjectMappingRecord<T[K]> } & KObjectMappingElementInfer<T>
export interface KObjectMappingElement<T = any, TKType extends KTypeExtended = KTypeExtended> {
    $type?: TKType,
    $targetKey?: string,
    $convert?: (source: T) => T
    $convertBack?: (target: T) => T
    $fallbackValue?: TKType extends "kignore" ? T : never
    $defaultValue?: T
}
type KObjectMappingElementInfer<T> = KObjectMappingElement<T, (KTypeConvert<T> extends KType ? KTypeConvert<T> : never) | never | "kignore">

export type KAttrRecord<T> = { [K in keyof T]?: T extends TypeForKItem ? KAttrMap2<T[K]> : KAttrRecord<T[K]> } & { selfAttr?: KAttrMap2<T> }

export function getCollectionMappingElement<TCollection extends ICollection<any>>(collectionName: TCollection extends ICollection<infer TName> ? TName : never): KObjectMappingElement<TCollection extends ICollection<infer TName> ? TName : unknown, "kignore"> {
    return ignoreme("collection", collectionName)
}

function isKType<TType>(type: TType): boolean {
    return (typeof (type) == "string") && ["s8", "u8", "s16", "u16", "s32", "u32", "time", "ip4", "float", "double", "bool", "s64", "u64", "2s8", "2u8", "2s16", "2u16", "2s32", "2u32", "2f", "2d", "3s8", "3u8", "3s16", "3u16", "3s32", "3u32", "3f", "3d", "4s8", "4u8", "4s16", "4u16", "4s32", "4u32", "4f", "4d", "2b", "3b", "4b", "vb", "2s64", "2u64", "3s64", "3u64", "4s64", "4u64", "vs8", "vu8", "vs16", "vu16", "str", "bin"].includes(type)
}
function isKIntType<TType>(type: TType): boolean {
    return (typeof (type) == "string") && ["s8", "u8", "s16", "u16", "s32", "u32", "2s8", "2u8", "2s16", "2u16", "2s32", "2u32", "3s8", "3u8", "3s16", "3u16", "3s32", "3u32", "4s8", "4u8", "4s16", "4u16", "4s32", "4u32", "2b", "3b", "4b", "vb", "vs8", "vu8", "vs16", "vu16"].includes(type)
}
function isKBigIntType<TType>(type: TType): boolean {
    return (typeof (type) == "string") && ["s64", "u64"].includes(type)
}
function isNumericKType<TType>(type: TType): boolean {
    return (typeof (type) == "string") && ["s8", "u8", "s16", "u16", "s32", "u32", "time", "ip4", "float", "double", "bool", "s64", "u64"].includes(type)
}
function isNumberGroupKType<TType>(type: TType): boolean {
    return (typeof (type) == "string") && ["2s8", "2u8", "2s16", "2u16", "2s32", "2u32", "2f", "2d", "3s8", "3u8", "3s16", "3u16", "3s32", "3u32", "3f", "3d", "4s8", "4u8", "4s16", "4u16", "4s32", "4u32", "4f", "4d", "2b", "3b", "4b", "vb", "2s64", "2u64", "3s64", "3u64", "4s64", "4u64", "vs8", "vu8", "vs16", "vu16"].includes(type)
}
function isNumericKey(k: any): boolean {
    return (typeof k == "number") || (parseInt(k).toString() == k)
}
function increaseNumericKey<T>(k: T, step: number = 1): T {
    return (typeof k == "number") ? <T><unknown>(k + step) : (typeof k == "string" && parseInt(k).toString() == k) ? <T><unknown>(parseInt(k) + step) : k
}
function isEmptyKObject(o: object): boolean {
    return (Object.keys(o).length == 0) || ((Object.keys(o).length == 1) && (o["@attr"] != null))
}
function isKMapRecordReservedKey(key: string): boolean {
    return ["$type", "$targetKey", "$convert", "$convertBack", "$fallbackValue", "$defaultValue"].includes(key)
}
function isKArray<T>(data: KITEM2<T>): boolean {
    return (data["@attr"] != null) && (data["@attr"].__count != null)
}

export function appendMappingElement<T>(map: KObjectMappingRecord<T>, element: KObjectMappingElementInfer<T>): KObjectMappingRecord<T> {
    let result = <KObjectMappingRecord<T>>{}
    Object.assign(result, map, element)
    return result
}

export function mapKObject<T>(data: T, kMapRecord: KObjectMappingRecord<T>, kAttrRecord: KAttrRecord<T> = <KAttrRecord<T>>{}): KITEM2<T> {
    if (data == null) return <KITEM2<T>>{}
    let result: KITEM2<T> = <any>(((0 in data) && data instanceof Object) ? [] : {})
    if (kAttrRecord.selfAttr != null) result["@attr"] = kAttrRecord.selfAttr

    if (data instanceof Object) {
        for (let __k in data) {
            let k: keyof T = __k
            let mapK: keyof T = __k
            let attrK: keyof T = __k
            if (!(k in kMapRecord) && isNumericKey(k)) {
                for (let i = parseInt(<string>k) - 1; i >= 0; i--) if (kMapRecord[i]) {
                    mapK = <keyof T>i
                    break
                }
            }
            if (!(k in kAttrRecord) && isNumericKey(k)) {
                for (let i = parseInt(<string>k) - 1; i >= 0; i--) if (kAttrRecord[i]) {
                    attrK = <keyof T>i
                    break
                }
            }
            if (mapK in kMapRecord) {
                let target = <KITEM2<T>[keyof T]>{}
                let targetMap = kMapRecord[<KKey<T>>mapK]
                let targetKey: keyof T = (targetMap.$targetKey != null) ? <keyof T>targetMap.$targetKey : k
                let targetValue = (targetMap.$convert != null) ? <KTypeConvertBack<KTypeConvert<T[keyof T]>>>targetMap.$convert(<any>data[k]) : data[k]
                let targetAttr = kAttrRecord[attrK]
                if (targetMap.$type) {
                    let tt = targetMap.$type
                    if (tt == "kignore") continue
                    target["@attr"] = <any>Object.assign({}, targetAttr, (!isNumberGroupKType(tt) && isNumericKType(tt) && Array.isArray(data[k]) && Array.isArray(targetValue)) ? { __type: tt, __count: (<any[]>targetValue).length } : { __type: tt })

                    if ((tt == "bool") && (typeof targetValue == "boolean")) {
                        target["@content"] = <any>(targetValue ? [1] : [0])
                    } else if ((tt == "bin") && targetValue instanceof Buffer) {
                        target = <any>K.ITEM("bin", targetValue, target["@attr"])
                    } else if (((tt == "s8") || (tt == "u8")) && isBufferArray(targetValue)) {
                        target["@content"] = <any>targetValue["@bufferArrayValue"]
                    } else if (isNumericKType(tt) && !Array.isArray(targetValue)) {
                        target["@content"] = <any>[targetValue]
                    } else if (isNumberGroupKType(tt) && isNumberGroup(targetValue)) {
                        target["@content"] = <any>targetValue["@numberGroupValue"]
                    } else if (isBufferArray(targetValue)) {
                        target["@content"] = <any>targetValue["@bufferArrayValue"].toJSON()
                        target["@attr"].__count = <any>targetValue["@bufferArrayValue"].byteLength
                    } else if (isBigIntProxy(targetValue)) {
                        target["@content"] = <any>BigInt(targetValue["@serializedBigInt"])
                    } else {
                        target["@content"] = <any>targetValue
                    }
                    if (isKIntType(tt) && Array.isArray(target["@content"])) for (let i = 0; i < target["@content"].length; i++) (<number[]>target["@content"])[i] = Math.trunc(target["@content"][i])
                } else {
                    target = <any>mapKObject(<T[keyof T]>targetValue, <KObjectMappingRecord<T[keyof T]>><unknown>targetMap, <KAttrRecord<T[keyof T]>>targetAttr)
                }
                result[targetKey] = target
            }
        }
    } else result = ITEM2<T>(<KTypeConvert<T>>kAttrRecord.selfAttr.$type, data, kAttrRecord.selfAttr)

    return result
}

export type MapBackResult<T> = {
    data: T,
    attr?: KAttrRecord<T>
}
export function mapBackKObject<T extends object>(data: KITEM2<T>, kMapRecord?: KObjectMappingRecord<T>): MapBackResult<T> {
    if (kMapRecord == null) {
        if (data["@content"] || data["@attr"]) return { data: <any>data["@content"], attr: <any>data["@attr"] }
        else return { data: <T>data }
    }
    let result: T = <T>((Array.isArray(data) || 0 in kMapRecord) ? [] : {})
    let resultAttr: KAttrRecord<T> = <any>{ selfAttr: data["@attr"] ? data["@attr"] : null }

    for (let __k in kMapRecord) {
        if (isKMapRecordReservedKey(__k)) continue
        let k = <keyof T>__k
        let preservK = <keyof T>__k
        do {
            let targetMap = kMapRecord[<KKey<T>>preservK]
            let targetKey = <keyof T>(targetMap.$targetKey ? targetMap.$targetKey : k)
            let doOnceFlag = (isNumericKey(targetKey) && (data[targetKey] == null) && !isEmptyKObject(data))
            let targetValue = <KITEM2<T>[keyof T]>(doOnceFlag ? data : data[targetKey])

            if (targetMap.$type == "kignore") {
                result[k] = targetMap.$fallbackValue
                if ((targetValue != null) && (targetValue["@attr"] != null)) resultAttr[k] = <KAttrRecord<T>[keyof T]>{ selfAttr: targetValue["@attr"] }
                continue
            }

            if (targetValue == null) {
                if (targetMap.$convertBack != null) result[k] = targetMap.$convertBack(<any>null)
                continue
            }

            if (targetValue["@attr"] != null) {
                let targetAttr: KAttrMap2<T[keyof T]> = targetValue["@attr"]
                let targetResult

                if (targetAttr.__type != null) { // KITEM
                    targetResult = targetValue["@content"]
                    if (isNumberGroupKType(targetAttr.__type)) { // KITEM2<NumberGroup>
                        // TODO: bigint number group
                        targetResult = NumberGroup(targetResult)
                    } else if (targetAttr.__type == "bin") { // KITEM<"bin">
                        targetResult = targetResult
                    } else if ((targetAttr.__type == "s8" || targetAttr.__type == "u8") && (targetResult?.type == "Buffer") && Array.isArray(targetResult?.data)) { // KITEM2<BufferArray>
                        targetResult = BufferArray(Buffer.from(<number[]>targetResult.data))
                    } else if (targetAttr.__type == "bool") { // KITEM<"bool">
                        targetResult = targetResult[0] == 1 ? true : false
                    } else if (Array.isArray(targetResult) && (targetAttr.__count == null) && isNumericKType(targetAttr.__type)) { // KITEM<KNumberType>
                        targetResult = ((targetAttr.__type == "s64") || (targetAttr.__type == "u64")) ? BigIntProxy(BigInt(targetResult[0])) : targetResult[0]
                    }
                    result[k] = (targetMap.$convertBack != null) ? targetMap.$convertBack(<any>targetResult) : targetResult
                } else { // KObject
                    targetResult = (targetMap.$convertBack != null) ? targetMap.$convertBack(<any>targetValue) : targetValue;
                    let partial = mapBackKObject<T[keyof T] & object>(targetResult, <any>targetMap)
                    result[k] = partial.data
                    resultAttr[k] = <any>partial.attr
                }
            } else { // KObject
                let targetResult = (targetMap.$convertBack != null) ? targetMap.$convertBack(<any>targetValue) : targetValue;
                let partial = <any>mapBackKObject<T[keyof T] & object>(<any>targetResult, <any>targetMap)
                result[k] = partial.data
                resultAttr[k] = <any>partial.attr
            }
            k = increaseNumericKey(k)
            if (doOnceFlag || (isNumericKey(k) && (data[<keyof T>(targetMap.$targetKey ? targetMap.$targetKey : k)] == null))) break
        } while (isNumericKey(k) && !(k in kMapRecord))
    }
    return { data: result, attr: resultAttr }
}

export function s8me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "s8"> {
    return {
        $type: "s8",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function u8me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "u8"> {
    return {
        $type: "u8",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function s16me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "s16"> {
    return {
        $type: "s16",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function u16me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "u16"> {
    return {
        $type: "u16",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function s32me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "s32"> {
    return {
        $type: "s32",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function u32me<T extends number | number[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "u32"> {
    return {
        $type: "u32",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function s64me(targetKey?: string, defaultValue?: bigint | BigIntProxy, convert?: (source: bigint | BigIntProxy) => bigint | BigIntProxy, convertBack?: (target: bigint | BigIntProxy) => bigint | BigIntProxy): KObjectMappingElement<bigint | BigIntProxy, "s64"> {
    return {
        $type: "s64",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function u64me(targetKey?: string, defaultValue?: bigint | BigIntProxy, convert?: (source: bigint | BigIntProxy) => bigint | BigIntProxy, convertBack?: (target: bigint | BigIntProxy) => bigint | BigIntProxy): KObjectMappingElement<bigint | BigIntProxy, "u64"> {
    return {
        $type: "u64",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}

export function boolme<T extends boolean | boolean[]>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, "bool"> {
    return {
        $type: "bool",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export function strme<TName extends string>(targetKey?: string, defaultValue?: TName, convert?: (source: TName) => TName, convertBack?: (target: TName) => TName): KObjectMappingElement<TName, "str"> {
    return {
        $type: "str",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}

export function binme(targetKey?: string, defaultValue?: Buffer, convert?: (source: Buffer) => Buffer, convertBack?: (target: Buffer) => Buffer): KObjectMappingElement<Buffer, "bin"> {
    return {
        $type: "bin",
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}

export function ignoreme<T = any>(targetKey?: string, fallbackValue?: T): KObjectMappingElement<T, "kignore"> {
    return {
        $type: "kignore",
        $fallbackValue: fallbackValue
    }
}
export function me<T extends object>(targetKey?: string, defaultValue?: T, convert?: (source: T) => T, convertBack?: (target: T) => T): KObjectMappingElement<T, null> {
    return {
        $targetKey: targetKey,
        $convert: convert,
        $convertBack: convertBack,
        $defaultValue: defaultValue
    }
}
export const colme = getCollectionMappingElement
export const appendme = appendMappingElement
export const mapK = mapKObject
export const bacK = mapBackKObject

export function fromMap<T>(map: KObjectMappingRecord<T>): T {
    let result = <T>{}
    if (map.$type == "kignore") return map.$fallbackValue
    if (map.$defaultValue != null) return map.$defaultValue
    if (map.$type != null) {
        if (isNumericKType(map.$type)) {
            if (map.$type == "bool") return <any>false
            else return <any>0
        } else if (isKBigIntType(map.$type)) return <any>BigInt(0)
        else if (isNumberGroupKType(map.$type)) return <any>NumberGroup([0])
        else if (map.$type == "str") return <any>""

        else return null
    }
    for (let k in map) {
        if (isKMapRecordReservedKey(k)) continue
        let value = fromMap(map[k])
        if (value != null) result[k] = value
    }

    return result
}

export type KM<T> = KObjectMappingRecord<T>