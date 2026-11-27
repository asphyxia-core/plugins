import { VersionInfo } from "../versions/types";
import { mostPlayed } from "./scores";

// Replies that versions before festo share.

export const news: EamusePluginRoute = (info, data, send) =>
  send.object({ data: { officialnews: K.ATTR({ count: "0" }) } }, { compress: true });

/** Top 10 songs by plays on this server, limited to the version's songs. */
export const hitchart = (version: VersionInfo): EamusePluginRoute => async (info, data, send) => {
  const now = new Date();
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  const top = await mostPlayed(version, 10);
  return send.object({
    data: {
      update: K.ITEM("str", `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`),
      hitchart_lic: K.ATTR({ count: "0" }),
      hitchart_org: K.ATTR({ count: String(top.length) }, {
        rankdata: top.map((id, i) => ({
          music_id: K.ITEM("s32", id),
          rank: K.ITEM("s16", i + 1),
          prev: K.ITEM("s16", i + 1),
        })),
      }),
    },
  }, { compress: true });
};

export const meeting: EamusePluginRoute = (info, data, send) =>
  send.object({
    data: {
      meeting: { single: K.ATTR({ count: "0" }), tag: K.ATTR({ count: "0" }) },
      reward: { total: K.ITEM("s32", -1), point: K.ITEM("s32", -1) },
    },
  }, { compress: true });

export const lobbyCheck: EamusePluginRoute = (info, data, send) =>
  send.object({
    data: {
      interval: K.ITEM("s16", 0),
      entry_timeout: K.ITEM("s16", 0),
      entrant_nr: K.ITEM("u32", 0, { time: "0" }),
    },
  }, { compress: true });
