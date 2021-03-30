import { BigIntProxy, boolme, KITEM2, KM, s32me, u64me } from "../../utility/mapping"

export interface IFloorInfectionEventParams {
    id: number
    musicList: number
    isCompleted: boolean
}
export const FloorInfectionEventParamsMap: KM<IFloorInfectionEventParams> = {
    id: s32me("infection_id", 20),
    musicList: s32me("music_list", 7),
    isCompleted: boolme("is_complete", true)
}

export interface IBst2EventParams {
    playerId: number
    startTime: bigint | BigIntProxy
    hasRbCollaboration: boolean
    hasPopnCollaboration: boolean
    floorInfection: { event: IFloorInfectionEventParams }
    museca: { isPlayedMuseca: boolean }
}
export const Bst2EventParamsMap: KM<IBst2EventParams> = {
    playerId: s32me("plyid"),
    startTime: u64me("start_time"),
    hasRbCollaboration: boolme("reflec_collabo", true),
    hasPopnCollaboration: boolme("pop_collabo", true),
    floorInfection: { event: FloorInfectionEventParamsMap, $targetKey: "floor_infection" },
    museca: { isPlayedMuseca: boolme("is_play_museca", true) },
}

export interface IBst2EventControl {
    type: number
    phase: number
}
export const Bst2EventControlMap: KM<IBst2EventControl> = {
    type: s32me(),
    phase: s32me()
}

let kEventControl: KITEM2<IBst2EventControl>[]
export function getKEventControl(): KITEM2<IBst2EventControl>[] {
    if (kEventControl == null) {
        kEventControl = []
        for (let i = 0; i <= 40; i++) for (let j = 0; j <= 25; j++)  kEventControl.push(<any>{ type: K.ITEM("s32", i), phase: K.ITEM("s32", j) })
    }
    return kEventControl
}