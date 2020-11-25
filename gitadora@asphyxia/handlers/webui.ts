import { PlayerInfo } from "../models/playerinfo"

export const updatePlayerInfo = async (data: {
  refid: string;
  version: string;
  name?: string;
  title?: string;
}) => {
  if (data.refid == null) return;

  const update: Update<PlayerInfo>['$set'] = {};

  if (data.name && data.name.length > 0) {
    //TODO: name validator
    update.name = data.name;
  }

  if (data.title && data.title.length > 0) {
    //TODO: title validator
    update.title = data.title;
  }

  await DB.Update<PlayerInfo>(
    data.refid,
    { collection: 'playerinfo', version: data.version },
    { $set: update }
  );
};