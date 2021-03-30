import { Bst2EventParamsMap, getKEventControl } from "../../models/bst2/event_params"
import { Bst2AccountMap, Bst2BiscoMap, Bst2CourseMap, Bst2MusicRecordMap, Bst2PlayerMap, Bst2SurveyMap, Bst2TipsMap, Bst2UnlockingInfoMap, IBst2Account, IBst2Base, IBst2Bisco, IBst2Course, IBst2CrysisLog, IBst2Customization, IBst2Hacker, IBst2MusicRecord, IBst2Player, IBst2Survey, IBst2Tips, IBst2UnlockingInfo } from "../../models/bst2/profile"
import { Bst2CourseLogMap, Bst2StageLogMap, IBst2StageLog } from "../../models/bst2/stagelog"
import { bacK, BigIntProxy, boolme, fromMap, mapK, s16me, s32me, s8me, strme, toBigInt } from "../../utility/mapping"
import { isToday } from "../../utility/utility_functions"
import { DBM } from "../utility/db_manager"
import { readPlayerPostProcess, writePlayerPreProcess } from "./processing"

export namespace Bst2HandlersCommon {
    export const Common: EPR = async (_0, _1, send) => await send.object({ event_ctrl: { data: getKEventControl() } })

    export const BootPcb: EPR = async (_0, _1, send) => await send.object({ sinfo: { nm: K.ITEM("str", "Asphyxia"), cl_enbl: K.ITEM("bool", 1), cl_h: K.ITEM("u8", 0), cl_m: K.ITEM("u8", 0) } })

    export const StartPlayer: EPR = async (_, data, send) => {
        let params = fromMap(Bst2EventParamsMap)
        let rid = $(data).str("rid")
        let account = DB.FindOne<IBst2Account>(rid, { collection: "bst.bst2.player.account" })
        if (account == null) params.playerId = -1
        params.startTime = BigInt(Date.now())
        send.object(mapK(params, Bst2EventParamsMap))
    }

    export const PlayerSucceeded: EPR = async (_, data, send) => {
        let rid = $(data).str("rid")
        let account: IBst2Account = await DB.FindOne<IBst2Account>(rid, { collection: "bst.bst2.player.account" })
        let result
        if (account == null) {
            result = {
                play: false,
                data: { name: "" },
                record: {},
                hacker: {},
                phantom: {}
            }
        } else {
            let base: IBst2Base = await DB.FindOne<IBst2Base>(rid, { collection: "bst.bst2.player.base" })
            let records: IBst2MusicRecord[] = await DB.Find<IBst2MusicRecord>({ collection: "bst.bst2.playData.musicRecord#userId", userId: account.userId })
            result = {
                play: true,
                data: { name: base.name },
                record: {},
                hacker: {},
                phantom: {}
            }
        }
        send.object(mapK(result, {
            play: boolme(),
            data: { name: strme() },
            record: {},
            hacker: {},
            phantom: {}
        }))
    }

