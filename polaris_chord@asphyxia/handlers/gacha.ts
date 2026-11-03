/*
 * gacha.* —— Hunt（抽卡）的三步协议。
 *
 *   begin_gacha → 拿 transaction_id
 *   draw_gacha  → 确认（不决定结果）
 *   end_gacha   → 真正抽卡：gacha_result + player_data
 *
 * 细节见 docs/抽卡机制逆向.md。要点：
 *   - items / item_counts / item_params 三个数组长度必须相等，否则 EndGachaResponse
 *     构造函数抛 ArgumentException → UnexpectedServerResponse → 弹窗永久卡死；
 *   - player_data 必须与 usr.get 的响应完全同构（缺 crew_id / now_date 会 302）；
 *   - 抽到的卡必须能在游戏 master 里查到，否则 Convert 返回 null → 301。
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
 * Hunt 按钮 = hasGachaEvents = GachaEventBoard.GetAvailables().Count>0
 *（按游戏本地 GachaEventMaster 的 Category 过滤 Contenter/Snapshot），
 * 列表数据来自本接口。数据由 tools/gen_gacha_json.py 生成。
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
    // 100+ 个活动 × 卡池 items 的响应超游戏 321KB 截断线，必须压缩
    await send.object({ gacha_list: K.ATTR({}, { gacha: list }) }, { compress: true });
  } catch (e) {
    enqueue(`!! gacha.get_gacha_info failed: ${e}\n`);
    await send.success();
  }
};

/** BeginGachaModeler+ResponseXrpc：now_date / transaction_id / error */
export const beginGacha: EPR = async (info, data, send) => {
  try {
    enqueue('gacha.begin_gacha\n');
    // NowDateUtc：游戏端用 DateTime.TryParse 解析，必须 ISO8601（紧凑格式解析失败）
    const nowDate = new Date().toISOString();
    // TransactionId 是 System.Guid，必须发合法 GUID（发 "1" 会反序列化失败）
    const txid = '11111111-1111-1111-1111-111111111111';
    await send.object({
      now_date: K.ITEM('str', nowDate),
      transaction_id: K.ITEM('str', txid),
      // BeginGachaModeler.ResponseXrpc.Error = GachaErrorObject 结构（ilspycmd 确认）
      error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }),
    });
  } catch (e) {
    enqueue(`!! gacha.begin_gacha: ${e}\n`);
    await send.success();
  }
};

/** DrawGachaModeler+ResponseXrpc：只回 error（结果在 end_gacha） */
export const drawGacha: EPR = async (info, data, send) => {
  try {
    enqueue('gacha.draw_gacha\n');
    await send.object({ error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }) });
  } catch (e) {
    enqueue(`!! gacha.draw_gacha: ${e}\n`);
    await send.success();
  }
};

/** EndGachaModeler+EndGachaResponseXrpc：gacha_result + player_data */
export const endGacha: EPR = async (info, data, send) => {
  try {
    // 请求体结构兼容多种形态（EPR data 可能是整个 call 对象或 gacha 节点内容）
    const gd = (data as any)?.gacha ?? (data as any) ?? {};
    enqueue(`gacha.end_gacha data: ${JSON.stringify(gd).slice(0, 900)}\n`);
    const rawId = gd?.gacha_id?.['@content'] ?? gd?.gacha_id ?? $(data).attr()?.gacha_id;
    const gachaId = Number(Array.isArray(rawId) ? rawId[0] : rawId) || 0;

    const cfg = await loadGacha();
    const all = cfg.enabled ? cfg.gachas : [];
    const g = all.find((v) => v.gacha_id === gachaId)
      // 兜底：gacha_id 解析不到时用第一个有卡池的活动（保证能抽出卡）
      ?? all.find((v) => v.items.length > 0);
    const pool = g ? g.items : [];
    const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    enqueue(`gacha.end_gacha: gacha_id=${gachaId} pool=${pool.length} drew=${pick ? pick.item_id : 'none'}\n`);

    // GachaResultObject（ilspycmd 反编译确认）：
    //   [XmlArray("items")][XmlArrayItem("item")] List<XrpcString> Items —— 字符串直值！
    //   [XmlArray("item_counts")][XmlArrayItem("count")] List<XrpcInt> Counts
    //   [XmlArray("item_params")][XmlArrayItem("param")] List<XrpcString> Params
    //   [XmlElement("error")] GachaErrorObject Error
    // 顶层 EndGachaResponseXrpc 只有 gacha_result + player_data 两个元素。
    // EndGachaResponse 构造函数（ilspycmd）：三个数组长度必须相等，否则抛 ArgumentException。
    // params 是抽卡结果的 rarity 参数（DrawnEntry 第三参，空串 = 无稀有度标注）。
    // gacha_result 的 items/counts/params 三个数组长度必须相等，否则 EndGachaResponse
    // 构造函数抛 ArgumentException → UnexpectedServerResponse → 弹窗永久卡死；
    // player_data 必须与 usr.get 的响应完全同构（缺 crew_id / now_date 会 302）；
    // 抽到的卡必须能在游戏 master 里查到，否则 Convert 返回 null → 301。
    const resultObj = {
      items: K.ATTR({}, { item: pick ? [K.ITEM('str', pick.item_id)] : [] }),
      item_counts: K.ATTR({}, { count: pick ? [K.ITEM('s32', 1)] : [] }),
      item_params: K.ATTR({}, { param: pick ? [K.ITEM('str', '')] : [] }),
      error: K.ATTR({}, { code: K.ITEM('s32', 0), message: K.ITEM('str', '') }),
    };

    // ★ 先把抽到的东西写进存档，再构建 player_data。
    //   顺序反过来就会出现「演出里抽到了卡，下一局却没有」：
    //   player_data 是 buildPlayerBody() 从存档拼出来的，不在存档里的东西不会下发。
    //   抽到道具 → 数量进持久道具表；抽到卡 → 额外生成一个卡实例（usr_extra_cards）。
    if (pick) {
      try {
        const u = await loadUser();
        recordDrawnItem(u, pick.item_id);
        await saveUser(u);
      } catch (e) {
        enqueue(`!! 抽卡结果落库失败: ${e}\n`);
      }
    }

    // player_data 必须与 usr.get 的响应同构：游戏端 CreatePlayerStatus 会读
    // res.CrewId（new CrewId(res.CrewId)）和 res.Result，缺节点直接抛异常 → 302。
    const { body: pd } = await buildPlayerBody();
    if (!pd.now_date) pd.now_date = K.ITEM('str', nowStr());
    // 游戏上报的 MinValue 日期（0001-01-01）会让 UTC 转换抛异常 → 302
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
