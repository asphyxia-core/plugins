import * as tunestreet from "./handler/tunestreet";
import * as fantasia from "./handler/fantasia";
import * as sunny from "./handler/sunny";
import * as lapistoria from "./handler/lapistoria";
import * as eclale from "./handler/eclale";
import * as usaneko from "./handler/usaneko";
import { importPnmData } from "./handler/webui";
import { Rivals } from "./models/common";

const getVersion = (req: any) => {
  switch (req.gameCode) {
    case 'K39':
      return tunestreet;
    case 'L39':
      return fantasia;
    case 'M39':
      return sunny;
  }
}

export function register() {
  R.GameCode('K39');
  R.GameCode('L39');
  R.GameCode('M39');

  R.Config("enable_score_sharing", {
    name: "Score sharing",
    desc: "Enable sharing scores between versions. This also affect rivals scores.",
    type: "boolean",
    default: true,
  });

  R.WebUIEvent('importPnmData', importPnmData);

  R.WebUIEvent('updatePnmPlayerInfo', async (data: any) => {
    await DB.Update(data.refid, { collection: 'profile' }, { $set: { name: data.name } });
  });

  // Rivals UI management
  R.WebUIEvent('deleteRival', async (data: any) => {
    const rivals = await DB.FindOne<Rivals>(data.refid, { collection: 'rivals' }) || {collection: 'rivals', rivals: []};
    const idx = rivals.rivals.indexOf(data.rivalid);
    if(idx >= 0) {
      rivals.rivals.splice(idx, 1);
      await DB.Update(data.refid, { collection: 'rivals' }, rivals);
    }
  });

  R.WebUIEvent('addRival', async (data: any) => {
    const refid = data.refid.trim();
    const profile = await DB.FindOne(data.rivalid, { collection: 'profile'});
    if(profile != undefined && profile != null) {
      const rivals = await DB.FindOne<Rivals>(refid, { collection: 'rivals' }) || {collection: 'rivals', rivals: []};
      if(rivals.rivals.length < 4) {
        rivals.rivals.push(data.rivalid);
        await DB.Upsert(refid, { collection: 'rivals' }, rivals);
      }
    }
  });

  // Route management for PnM <= 21
  R.Route(`game.get`, async (req, data, send) => getVersion(req).getInfo(req, data, send));
  R.Route(`playerdata.new`, async (req, data, send) => getVersion(req).newPlayer(req, data, send));
  R.Route(`playerdata.conversion`, async (req, data, send) => getVersion(req).newPlayer(req, data, send));
  R.Route(`playerdata.get`, async (req, data, send) => getVersion(req).read(req, data, send));
  R.Route(`playerdata.set`, async (req, data, send) => getVersion(req).write(req, data, send));

  // For Pnm >= 22, each game set his own route
  lapistoria.setRoutes();
  eclale.setRoutes();
  usaneko.setRoutes();

  R.Unhandled((req: EamuseInfo, data: any, send: EamuseSend) => {
    return send.success();
  });
}