    export const ReadPlayer: EPR = async (_, data, send) => {
        let refid = $(data).str("rid")
        let account = await DB.FindOne<IBst2Account>(refid, { collection: "bst.bst2.player.account" })
        if (account == null) return await send.deny()

        let base = await DB.FindOne<IBst2Base>(refid, { collection: "bst.bst2.player.base" })
        let survey = await DB.FindOne<IBst2Survey>(refid, { collection: "bst.bst2.player.survey" }) || fromMap(Bst2SurveyMap)
        let unlocking = await DB.Find<IBst2UnlockingInfo>(refid, { collection: "bst.bst2.player.unlockingInfo" })
        let customize = await DB.FindOne<IBst2Customization>(refid, { collection: "bst.bst2.player.customization" })
        let tips = await DB.FindOne<IBst2Tips>(refid, { collection: "bst.bst2.player.tips" }) || fromMap(Bst2TipsMap)
        let hacker = await DB.Find<IBst2Hacker>(refid, { collection: "bst.bst2.player.hacker" })
        let crysis = await DB.Find<IBst2CrysisLog>(refid, { collection: "bst.bst2.player.event.crysis" })
        let bisco = await DB.FindOne<IBst2Bisco>(refid, { collection: "bst.bst2.player.bisco" }) || fromMap(Bst2BiscoMap)
        let records = await DB.Find<IBst2MusicRecord>({ collection: "bst.bst2.playData.musicRecord#userId", userId: account.userId })
        let courses = await DB.Find<IBst2Course>({ collection: "bst.bst2.playData.course#userId", userId: account.userId })

        account.previousStartTime = account.standardTime
        account.standardTime = BigInt(Date.now())
        account.ea = true
        account.intrvld = 0
        account.playCount++
        account.playCountToday++
        let eventPlayLog: { crysis?: IBst2CrysisLog[] } = {}
        if (crysis.length != 0) eventPlayLog.crysis = crysis

        let player: IBst2Player = {
            pdata: {
                account: account,
                base: base,
                survey: survey,
                opened: {},
                item: (unlocking.length == 0) ? {} : { info: unlocking },
                customize: customize,
                tips: tips,
                hacker: (hacker.length == 0) ? {} : { info: hacker },
                playLog: eventPlayLog,
                bisco: { pinfo: bisco },
                record: (records.length == 0) ? {} : { rec: records },
                course: (courses.length == 0) ? {} : { record: courses }
            }
        }
        send.object(readPlayerPostProcess(mapK(player, Bst2PlayerMap)))
    }

    export const WritePlayer: EPR = async (_, data, send) => {
        let player = bacK(writePlayerPreProcess(data), Bst2PlayerMap).data
        let refid = player.pdata.account.refid
        let userId = player.pdata.account.userId
        let now = BigIntProxy(BigInt(Date.now()))

        let opm = new DBM.DBOperationManager()

        let oldAccount = await DB.FindOne<IBst2Account>(refid, { collection: "bst.bst2.player.account" })
        if (!oldAccount) {
            do {
                userId = Math.round(Math.random() * 99999999)
            } while ((await DB.Find<IBst2Account>(null, { collection: "bst.bst2.player.account", userId: userId })).length > 0)
            oldAccount = fromMap(Bst2AccountMap)
            oldAccount.userId = userId
        }
        oldAccount.playCount++
        if (!isToday(toBigInt(oldAccount.standardTime))) {
            oldAccount.dayCount++
            oldAccount.playCountToday = 1
        } else oldAccount.playCountToday++
        oldAccount.standardTime = BigIntProxy(BigInt(Date.now()))
        opm.upsert<IBst2Account>(refid, { collection: "bst.bst2.player.account" }, oldAccount)
        if (player.pdata.base) opm.upsert<IBst2Base>(refid, { collection: "bst.bst2.player.base" }, player.pdata.base)
        if (player.pdata.item?.info?.length > 0) for (let u of player.pdata.item.info) opm.upsert<IBst2UnlockingInfo>(refid, { collection: "bst.bst2.player.unlockingInfo", type: u.type, id: u.id }, u)
        if (player.pdata.customize) opm.upsert<IBst2Customization>(refid, { collection: "bst.bst2.player.customization" }, player.pdata.customize)
        if (player.pdata.tips) opm.upsert<IBst2Base>(refid, { collection: "bst.bst2.player.base" }, player.pdata.base)
        if (player.pdata.hacker?.info?.length > 0) for (let h of player.pdata.hacker.info) {
            h.updateTime = now
            opm.upsert<IBst2Hacker>(refid, { collection: "bst.bst2.player.hacker", id: h.id }, h)
        }
        if (player.pdata.playLog?.crysis?.length > 0) for (let c of player.pdata.playLog.crysis) opm.upsert<IBst2CrysisLog>(refid, { collection: "bst.bst2.player.event.crysis", id: c.id, stageId: c.stageId }, c)

        await DBM.operate(opm)
        send.object({ uid: K.ITEM("s32", 0) })
    }

    export const WriteStageLog: EPR = async (_, data, send) => {
        await updateRecordFromStageLog(bacK(data, Bst2StageLogMap).data, false)
        send.success()
    }

    export const WriteCourseStageLog: EPR = async (_, data, send) => {
        await updateRecordFromStageLog(bacK(data, Bst2StageLogMap).data, true)
        send.success()
    }

