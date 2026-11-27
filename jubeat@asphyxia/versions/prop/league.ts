declare const BigInt: any; // CORE typecheck targets es2017
// prop's weekly league: three songs a week; the top 30% of a week's players move up a class,
// the bottom 30% move down, and players who stay away drop one class every two weeks.
// bemaniutils runs this from a weekly job; here it is applied when a player next logs in.

import { VersionLeague } from "../../models/version_data";
import { playerByJid } from "../../handlers/player";
import { findLeague, leagueResults, playerLeagues, saveLeague } from "../../handlers/version_data";
import { PROP, PropData, loadProp, saveProp } from "./data";
import { WEEK, currentLeagueId, leagueSongs } from "./info";

const fix = (v: any, n: number, def: number): number[] => {
  const a = Array.isArray(v) ? v.slice(0, n) : [];
  while (a.length < n) a.push(def);
  return a;
};

// Class 1-4 (Amateur, Regular, Master, Legend), subclass 5 (lowest) .. 1 (highest); Legend has
// only subclass 1. Rank 0..15 is the linear order of those.
const classToRank = (c: number, s: number): number => {
  c = Math.min(4, Math.max(1, c | 0)); s = Math.min(5, Math.max(1, s | 0));
  return c === 4 ? 15 : (c - 1) * 5 + (5 - s);
};
const rankToClass = (r: number): [number, number] => {
  r = Math.min(15, Math.max(0, r | 0));
  return r === 15 ? [4, 1] : [Math.floor(r / 5) + 1, 5 - (r % 5)];
};

const shiftClass = (p: PropData, delta: number) => {
  const [nc, ns] = rankToClass(classToRank(p.league_class, p.league_subclass) + delta);
  if (nc === p.league_class && ns === p.league_subclass) return;
  if (p.league_is_checked) {
    p.last.league_class = p.league_class;
    p.last.league_subclass = p.league_subclass;
  }
  p.league_class = nc; p.league_subclass = ns;
  p.league_is_checked = false;
};

const total = (l: VersionLeague) => fix(l.score, 3, 0).reduce((a, b) => a + b, 0);

/** Applies the weeks since the last evaluation. Returns whether `p` changed. */
export async function evaluateLeague(refid: string, p: PropData): Promise<boolean> {
  const cur = currentLeagueId();
  if ((p.league_eval_id | 0) >= cur) return false;
  const played = new Set((await playerLeagues(refid, PROP)).map(l => l.leagueId));
  for (let w = Math.max((p.league_eval_id | 0) + 1, cur - 52); w <= cur; w++) {
    let lastPlayed = 0;
    played.forEach(id => { if (id < w && id > lastPlayed) lastPlayed = id; });
    if (lastPlayed === 0) continue; // no league before this week
    if (played.has(w - 1)) {
      const ranked = (await leagueResults(PROP, w - 1))
        .map(l => ({ refid: (l as any).__refid, total: total(l) }))
        .sort((a, b) => b.total - a.total);
      const promoted = Math.ceil(ranked.length * 0.3);
      const demoted = Math.ceil((ranked.length - promoted) * 0.42);
      const idx = ranked.findIndex(x => x.refid === refid);
      if (idx >= 0 && idx < promoted) shiftClass(p, +1);
      else if (idx >= promoted && demoted > 0 && idx >= ranked.length - demoted) shiftClass(p, -1);
    } else {
      const weeksAway = (w - lastPlayed) - 1;
      if (weeksAway >= 2 && weeksAway % 2 === 0) shiftClass(p, -1);
    }
  }
  p.league_eval_id = cur;
  return true;
}

/** Saves the `data.player.league` part of gameend.regist, keeping the best total. */
export async function saveLeagueResult(refid: string, d: KDataReader, p: PropData) {
  if (!d.element("data.player.league")) return;
  const leagueId = d.number("data.player.league.league_id");
  p.league_is_checked = d.bool("data.player.league.is_checked");
  p.league_is_first_play = d.bool("data.player.league.is_first_play");
  const score = [0, 0, 0], clear = [0, 0, 0];
  for (const m of d.elements("data.player.league.music") || []) {
    const idx = parseInt(m.attr("").index);
    if (isNaN(idx) || idx < 0 || idx > 2) continue;
    score[idx] = m.number("score") | 0;
    clear[idx] = parseInt((m.attr("score") || {}).clear) | 0;
  }
  if (leagueId === undefined || leagueId === null || isNaN(leagueId)) return;
  const old = await findLeague(refid, PROP, leagueId);
  if (!old || total(old) < score.reduce((a, b) => a + b, 0)) await saveLeague(refid, PROP, leagueId, score, clear);
}

export const getLeague: EamusePluginRoute = async (info, data, send) => {
  const jid = $(data).number("data.player.jid");
  const player = jid ? await playerByJid(jid) : null;
  const p = player ? await loadProp(player.__refid) : null;
  if (p && await evaluateLeague(player.__refid, p)) await saveProp(player.__refid, p);

  const leagueId = currentLeagueId();
  const mine = player ? await findLeague(player.__refid, PROP, leagueId) : null;
  const cls = p ? p.league_class || 1 : 1;

  return send.object({
    data: {
      league_list: {
        league: K.ATTR({ index: "0" }, {
          id: K.ITEM("s32", leagueId),
          stime: K.ITEM("u64", BigInt(leagueId * WEEK * 1000)),
          etime: K.ITEM("u64", BigInt((leagueId + 1) * WEEK * 1000)),
          music_list: {
            music: leagueSongs(leagueId).map((m, i) => K.ATTR({ index: String(i) }, {
              music_id: K.ITEM("s32", m),
              seq: K.ITEM("u8", cls === 1 ? 1 : 2),
            })),
          },
          player_list: {
            player: {
              jid: K.ITEM("s32", jid | 0),
              result: {
                score: K.ARRAY("s32", fix(mine && mine.score, 3, 0)),
                clear: K.ARRAY("s8", fix(mine && mine.clear, 3, 0)),
              },
            },
          },
        }),
      },
      last_class: K.ITEM("s32", p ? p.last.league_class || 1 : 1),
      last_subclass: K.ITEM("s32", p ? p.last.league_subclass || 5 : 5),
      is_checked: K.ITEM("bool", p ? p.league_is_checked !== false : true),
    },
  }, { compress: true });
};
