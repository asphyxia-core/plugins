/*
 * gacha.* — the three-step protocol for Hunt (the gacha).
 *
 *   begin_gacha → obtain a transaction_id
 *   draw_gacha  → confirmation (does not decide the result)
 *   end_gacha   → the actual draw: gacha_result + player_data
 *
 * Details in docs/gacha-protocol.md. Key points:
 *   - the items / item_counts / item_params arrays must all have the same length, otherwise
 *     the EndGachaResponse constructor throws ArgumentException → UnexpectedServerResponse →
 *     the dialog hangs forever;
 *   - player_data must be fully isomorphic to the usr.get response (missing crew_id /
 *     now_date gives 302);
 *   - the drawn card must be resolvable in the game master, otherwise Convert returns
 *     null → 301.
 */

import { enqueue, nowStr } from './common';
import { buildPlayerBody, sanitizePlayInfoDates } from './playerdata';
import { loadUser, recordDrawnItem, saveUser } from './store';

type GachaCfgItem = { item_id: string; rarity: number; is_pickup: boolean };
type GachaCfgEntry = {
  gacha_id: number; name: string; category: number; payment_type: number;
  prob_weight_r: number; prob_weight_sr: number; prob_weight_ss: number;
  prob_weight_ssr: number; prob_weight_pickup: number;
  guarantee_serial_limit: number; gacha_consume_item_id: string;
  gacha_consume_item_count: number; open_at: string; close_at: string;
  start_softcode: string; end_softcode: string; drawable_item_type: number;
  items: GachaCfgItem[];
};

let gachaCache: { enabled: boolean; gachas: GachaCfgEntry[] } | null = null;

async function loadGacha(): Promise<{ enabled: boolean; gachas: GachaCfgEntry[] }> {
  if (gachaCache) return gachaCache;
  const empty = { enabled: false, gachas: [] as GachaCfgEntry[] };
  try {
    const p = IO.Resolve('data/gacha.json');
    if (IO.Exists(p)) {
      const raw = (await IO.ReadFile(p, 'utf8')) as string | null;
      if (raw) gachaCache = JSON.parse(raw) as { enabled: boolean; gachas: GachaCfgEntry[] };
    }
  } catch (e) {
    enqueue(`!! failed to load data/gacha.json: ${e}\n`);
  }
  return gachaCache || empty;
}

/**
 * The Hunt button = hasGachaEvents = GachaEventBoard.GetAvailables().Count>0
 * (filtered by the Category of the game's local GachaEventMaster against Contenter/Snapshot),
 * and the list data comes from this endpoint. `data/gacha.json` was generated offline from the
 * game's own master tables and can be edited by hand.
 */
export const getGachaInfo: EPR = async (info, data, send) => {
  try {
    const cfg = await loadGacha();
    const list = (cfg.enabled ? cfg.gachas : []).map((g) =>
      K.ATTR({}, {
        gacha_id: K.ITEM('s32', g.gacha_id),
        name: K.ITEM('str', g.name),
        payment_type: K.ITEM('s32', g.payment_type),
        prob_weight_r: K.ITEM('s32', g.prob_weight_r),
        prob_weight_sr: K.ITEM('s32', g.prob_weight_sr),
        prob_weight_ss: K.ITEM('s32', g.prob_weight_ss),
        prob_weight_ssr: K.ITEM('s32', g.prob_weight_ssr),
        prob_weight_pickup: K.ITEM('s32', g.prob_weight_pickup),
        guarantee_serial_limit: K.ITEM('s32', g.guarantee_serial_limit),
        gacha_consume_item_id: K.ITEM('str', g.gacha_consume_item_id),
        gacha_consume_item_count: K.ITEM('s32', g.gacha_consume_item_count),
        open_at: K.ITEM('str', g.open_at),
        close_at: K.ITEM('str', g.close_at),
        start_softcode: K.ITEM('str', g.start_softcode),
        end_softcode: K.ITEM('str', g.end_softcode),
        drawable_item_type: K.ITEM('s32', g.drawable_item_type),
        items: K.ATTR({}, {
          item: g.items.map((it) =>
            K.ATTR({}, {
              item_id: K.ITEM('str', it.item_id),
              rarity_type: K.ITEM('s32', it.rarity),
              is_pickup: K.ITEM('bool', it.is_pickup ? 1 : 0),
            })),
        }),
      }));
    enqueue(`gacha.get_gacha_info: ${list.length} gachas\n`);
    // A response with 100+ events × pool items exceeds the game's 321KB truncation line,
    // so it must be compressed
    await send.object({ gacha_list: K.ATTR({}, { gacha: list }) }, { compress: true });
  } catch (e) {
    enqueue(`!! gacha.get_gacha_info failed: ${e}\n`);
    await send.success();
  }
};