    async function updateRecordFromStageLog(stageLog: IBst2StageLog, isCourseStage: boolean) {
        let query: Query<IBst2MusicRecord> = { collection: "bst.bst2.playData.musicRecord#userId", userId: stageLog.userId, musicId: stageLog.musicId, chart: stageLog.chart }
        let oldRecord = await DB.FindOne<IBst2MusicRecord>(query)

        let time = Date.now() / 1000
        stageLog.time = time
        stageLog.isCourseStage = isCourseStage

        if (oldRecord == null) {
            oldRecord = fromMap(Bst2MusicRecordMap)
            oldRecord.musicId = stageLog.musicId
            oldRecord.chart = stageLog.chart
            oldRecord.clearCount = (stageLog.medal >= 3) ? 1 : 0
            oldRecord.score = stageLog.score
            oldRecord.grade = stageLog.grade
            oldRecord.gaugeTimes10 = stageLog.gaugeTimes10
            oldRecord.playCount = 1
            oldRecord.medal = stageLog.medal
            oldRecord.combo = stageLog.combo
            oldRecord.lastPlayTime = time
            oldRecord.updateTime = time
            oldRecord.userId = stageLog.userId
        } else {
            if (stageLog.medal >= 3) oldRecord.clearCount++
            if (oldRecord.score < stageLog.score) {
                oldRecord.updateTime = time
                oldRecord.score = stageLog.score
            }
            if (oldRecord.grade < stageLog.grade) {
                oldRecord.updateTime = time
                oldRecord.grade = stageLog.grade
            }
            if (oldRecord.gaugeTimes10 < stageLog.gaugeTimes10) {
                oldRecord.updateTime = time
                oldRecord.gaugeTimes10 = stageLog.gaugeTimes10
            }
            if (oldRecord.medal < stageLog.medal) {
                oldRecord.updateTime = time
                oldRecord.medal = stageLog.medal
            }
            if (oldRecord.combo < stageLog.combo) {
                oldRecord.updateTime = time
                oldRecord.combo = stageLog.combo
            }
            oldRecord.lastPlayTime = time
            oldRecord.playCount++
        }
        DBM.upsert(null, query, oldRecord)
        DBM.insert(null, stageLog)
    }

    export const WriteCourseLog: EPR = async (_, data, send) => {
        let courseLog = bacK(data, Bst2CourseLogMap).data
        let query: Query<IBst2Course> = { collection: "bst.bst2.playData.course#userId", userId: courseLog.userId, courseId: courseLog.courseId }
        let oldRecord = await DB.FindOne<IBst2Course>(query)

        let time = Date.now() / 1000
        courseLog.time = time

        if (oldRecord == null) {
            oldRecord = fromMap(Bst2CourseMap)
            oldRecord.courseId = courseLog.courseId
            oldRecord.score = courseLog.score
            oldRecord.grade = courseLog.grade
            oldRecord.gauge = courseLog.gauge
            oldRecord.playCount = 1
            oldRecord.medal = courseLog.medal
            oldRecord.combo = courseLog.combo
            oldRecord.lastPlayTime = time
            oldRecord.updateTime = time
            oldRecord.userId = courseLog.userId
        } else {
            if (oldRecord.score < courseLog.score) {
                oldRecord.updateTime = time
                oldRecord.score = courseLog.score
            }
            if (oldRecord.grade < courseLog.grade) {
                oldRecord.updateTime = time
                oldRecord.grade = courseLog.grade
            }
            if (oldRecord.gauge < courseLog.gauge) {
                oldRecord.updateTime = time
                oldRecord.gauge = courseLog.gauge
            }
            if (oldRecord.medal < courseLog.medal) {
                oldRecord.updateTime = time
                oldRecord.medal = courseLog.medal
            }
            if (oldRecord.combo < courseLog.combo) {
                oldRecord.updateTime = time
                oldRecord.combo = courseLog.combo
            }
            oldRecord.lastPlayTime = time
            oldRecord.playCount++
        }
        DBM.upsert(null, query, oldRecord)
        DBM.insert(null, courseLog)

        send.success()
    }
}