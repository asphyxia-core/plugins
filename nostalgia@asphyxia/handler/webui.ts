import { Profile } from "../models/profile";

export const fixIndexBug = async (data: {
    refid: string;
    confirm: string;
  }) => {
    if (data.confirm == "on") {
      console.warn(`refid "${data.refid}" performs index reset!`)
      await DB.Update<Profile>(
        data.refid,
        { collection: 'profile' },
        { $set: {
            music: 0,
            sheet: 0,
            brooch: 0
          }
        }
      );
    }
  };