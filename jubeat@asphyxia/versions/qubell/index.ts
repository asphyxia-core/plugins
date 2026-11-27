import { GameVersion, VersionInfo } from "../types";
import * as common from "../../handlers/common";
import * as lobby from "../../handlers/lobby";
import { info as globalInfo } from "./info";
import * as profile from "./profile";

const version: VersionInfo = {
  id: 8, name: "Qubell", from: 2016033000, until: 2017062600, maxMusicId: 89999999,
};

/** Qubell's route table. Clan answers with the same handlers under its own version. */
export const qubellRoutes = (version: VersionInfo): GameVersion["routes"] => ({
  "shopinfo.regist": (info, data, send) => send.object({
    data: {
      cabid: K.ITEM("u32", 1),
      locationid: K.ITEM("str", $(data).str("data.shop.locationid", "nowhere") || "nowhere"),
      tax_phase: K.ITEM("u8", 1),
      facility: { exist: K.ITEM("u32", 1) },
      info: globalInfo(),
    },
  }, { compress: true }),
  "gametop.get_info": (info, data, send) => send.object({ data: { info: globalInfo() } }, { compress: true }),

  // Profile
  "gametop.regist": profile.regist(version),
  "gametop.get_pdata": profile.getPdata(version),
  "gameend.regist": profile.gameendRegist(version),
  "gameend.final": profile.gameendFinal(version),

  // Scores
  "gametop.get_mdata": profile.getMdata(version),

  // Matching
  "gametop.get_meeting": common.meeting,
  "lobby.check": common.lobbyCheck,
  "lobby.entry": lobby.Entry,
  "lobby.refresh": lobby.Refresh,
  "lobby.report": lobby.Report,

  // Attract
  "demodata.get_news": common.news,
  "demodata.get_hitchart": common.hitchart(version),
  "recommend.get_recommend": (info, data, send) =>
    send.object({ data: { player: { music_list: {} } } }, { compress: true }),

  "netlog.send": true,
  "logger.report": true,
});

export const Qubell: GameVersion = { ...version, routes: qubellRoutes(version) };
