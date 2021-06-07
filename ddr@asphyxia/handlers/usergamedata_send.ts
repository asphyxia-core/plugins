import { Profile } from "../models/profile";

export const usergamedata_send: EPR = async (info, data, send) => {
  const refId = $(data).str("data.refid");

  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  if (!profile) return send.deny();

  for (const record of $(data).elements("data.record.d")) {
    const decodeStr = Buffer.from(record.str("", ""), "base64").toString("ascii");
    const decodeBin = Buffer.from(record.str("bin1", ""), "base64").toString("ascii");

    const strdata = decodeStr.split(",");
    const type = Buffer.from(strdata[1]).toString("utf-8");

    if (!profile.usergamedata) profile.usergamedata = {};
    if (!profile.usergamedata[type]) profile.usergamedata[type] = {};
    profile.usergamedata[type] = {
      strdata: strdata.slice(2, -1).join(","),
      bindata: decodeBin
    };
  }

  try {
    await DB.Update<Profile>(refId, { collection: "profile" }, profile);

    return send.object({ result: K.ITEM("s32", 0) });
  } catch {
    return send.deny();
  }
};
