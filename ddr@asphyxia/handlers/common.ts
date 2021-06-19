export const eventLog: EPR = (info, data, send) => {
  return send.object({
    gamesession: K.ITEM("s64", BigInt(1)),
    logsendflg: K.ITEM("s32", 0),
    logerrlevel: K.ITEM("s32", 0),
    evtidnosendflg: K.ITEM("s32", 0)
  });
};

export const convcardnumber: EPR = (info, data, send) => {
  return send.object({
    result: K.ITEM("s32", 0),

    data: {
      card_number: K.ITEM("str", $(data).str("data.card_id").split("|")[0])
    }
  });
};
