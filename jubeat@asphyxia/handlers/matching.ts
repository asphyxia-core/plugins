export const check: EPR = (info, data, send) => {
  const enter = $(data).bool('data.enter');
  const time = $(data).number('data.time');
  return send.object({
    data: {
      entrant_nr: K.ITEM('u32', 1, { time: String(time) }),
      interval: K.ITEM('s16', 1),
      entry_timeout: K.ITEM('s16', U.GetConfig("matching_entry_timeout")),
      waitlist: K.ATTR({ count: "0" })
    }
  });
};

export const entry: EPR = (info, data, send) => {
  const localMatchingNode = $(data).element("data.local_matching");
  const connectNode = $(data).element("data.connect");
  const musicNode = $(data).element('data.music');

  const roomId = _.random(1, 999999999999999);

  // TODO Local matching support

  return send.object({
    data: {
      roomid: K.ITEM('s64', BigInt(roomId), { master: "1" }),
      refresh_intr: K.ITEM('s16', 3),
      music: {
        id: K.ITEM("u32", musicNode.number("id")),
        seq: K.ITEM("u8", musicNode.number("seq")),
      }
    }
  });
};

export const refresh: EPR = (info, data, send) => {
  return send.object({
    data: {
      refresh_intr: K.ITEM('s16', 2),
    }
  });
};

export const report: EPR = (info, data, send) => {
  return send.object({
    data: {
      refresh_intr: K.ITEM('s16', 1),
    }
  });
};
