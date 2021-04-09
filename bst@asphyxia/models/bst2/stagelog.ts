import { colme, ignoreme, KM, s32me, strme } from "../../utility/mapping"
import { ICollection } from "../utility/definitions"

export interface IBst2StageLog extends ICollection<"bst.bst2.playData.stageLog#userId"> {
    playerId: number
    continueCount: number
    stageId: number
    userId: number
    lobbyId: string
    musicId: number
    chart: number
    gaugeTimes10: number
    score: number
    combo: number
    grade: number
    medal: number
    fantasticCount: number
    greatCount: number
    fineCount: number
    missCount: number
    isCourseStage: boolean
    time: number
}
export const Bst2StageLogMap: KM<IBst2StageLog> = {
    collection: colme<IBst2StageLog>("bst.bst2.playData.stageLog#userId"),
    playerId: s32me("play_id"),
    continueCount: s32me("continue_count"),
    stageId: s32me("stage_no"),
    userId: s32me("user_id"),
    lobbyId: strme("location_id"),
    musicId: s32me("select_music_id"),
    chart: s32me("select_grade"),
    gaugeTimes10: s32me("result_clear_gauge"),
    score: s32me("result_score"),
    combo: s32me("result_max_combo"),
    grade: s32me("result_grade"),
    medal: s32me("result_medal"),
    fantasticCount: s32me("result_fanta"),
    greatCount: s32me("result_great"),
    fineCount: s32me("result_fine"),
    missCount: s32me("result_miss"),
    isCourseStage: ignoreme(),
    time: ignoreme(),
}

export interface IBst2CourseLog extends ICollection<"bst.bst2.playData.courseLog#userId"> {
    playerId: number
    continueCount: number
    userId: number
    courseId: number
    gauge: number
    score: number
    grade: number
    medal: number
    combo: number
    fantasticCount: number
    greatCount: number
    fineCount: number
    missCount: number
    lobbyId: string
    time: number
}
export const Bst2CourseLogMap: KM<IBst2CourseLog> = {
    collection: colme<IBst2CourseLog>("bst.bst2.playData.courseLog#userId"),
    playerId: s32me("play_id"),
    continueCount: s32me("continue_count"),
    userId: s32me("user_id"),
    courseId: s32me("course_id"),
    lobbyId: strme("lid"),
    gauge: s32me(),
    score: s32me(),
    combo: s32me(),
    grade: s32me(),
    medal: s32me(),
    fantasticCount: s32me("fanta"),
    greatCount: s32me("great"),
    fineCount: s32me("fine"),
    missCount: s32me("miss"),
    time: ignoreme()
}
