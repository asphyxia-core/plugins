import {getVersion, VersionRange} from '../utils';

export const gameInfo: EPR = (info, data, send) => {
  const locId = $(data).content('shop.locationid');
  const version = getVersion(info);
  if (version === 0) return send.deny();

  return send.object({
    data: {
      ...info.module === 'shopinfo' && {
        cabid: K.ITEM('u32', _.random(1, 10)),
        locationid: K.ITEM('str', locId),
        ...VersionRange(version, 3, 6) && { is_send: K.ITEM('u8', 1) },
      },

      ...VersionRange(version, 5, 6) && {
        white_music_list: K.ARRAY('s32', Array(32).fill(-1))
      }
    }
  });
};

export const demodata = {
  getNews: (_, __, send) => send.object({ data: { officialnews: K.ATTR({ count: '0' }) } }),
  getData: (_, data, send) => {
    const newsId = $(data).number('officialnews.newsid');
    return send.object({
      data: {
        officialnews: {
          data: {
            newsid: K.ITEM('s16', newsId),
            image: K.ITEM('u8', 0, { size: '0' })
          }
        }
      }
    });
  },
  getHitchart: (_, __, send) => send.object({
    data: {
      hitchart: {
        update: K.ITEM('str', ''),

        hitchart_lic: K.ATTR({ count: '0' }),
        hitchart_org: K.ATTR({ count: '0' }),
      }
    }
  }),
};
