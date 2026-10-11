import { userdata } from "../models/userdata";

export const userdataread: EPR = async (info, data, send) => {
  const refid = $(data).attr().card.split('|')[0];
  const user = await DB.FindOne<userdata>(refid, {
    collection: "userdata",
  });
  if (_.isNil(user)) return send.object({}, { status: "SOK", format: false, header: false });

  return send.object({
    b: K.ITEM("str", user.userdata),
  }, { status: "SOK", format: false, header: false });
}

export const userdatawrite: EPR = async (info, data, send) => {
  const refid = $(data).attr().card.split('|')[0];
  const userdata = $(data).str("b");

  await DB.Upsert<userdata>(
    refid,
    {
      collection: "userdata",
    },
    {
      $set: {
        userdata
      }
    }
  );

  return send.object({}, { status: "SOK", format: false, header: false });
}
