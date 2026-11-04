/*
 * mst.get_common —— song master data + timed events (Feature / shop / event) + demo + shop
 * events + patch.
 *
 * The content updater walks 4 kinds of data (songs / demo / events / shop); as long as
 * "some updated successfully" but "not all of them updated", it throws
 * NotUpdateContentsUpdaterException → black screen. So every kind needs at least one minimal
 * entry.
 */

import { CLOSE_AT, ISO_CLOSE, ISO_OPEN, OPEN_AT, enqueue, nowStr, trace } from './common';
import { buildMusicList, buildPatch } from './music';

/** Build the <event_item> list for mst_event */
function buildEventItems(): any[] {
  const ev = (id: string) => ({
    id: K.ITEM('str', id),
    param: K.ITEM('s32', 0),
    open_at: K.ITEM('str', ISO_OPEN),
    close_at: K.ITEM('str', ISO_CLOSE),
  });

  return [
    // EventItem.Id is an EventId string structure on the game side, so always use
    // __type="str".
    // FeatureCatalog: one of the unlock conditions for the lobby's Story button
    ev('feature.storyselect'),
    ev('feature.costumechange'),
    ev('feature.namechange'),
    // Shop: ShopRepository.Fetch walks the local ChangeItemSetGroupMaster (20 groups), and
    // every group's EventId (shop.00000~shop.00012) must be findable among the timed events —
    // groups that are not found are skipped outright, and if none are found GetAvailable()
    // is false and the Shop button is grey.
    // (mst_shop_goods_event is not the shop data source; the real goods live in the local
    //  ChangeItemSetMaster)
    ...['shop.00000', 'shop.00001', 'shop.00002', 'shop.00003', 'shop.00004',
      'shop.00005', 'shop.00006', 'shop.00007', 'shop.00008', 'shop.00009',
      'shop.00010', 'shop.00011', 'shop.00012'].map(ev),
    // Caravan event: the RequireEventId of the わたこ ep1 story (11000001~5),
    // and also one of the data sources for the map (Hunt) activity spots
    ev('caravan.00010008'),
    // Hunt/Caravan: CaravanSeasonMaster's season event (00010000) plus the events of the 8
    // activity locations (CaravanLocationMaster.RequiredEventId, 00010001~00010008).
    // Playing a song converts to activity points via CaravanSeasonPointMaster's
    // NoteGrade/Rank, and once enough are saved up you claim rewards per
    // CaravanRewardMaster.RequiredCaravanPoint (81 charts etc.).
    ...['caravan.00010000', 'caravan.00010001', 'caravan.00010002', 'caravan.00010003',
      'caravan.00010004', 'caravan.00010005', 'caravan.00010006', 'caravan.00010007'].map(ev),
    // Story tickets: every episode of わたこ ep1 has RequireItem=True, so usr_item needs a
    // story.chara.{8-digit story number} item (the format from CharacterStoryId.ToItemId)
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
              // home.dll: the Shop button = shopRepository.GetAvailable() — with no
              // purchasable goods (empty items) it stays grey forever. Send a minimal goods
              // entry so GetAvailable is true.
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
