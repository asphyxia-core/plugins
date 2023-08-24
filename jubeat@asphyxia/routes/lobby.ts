export const Check = (req, reqData, send) => {
const { data } = reqData;
const enter = $(data).content("enter");
const time = $(data).content("time");
return send.object(
    {
    data: {
        entrant_nr: K.ITEM("u32", 0, { time }),
        interval: K.ITEM("s16", 0),
        entry_timeout: K.ITEM("s16", 15),
        waitlist: K.ATTR({ count: "0" }, { music: [] }),
    },
    },
    { compress: true }
);
};

export const Entry = (req: EamuseInfo, data: any, send: EamuseSend) => {
const {
    data: { music },
} = data;
const musicId = $(music).content("id");
const musicSeq = $(music).content("seq");
return send.object(
    {
    data: {
        roomid: K.ITEM("s64", BigInt(1), { master: "1" }),
        refresh_intr: K.ITEM("s16", 0),
        music: {
        id: K.ITEM("u32", musicId),
        seq: K.ITEM("u8", musicSeq),
        },
    },
    },
    { compress: true }
);
};

export const Refresh = (req: EamuseInfo, data: any, send: EamuseSend) => {

return send.object(
    {
    data: { refresh_intr: K.ITEM("s16", 0), start: K.ITEM("bool", true) },
    },
    { compress: true }
);
};

export const Report = (req: EamuseInfo, data: any, send: EamuseSend) =>
send.object(
    {
    data: { refresh_intr: K.ITEM("s16", 0) },
    },
    { compress: true }
);

