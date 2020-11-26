import { Profile } from "../models/profile";

export const setUnlockState = async (data: {
  refid: string;
  unlock_all: string;
}) => {
  await DB.Update<Profile>(
    data.refid,
    { collection: 'profile' },
    { $set: {
        unlockAll: data.unlock_all == "on"
      }
    }
  );
};