/** BeginGachaModeler+ResponseXrpc: now_date / transaction_id / error */
export const beginGacha: EPR = async (info, data, send) => {
  try {
    enqueue('gacha.begin_gacha\n');
    // NowDateUtc: parsed on the game side with DateTime.TryParse, so it must be ISO8601
    // (the compact format fails to parse)
    const nowDate = new Date().toISOString();
    // TransactionId is a System.Guid, so a legal GUID must be sent
    // (sending "1" makes deserialization fail)
    const txid = '11111111-1111-1111-1111-111111111111';
    await send.object({
      now_date: K.ITEM('str', nowDate),
      transaction_id: K.ITEM('str', txid),
      // BeginGachaModeler.ResponseXrpc.Error = GachaErrorObject structure (confirmed by ilspycmd)
      error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }),
    });
  } catch (e) {
    enqueue(`!! gacha.begin_gacha: ${e}\n`);
    await send.success();
  }
};

/** DrawGachaModeler+ResponseXrpc: only returns error (the result is in end_gacha) */
export const drawGacha: EPR = async (info, data, send) => {
  try {
    enqueue('gacha.draw_gacha\n');
    await send.object({ error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }) });
  } catch (e) {
    enqueue(`!! gacha.draw_gacha: ${e}\n`);
    await send.success();
  }
};

/** EndGachaModeler+EndGachaResponseXrpc: gacha_result + player_data */
export const endGacha: EPR = async (info, data, send) => {
  try {
    // The request body structure tolerates several shapes (the EPR data may be the whole
    // call object or the content of the gacha node)
    const gd = (data as any)?.gacha ?? (data as any) ?? {};
    enqueue(`gacha.end_gacha data: ${JSON.stringify(gd).slice(0, 900)}\n`);
    const rawId = gd?.gacha_id?.['@content'] ?? gd?.gacha_id ?? $(data).attr()?.gacha_id;
    const gachaId = Number(Array.isArray(rawId) ? rawId[0] : rawId) || 0;

    const cfg = await loadGacha();
    const all = cfg.enabled ? cfg.gachas : [];
    const g = all.find((v) => v.gacha_id === gachaId)
      // Fallback: when gacha_id cannot be parsed, use the first event that has a card pool
      // (so that a card is always drawn)
      ?? all.find((v) => v.items.length > 0);
    const pool = g ? g.items : [];
    const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    enqueue(`gacha.end_gacha: gacha_id=${gachaId} pool=${pool.length} drew=${pick ? pick.item_id : 'none'}\n`);

    // GachaResultObject (confirmed by decompiling with ilspycmd):
    //   [XmlArray("items")][XmlArrayItem("item")] List<XrpcString> Items — direct string values!
    //   [XmlArray("item_counts")][XmlArrayItem("count")] List<XrpcInt> Counts
    //   [XmlArray("item_params")][XmlArrayItem("param")] List<XrpcString> Params
    //   [XmlElement("error")] GachaErrorObject Error
    // The top level EndGachaResponseXrpc has only two elements: gacha_result + player_data.
    // The EndGachaResponse constructor (ilspycmd): all three arrays must have the same length,
    // otherwise it throws ArgumentException.
    // params is the rarity parameter of the draw result (the third DrawnEntry argument,
    // empty string = no rarity annotation).
    // The items/counts/params arrays of gacha_result must all have the same length, otherwise
    // the EndGachaResponse constructor throws ArgumentException → UnexpectedServerResponse →
    // the dialog hangs forever;
    // player_data must be fully isomorphic to the usr.get response (missing crew_id /
    // now_date gives 302);
    // the drawn card must be resolvable in the game master, otherwise Convert returns
    // null → 301.
    const resultObj = {
      items: K.ATTR({}, { item: pick ? [K.ITEM('str', pick.item_id)] : [] }),
      item_counts: K.ATTR({}, { count: pick ? [K.ITEM('s32', 1)] : [] }),
      item_params: K.ATTR({}, { param: pick ? [K.ITEM('str', '')] : [] }),
      error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }),
    };

    // ★ Write the drawn item into the save first, then build player_data.
    //   In the opposite order you get "the card was drawn in the presentation but is missing
    //   in the next play": player_data is assembled from the save by buildPlayerBody(), and
    //   anything that is not in the save is not delivered.
    //   Drawn item → its count goes into the persistent item table; drawn card → one extra
    //   card instance is generated (usr_extra_cards).
    if (pick) {
      try {
        const u = await loadUser();
        recordDrawnItem(u, pick.item_id);
        await saveUser(u);
      } catch (e) {
        enqueue(`!! failed to persist the gacha result: ${e}\n`);
      }
    }

    // player_data must be isomorphic to the usr.get response: on the game side
    // CreatePlayerStatus reads res.CrewId (new CrewId(res.CrewId)) and res.Result, so a
    // missing node throws immediately → 302.
    const { body: pd } = await buildPlayerBody();
    if (!pd.now_date) pd.now_date = K.ITEM('str', nowStr());
    // The MinValue date (0001-01-01) reported by the game makes the UTC conversion throw → 302
    sanitizePlayInfoDates(pd);

    await send.object({
      gacha_result: K.ATTR({}, resultObj),
      player_data: K.ATTR({}, pd),
    }, { compress: true });
  } catch (e) {
    enqueue(`!! gacha.end_gacha: ${e}\n`);
    await send.success();
  }
};
