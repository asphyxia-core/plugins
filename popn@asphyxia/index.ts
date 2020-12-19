import { getInfo } from "./handler/common";
import { newPlayer, read, readScore, start, writeMusic, write, buy } from "./handler/player";
import { importPnmData } from "./handler/webui";

export function register() {
  R.GameCode('M39');
  
  R.Config("enable_25_event", {
    name: "PNM25 event",
    desc: "Enable the pop'n event archive",
    type: "boolean",
    default: true,
  });

  R.WebUIEvent('importPnmData', importPnmData);
  R.WebUIEvent('updatePnmPlayerInfo', async (data: any) => {
    await DB.Update(data.refid, { collection: 'profile' }, { $set: { name: data.name } });
  });

  const PlayerRoute = (method: string, handler: EPR | boolean) => {
    R.Route(`player24.${method}`, handler);
    R.Route(`player23.${method}`, handler);
  };

  const CommonRoute = (method: string, handler: EPR | boolean) => {
    R.Route(`info24.${method}`, handler);
    R.Route(`info23.${method}`, handler);
  };

  // Common
  CommonRoute('common', (req, data, send) => {
    return send.object(getInfo(req));
  });

  // Player
  PlayerRoute('new', newPlayer);
  PlayerRoute('read', read);
  PlayerRoute('read_score', readScore);
  PlayerRoute('write_music', writeMusic);
  PlayerRoute('write', write);
  PlayerRoute('start', start);
  PlayerRoute('buy', buy);
}