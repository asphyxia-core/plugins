import { getVersion } from '../utils';

export const shopRegist: EPR = (i, data, send) => {
  const locId = $(data).content('shop.locationid');
  const cabId = $(data).number('shop.testmode.network.cabinet_id', 1);
  const version = getVersion(i);
  if (version <= 0) return send.deny();

  return send.object({
    data: {
      cabid: K.ITEM('u32', cabId),
      locationid: K.ITEM('str', locId),

      ...(version >= 1 && version <= 3 && { is_send: K.ITEM('u8', 1) }),
    },
  });
};

export const demodata = {
  getNews: (_, __, send) =>
    send.object({ data: { officialnews: K.ATTR({ count: '0' }) } }),
};
