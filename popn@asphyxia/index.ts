import * as tunestreet from "./handler/tunestreet";
import * as fantasia from "./handler/fantasia";
import * as sunny from "./handler/sunny";
import * as lapistoria from "./handler/lapistoria";
import * as eclale from "./handler/eclale";
import * as usaneko from "./handler/usaneko";
import { importPnmData } from "./handler/webui";

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
    desc: "Enable sharing scores between versions",
    type: "boolean",
    default: true,
  });

  R.WebUIEvent('importPnmData', importPnmData);

  R.WebUIEvent('updatePnmPlayerInfo', async (data: any) => {
    await DB.Update(data.refid, { collection: 'profile' }, { $set: { name: data.name } });
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