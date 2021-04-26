import {getVersion} from "../utils";

export const shopinfo: EPR = (info, data, send) => {
  const locId = $(data).content("shop.locationid");
  const version = getVersion(info);
  if (version === 0) return send.deny();

  if (version === 3 || version === 4) {
    return send.object({
      data: {
        cabid: K.ITEM('u32', 1),
        locationid: K.ITEM('str', locId),
        is_send: K.ITEM("u8", 1)
      }
    });
  }

  return send.deny();
};

export const demodata = {
  getNews: (_, __, send) => send.object({ data: { officialnews: K.ATTR({ count: "0" }) } }),
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

        hitchart_lic: K.ATTR({ count: "0" }),
        hitchart_org: K.ATTR({ count: "0" }),
      }
    }
  }),
};

export const netlog: EPR = (info, data, send) => {
  const errMsg = $(data).str('msg');
  console.error(errMsg);
  return send.success();
};
