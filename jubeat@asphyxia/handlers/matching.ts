import { getVersion } from '../utils';

export const lobby = {
  check: (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    return send.object({
      data: {
        entrant_nr: K.ITEM('u32', 1, { time: 0 + '' }),
        interval: K.ITEM('s16', 3),
        entry_timeout: K.ITEM('s16', 15),
        waitlist: K.ATTR({ count: '0' }),
      },
    });
  },
  entry: (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    const musicId = $(data).number('data.music.id', 20000037);
    const musicSeq = $(data).number('data.music', 0);

    return send.object({
      data: {
        roomid: K.ITEM('s64', BigInt(1), { master: '1' }),
        refresh_intr: K.ITEM('s16', 5),
        music: {
          id: K.ITEM('u32', musicId),
          seq: K.ITEM('u8', musicSeq),
        },
      },
    });
  },
  refresh: (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    return send.object({
      data: {
        refresh_intr: K.ITEM('s16', 3),
      },
    });
  },
  report: (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    return send.object({
      data: {
        refresh_intr: K.ITEM('s16', 3),
      },
    });
  },
};
