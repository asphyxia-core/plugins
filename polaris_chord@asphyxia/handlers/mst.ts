/*
 * mst.get_common —— 曲目主数据 + 限时事件（Feature/商店/活动）+ demo + 商店事件 + patch。
 *
 * 内容更新器会遍历 4 类数据（曲目 / demo / 活动 / 商店），
 * 只要「有更新成功的」但「不是全部都更新」就抛 NotUpdateContentsUpdaterException → 黑屏。
 * 所以每一类都必须至少有一条最小数据。
 */

import { CLOSE_AT, ISO_CLOSE, ISO_OPEN, OPEN_AT, enqueue, nowStr, trace } from './common';
import { buildMusicList, buildPatch } from './music';

/** 生成 mst_event 的 <event_item> 列表 */
function buildEventItems(): any[] {
  const ev = (id: string) => ({
    id: K.ITEM('str', id),
    param: K.ITEM('s32', 0),
    open_at: K.ITEM('str', ISO_OPEN),
    close_at: K.ITEM('str', ISO_CLOSE),
  });

  return [
    // EventItem.Id 在游戏端是 EventId 字符串结构，统一用 __type="str"。
    // FeatureCatalog：大厅 Story 按钮的解锁条件之一
    ev('feature.storyselect'),
    ev('feature.costumechange'),
    ev('feature.namechange'),
    // 商店：ShopRepository.Fetch 遍历本地 ChangeItemSetGroupMaster（20 个组），
    // 每个组的 EventId（shop.00000~shop.00012）都必须能在限时事件里找到，
    // 找不到的组直接跳过 —— 全部找不到就 GetAvailable()=false，Shop 按钮灰。
    //（mst_shop_goods_event 不是商店数据源，真正的商品在本地 ChangeItemSetMaster）
    ...['shop.00000', 'shop.00001', 'shop.00002', 'shop.00003', 'shop.00004',
      'shop.00005', 'shop.00006', 'shop.00007', 'shop.00008', 'shop.00009',
      'shop.00010', 'shop.00011', 'shop.00012'].map(ev),
    // Caravan 活动：わたこ ep1 剧情（11000001~5）的 RequireEventId，
    // 也是地图（Hunt）活动点的数据来源之一
    ev('caravan.00010008'),
    // Hunt/Caravan：CaravanSeasonMaster 的赛季事件（00010000）+ 8 个活动地点
    // 的事件（CaravanLocationMaster.RequiredEventId，00010001~00010008）。
    // 打歌按 CaravanSeasonPointMaster 的 NoteGrade/Rank 换活动点数，
    // 攒够 CaravanRewardMaster.RequiredCaravanPoint 领奖励（81 个谱面等）。
    ...['caravan.00010000', 'caravan.00010001', 'caravan.00010002', 'caravan.00010003',
      'caravan.00010004', 'caravan.00010005', 'caravan.00010006', 'caravan.00010007'].map(ev),
    // 剧情票：わたこ ep1 各话 RequireItem=True，需要 usr_item 里有
    // story.chara.{剧情号8位} 道具（CharacterStoryId.ToItemId 的格式）
    ...['11000001', '11000002', '11000003', '11000004', '11000005'].map((sid) => ev(`story.chara.${sid}`)),
  ];
}

export const getCommon: EPR = async (info, data, send) => {
  trace('mst.get_common', data);
  try {
    const music = await buildMusicList();
    const res: any = {
      now_date: K.ITEM('str', nowStr()),
      mst_music: K.ATTR({}, { music }),
      mst_event: K.ATTR({}, { event_item: buildEventItems() }),
      mst_demo: K.ATTR({}, {
        demo_item: [
          {
            music_id: K.ITEM('s32', 1),
            demo_type: K.ITEM('s32', 0),
            path: K.ITEM('str', ''),
          },
        ],
      }),
      mst_shop_goods_event: K.ATTR({}, {
        event: [
          {
            goods_event_id: K.ITEM('s32', 99999001),
            open_at: K.ITEM('str', OPEN_AT),
            close_at: K.ITEM('str', CLOSE_AT),
            items: K.ATTR({}, {
              // home.dll：Shop 按钮 = shopRepository.GetAvailable() —— 没有可购
              // 商品（items 空）就一直是灰的。发最小商品条目让 GetAvailable 为真。
              item: [
                {
                  goods_id: K.ITEM('s32', 1),
                  weight: K.ITEM('s32', 1),
                  name: K.ITEM('str', 'item'),
                  stock: K.ITEM('s32', 99),
                },
              ],
            }),
          },
        ],
      }),
    };
    const patch = await buildPatch();
    if (patch) res.mst_patch = patch;
    await send.object(res);
  } catch (e) {
    enqueue('!! mst.get_common build failed: ' + e + '\n');
    await send.success();
  }
};
