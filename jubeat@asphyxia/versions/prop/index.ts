import { GameVersion, VersionInfo } from "../types";
import * as common from "../../handlers/common";
import * as lobby from "../../handlers/lobby";
import { info as globalInfo } from "./info";
import * as profile from "./profile";
import { getCourse } from "./course";
import { getLeague } from "./league";

const version: VersionInfo = {
  id: 7, name: "prop", from: 2015022000, until: 2016033000, maxMusicId: 79999999,
};

export const Prop: GameVersion = {
  ...version,
  routes: {
    "shopinfo.regist": (info, data, send) => send.object({
      data: {
        cabid: K.ITEM("u32", 1),
        locationid: K.ITEM("str", $(data).str("shop.locationid") || "nowhere"),
        tax_phase: K.ITEM("u8", 1),
        facility: { exist: K.ITEM("u32", 1) },
        info: globalInfo(),
      },
    }, { compress: true }),
    "gametop.get_info": (info, data, send) => send.object({ data: { info: globalInfo() } }, { compress: true }),

    // Profile
    "gametop.regist": profile.regist,
    "gametop.get_pdata": profile.getPdata,
    "gameend.regist": profile.gameendRegist,

    // Scores
    "gametop.get_mdata": profile.getMdata(version),

    // Course mode and league
    "gametop.get_course": getCourse,
    "gametop.get_league": getLeague,

    // Matching
    "gametop.get_meeting": common.meeting,
    "lobby.check": common.lobbyCheck,
    "lobby.entry": lobby.Entry,
    "lobby.refresh": lobby.Refresh,
    "lobby.report": lobby.Report,

    // Attract
    "demodata.get_news": common.news,
    "demodata.get_hitchart": common.hitchart(version),

    "netlog.send": true,
    "logger.report": true,

    // Referenced by jubeat.dll but not handled by bemaniutils either: acknowledged, nothing stored
    "gametop.get_event": true,
    "gametop.get_collabo": true,
    "gameend.set_event": true,
    "gameend.set_collabo": true,
  },
};
