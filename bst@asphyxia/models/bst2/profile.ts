import { BigIntProxy, boolme, colme, ignoreme, KM, s16me, s32me, s8me, strme, u16me, u64me, u8me } from "../../utility/mapping"
import { FixedSizeArray } from "../../utility/type"
import { ICollection } from "../utility/definitions"

export interface IBst2Account extends ICollection<"bst.bst2.player.account"> {
    userId: number
    isTakeOver: number
    playerId: number
    continueCount: number
    playCount: number
    playCountToday: number
    crd: number
    brd: number
    dayCount: number
    refid: string
    lobbyId: string
    mode: number
    version: number
    pp: boolean
    ps: boolean
    pay: number
    payedPlayCount: number
    standardTime: bigint | BigIntProxy
    intrvld?: number
    previousStartTime?: bigint | BigIntProxy
    ea?: boolean
}
export const Bst2AccountMap: KM<IBst2Account> = {
    collection: colme<IBst2Account>("bst.bst2.player.account"),
    userId: s32me("usrid"),//
    isTakeOver: s32me("is_takeover"),//
    playerId: s32me("plyid"),
    continueCount: s32me("continue_cnt"),
    playCount: s32me("tpc"),//
    playCountToday: s32me("dpc"),//
    crd: s32me(),//
    brd: s32me(),//
    dayCount: s32me("tdc"),//
    refid: strme("rid"),
    lobbyId: strme("lid", "Asphyxia"),
    mode: u8me(null, 2),
    version: s16me("ver"),//
    pp: boolme(),
    ps: boolme(),
    pay: s16me(),
    payedPlayCount: s16me("pay_pc"),
    standardTime: u64me("st", BigInt(Date.now())),//
    intrvld: s32me(),//
    previousStartTime: u64me("pst"),//
    ea: boolme()//
}

export interface IBst2Base extends ICollection<"bst.bst2.player.base"> {
    name: string
    brnk: number
    bcnum: number
    lcnum: number
    volt: number
    gold: number
    lastMusicId: number
    lastChart: number
    lastSort: number
    lastTab: number
    splv: number
    preference: number
    lcid: number
    hat: number
}
export const Bst2BaseMap: KM<IBst2Base> = {
    collection: colme<IBst2Base>("bst.bst2.player.base"),
    name: strme(),
    brnk: s8me(),
    bcnum: s8me(),
    lcnum: s8me(),
    volt: s32me(),
    gold: s32me(),
    lastMusicId: s32me("lmid"),
    lastChart: s8me("lgrd"),
    lastSort: s8me("lsrt"),
    lastTab: s8me("ltab"),
    splv: s8me(),
    preference: s8me("pref"),
    lcid: s32me(),
    hat: s32me()
}

export interface IBst2Survey extends ICollection<"bst.bst2.player.survey"> {
    motivate: number
}
export const Bst2SurveyMap: KM<IBst2Survey> = {
    collection: colme<IBst2Survey>("bst.bst2.player.survey"),
    motivate: s8me()
}

export interface IBst2UnlockingInfo extends ICollection<"bst.bst2.player.unlockingInfo"> {
    type: number
    id: number
    param: number
    count: number
}
export const Bst2UnlockingInfoMap: KM<IBst2UnlockingInfo> = {
    collection: colme<IBst2UnlockingInfo>("bst.bst2.player.unlockingInfo"),
    type: s32me(),
    id: s32me(),
    param: s32me(),
    count: s32me()
}

