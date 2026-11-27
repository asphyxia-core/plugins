import { GameVersion, VersionInfo } from "../types";
import * as lobby from "../../handlers/lobby";
import { getProfile, Getinfo, loadScore, Meeting } from "./load";
import { saveProfile } from "./save";
import { shopInfo } from "./shopinfo";

/** festo and later. Model strings without a date are answered as festo too. */
const version: VersionInfo = { id: 10, name: "festo", from: 2018090000, until: Infinity };

export const Festo: GameVersion = {
  ...version,
  routes: {
    "shopinfo.regist": shopInfo,
    "gametop.get_info": Getinfo,

    // Profile
    "gametop.regist": getProfile,
    "gametop.get_pdata": getProfile,
    "gameend.regist": saveProfile,
    "gameend.final": true,

    // Scores
    "gametop.get_mdata": loadScore,

    // Matching
    "gametop.get_meeting": Meeting,
    "lobby.check": lobby.Check,
    "lobby.entry": lobby.Entry,
    "lobby.refresh": lobby.Refresh,
    "lobby.report": lobby.Report,

    // Attract
    "demodata.get_news": true,
    "demodata.get_hitchart": true,
    "recommend.get_recommend": true,

    "netlog.send": true,
    "logger.report": true,
  },
};
