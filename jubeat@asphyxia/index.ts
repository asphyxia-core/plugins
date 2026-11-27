import ShopInfo from "./routes/shopinfo";
import {getProfile, Getinfo, loadScore, Meeting} from "./routes/gametop";
import {saveProfile} from "./routes/gameend";
import {Check, Entry, Refresh, Report} from "./routes/lobby";
import * as Q from "./qubell/qubell";
import * as P from "./prop/prop";

// Version split: the original handlers target festo (2018-09 onward). prop builds
// (2015022000 - 2016032999) are answered by ./prop, other older builds (Qubell / clan) by the
// Qubell handlers in ./qubell. The model string looks like "L44:J:B:A:2017062001".
const modelDate = (info: EamuseInfo): number => parseInt((info.model || "").split(":")[4]);
const isProp = (info: EamuseInfo): boolean => {
  const date = modelDate(info);
  return !isNaN(date) && date >= 2015022000 && date < 2016033000;
};
const isPreFesto = (info: EamuseInfo): boolean => {
  const date = modelDate(info);
  return !isNaN(date) && date < 2018090000;
};

// Never let a handler exception surface as an HTTP error: log it and deny instead.
const guard = (name: string, fn: EamusePluginRoute): EamusePluginRoute =>
  async (info, data, send) => {
    try {
      return await fn(info, data, send);
    } catch (e) {
      console.error(`[jubeat] ${name} failed: ${e && e.stack ? e.stack : e}`);
      return send.deny();
    }
  };

type Handler = EamusePluginRoute | boolean;
const run = (h: Handler, info: EamuseInfo, data: any, send: EamuseSend) => {
  if (h === true) return send.success();
  if (h === false) return send.deny();
  return guard(`${info.module}.${info.method}`, h as EamusePluginRoute)(info, data, send);
};

const split = (prop: Handler, qubell: Handler, festo: Handler): EamusePluginRoute =>
  (info, data, send) => {
    if (isProp(info)) return run(prop, info, data, send);
    if (isPreFesto(info)) return run(qubell, info, data, send);
    if (festo === true || festo === false) return run(festo, info, data, send);
    return (festo as EamusePluginRoute)(info, data, send);
  };

export async function register() {
    if (CORE_VERSION_MAJOR <= 1 && CORE_VERSION_MINOR < 31) {
      console.error("The current version of Asphyxia Core is not supported. Requires version '1.31' or later.");
      return;
    }
    R.GameCode("L44");
    R.Contributor("yuanqiuye", "https://github.com/yuanqiuye")

    R.Route("gametop.regist", split(P.gametopRegist, Q.gametopRegist, getProfile));
    R.Route("gametop.get_info", split(P.gametopGetInfo, Q.gametopGetInfo, Getinfo));
    R.Route("gametop.get_pdata", split(P.gametopGetPdata, Q.gametopGetPdata, getProfile));
    R.Route("gametop.get_mdata", split(P.gametopGetMdata, Q.gametopGetMdata, loadScore));
    R.Route("gametop.get_meeting", split(P.gametopGetMeeting, Q.gametopGetMeeting, Meeting));
    R.Route("gametop.get_course", split(P.gametopGetCourse, true, true));
    R.Route("gametop.get_league", split(P.gametopGetLeague, true, true));

    R.Route("gameend.final", split(true, Q.gameendFinal, true));
    R.Route("gameend.regist", split(P.gameendRegist, Q.gameendRegist, saveProfile));

    R.Route("shopinfo.regist", split(P.shopinfoRegist, Q.shopinfoRegist, ShopInfo));
    R.Route("lobby.check", split(P.lobbyCheck, Q.lobbyCheck, Check));
    R.Route("lobby.entry", Entry);
    R.Route("lobby.refresh", Refresh);
    R.Route("lobby.report", Report);

    R.Route("demodata.get_news", split(P.demodataGetNews, Q.demodataGetNews, true));
    R.Route("demodata.get_hitchart", split(P.demodataGetHitchart, Q.demodataGetHitchart, true));
    R.Route("recommend.get_recommend", split(true, Q.recommendGetRecommend, true));

    R.Route("netlog.send", true);
    R.Route("logger.report", true);
    R.Unhandled();
  }