export interface IBst2Customization extends ICollection<"bst.bst2.player.customization"> {
    custom: FixedSizeArray<number, 16>
}
export const Bst2CustomizationMap: KM<IBst2Customization> = {
    collection: colme<IBst2Customization>("bst.bst2.player.customization"),
    custom: u16me(null, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
}

export interface IBst2Tips extends ICollection<"bst.bst2.player.tips"> {
    lastTips: number
}
export const Bst2TipsMap: KM<IBst2Tips> = {
    collection: colme<IBst2Tips>("bst.bst2.player.tips"),
    lastTips: s32me("last_tips")
}

export interface IBst2Hacker extends ICollection<"bst.bst2.player.hacker"> {
    id: number
    state0: number
    state1: number
    state2: number
    state3: number
    state4: number
    updateTime: bigint | BigIntProxy
}
export const Bst2HackerMap: KM<IBst2Hacker> = {
    collection: colme<IBst2Hacker>("bst.bst2.player.hacker"),
    id: s32me(),
    state0: s8me(),
    state1: s8me(),
    state2: s8me(),
    state3: s8me(),
    state4: s8me(),
    updateTime: u64me("update_time")
}

export interface IBst2CrysisLog extends ICollection<"bst.bst2.player.event.crysis"> {
    id: number
    stageId: number
    step: number
    gauge: number
    state: number
}
export const Bst2CrysisLogMap: KM<IBst2CrysisLog> = {
    collection: colme<IBst2CrysisLog>("bst.bst2.player.event.crysis"),
    id: s32me(),
    stageId: s32me("stage_no"),
    step: s8me(),
    gauge: s32me("r_gauge"),
    state: s8me("r_state")
}

export interface IBst2Bisco extends ICollection<"bst.bst2.player.bisco"> {
    bnum: number
    jbox: number
}
export const Bst2BiscoMap: KM<IBst2Bisco> = {
    collection: colme<IBst2Bisco>("bst.bst2.player.bisco"),
    bnum: s32me(),
    jbox: s32me(),
}

export interface IBst2MusicRecord extends ICollection<"bst.bst2.playData.musicRecord#userId"> {
    musicId: number
    chart: number
    playCount: number
    clearCount: number
    gaugeTimes10: number
    score: number
    grade: number
    medal: number
    combo: number
    userId: number
    updateTime: number
    lastPlayTime: number
}
export const Bst2MusicRecordMap: KM<IBst2MusicRecord> = {
    collection: colme<IBst2MusicRecord>("bst.bst2.playData.musicRecord#userId"),
    musicId: s32me("music_id"),
    chart: s32me("note_level"),
    playCount: s32me("play_count"),
    clearCount: s32me("clear_count"),
    gaugeTimes10: s32me("best_gauge"),
    score: s32me("best_score"),
    grade: s32me("best_grade"),
    medal: s32me("best_medal"),
    combo: ignoreme(),
    userId: ignoreme(),
    updateTime: ignoreme(),
    lastPlayTime: ignoreme()
}

export interface IBst2Course extends ICollection<"bst.bst2.playData.course#userId"> {
    courseId: number
    playCount: number
    isTouched: boolean
    clearType: number
    gauge: number
    score: number
    grade: number
    medal: number
    combo: number
    userId: number
    updateTime: number
    lastPlayTime: number
}
export const Bst2CourseMap: KM<IBst2Course> = {
    collection: colme<IBst2Course>("bst.bst2.playData.course#userId"),
    courseId: s32me("course_id"),
    playCount: s32me("play"),
    isTouched: boolme("is_touch"),
    clearType: s32me("clear"),
    gauge: s32me("gauge"),
    score: s32me(),
    grade: s32me(),
    medal: s32me(),
    combo: s32me(),
    userId: ignoreme(),
    updateTime: ignoreme(),
    lastPlayTime: ignoreme()
}

export interface IBst2Player {
    pdata: {
        account: IBst2Account
        base: IBst2Base
        opened: {}
        survey: IBst2Survey
        item: { info?: IBst2UnlockingInfo[] }
        customize: IBst2Customization
        tips: IBst2Tips
        hacker: { info?: IBst2Hacker[] }
        playLog: { crysis?: IBst2CrysisLog[] }
        bisco: { pinfo: IBst2Bisco }
        record: { rec?: IBst2MusicRecord[] }
        course: { record?: IBst2Course[] }
    }
}
export const Bst2PlayerMap: KM<IBst2Player> = {
    pdata: {
        account: Bst2AccountMap,
        base: Bst2BaseMap,
        opened: {},
        survey: Bst2SurveyMap,
        item: { info: { 0: Bst2UnlockingInfoMap } },
        customize: Bst2CustomizationMap,
        tips: Bst2TipsMap,
        hacker: { info: { 0: Bst2HackerMap } },
        playLog: { crysis: { 0: Bst2CrysisLogMap }, $targetKey: "play_log" },
        bisco: { pinfo: Bst2BiscoMap },
        record: { rec: { 0: Bst2MusicRecordMap } },
        course: { record: { 0: Bst2CourseMap } }
    }
}