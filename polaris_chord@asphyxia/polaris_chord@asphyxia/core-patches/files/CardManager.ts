import { appendFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { get } from 'lodash';
import { ROOT_CONTAINER } from '../index';

import {
  FindCard,
  FindProfile,
  CreateProfile,
  BindProfile,
  DeleteCard,
  CreateCard,
  UpdateProfile,
  APIFindOne,
} from '../../utils/EamuseIO';

/**
 * Card-master payload dump for diagnostics.
 *
 * Off by default: set the environment variable `XIF_CARDMNG_DEBUG=1` before starting
 * CORE to write `cardmng-debug.log` in the CORE folder. It used to be always-on, which
 * made the log grow on every card read.
 */
function dumpCardmng(tag: string, payload: any) {
  // on by default so a failed card read leaves a trace; set XIF_CARDMNG_DEBUG=0 to silence
  if (process.env.XIF_CARDMNG_DEBUG === '0') return;
  try {
    appendFileSync(
      resolve(__dirname, '../../../cardmng-debug.log'),
      `[${new Date().toISOString()}] ${tag} ${JSON.stringify(payload)}\n`
    );
  } catch {
    /* ignore */
  }
}

/**
 * Reply shape is controlled by asphyxia-src/cardmng-mode.json and re-read on
 * every request, so it can be flipped while the server keeps running.
 */
function readCardmngMode(): {
  mode: string;
  typed: boolean;
  plain: boolean;
  pcode: string;
  forceBinded: number | null;
} {
  const fallback = {
    mode: 'both',
    typed: false,
    plain: true,
    pcode: 'XIF0',
    forceBinded: null as number | null,
  };
  try {
    const p = resolve(__dirname, '../../../cardmng-mode.json');
    if (!existsSync(p)) return fallback;
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    return {
      mode: typeof raw.mode === 'string' ? raw.mode : fallback.mode,
      typed: raw.typed === true,
      plain: raw.plain !== false,
      pcode: typeof raw.pcode === 'string' ? raw.pcode : fallback.pcode,
      forceBinded:
        typeof raw.forceBinded === 'number' ? raw.forceBinded : (null as number | null),
    };
  } catch {
    return fallback;
  }
}

export const cardmng = new EamuseRouteContainer();

async function CheckProfile(gameCode: string, refid: string) {
  const plugin = ROOT_CONTAINER.getPluginByCode(gameCode);
  if (!plugin) {
    return false;
  }
  const profile = await APIFindOne({ identifier: plugin.Identifier, core: true }, refid, {});
  if (profile != null) {
    return true;
  }
  return false;
}

cardmng.add('cardmng.inquire', async (info, data, send) => {
  const cid: string = get(data, '@attr.cardid');

  dumpCardmng('inquire.request', data);

  // let refid = CARD_CACHE[cid];

  const card = await FindCard(cid);

  if (!card) {
    // Create new account
    dumpCardmng('inquire.no-card', { cid });
    return send.status(112);
  }

  const profile = await FindProfile(card.__refid);
  if (!profile) {
    await DeleteCard(cid);
    dumpCardmng('inquire.no-profile', { cid, refid: card.__refid });
    return send.status(112);
  }

  if (profile.pin === 'unset') {
    // need update pin
    dumpCardmng('inquire.pin-unset', { cid, refid: card.__refid });
    return send.status(112);
  }

  const refid = card.__refid;
  const lastupdate = Math.floor(card.updatedAt.getTime() / 1000);
  const autoBinded = (await CheckProfile(info.gameCode, refid)) ? 1 : 0;
  const opts = readCardmngMode();
  const binded = opts.forceBinded != null ? opts.forceBinded : autoBinded;

  const fields: any = {
    binded,
    dataid: refid,
    ecflag: 1,
    expired: 0,
    lastupdate,
    newflag: 0,
    refid,
    pcode: opts.pcode,
    useridflag: 0,
    extidflag: 0,
    quickec: 0,
  };

  // Shape of the reply is switchable at runtime (no restart needed):
  //   { "mode": "both" | "attr" | "node", "typed": true|false, "forceBinded": 0|1 }
  const childNodes: any = {};
  for (const [k, v] of Object.entries(fields)) {
    const node: any = { '@content': String(v) };
    if (opts.typed) node['@attr'] = { __type: typeof v === 'number' ? 's32' : 'str' };
    childNodes[k] = node;
  }

  let body: any = {};
  if (opts.mode === 'attr') body = { '@attr': fields };
  else if (opts.mode === 'node') body = { ...childNodes };
  else body = { '@attr': fields, ...childNodes };

  dumpCardmng('inquire.response', { opts, body });

  dumpCardmng('inquire.meta', {
    reqKencoded: (send as any).body?.kencoded,
    reqEncoding: (send as any).body?.encoding,
    forcePlain: opts.plain,
  });

  // binary (kencoded) replies cannot carry attributes, so force plain XML by default
  send.object(body, { kencode: !opts.plain });

  return;
});

cardmng.add('cardmng.getrefid', async (info, data, send) => {
  dumpCardmng('getrefid.request', data);
  const cid: string = get(data, '@attr.cardid');
  const pin: string = get(data, '@attr.passwd');

  const card = await FindCard(cid);
  if (card) {
    // Card exists, update profile pin
    const updated = await UpdateProfile(card.__refid, { pin }, true);
    if (updated) {
      await BindProfile(card.__refid, info.gameCode);
      return send.object(
        { '@attr': { dataid: card.__refid, refid: card.__refid, pcode: readCardmngMode().pcode } },
        { kencode: !readCardmngMode().plain }
      );
    } else {
      return send.deny();
    }
  }

  const newProfile = await CreateProfile(pin, info.gameCode);
  if (!newProfile) {
    // Creation Failed
    return send.deny();
  }

  const refid = newProfile.__refid;

  const newCard = await CreateCard(cid, refid);
  if (!newCard) {
    // Creation Failed
    return send.deny();
  }

  send.object(
    { '@attr': { dataid: refid, refid, pcode: readCardmngMode().pcode } },
    { kencode: !readCardmngMode().plain }
  );
  return;
});

cardmng.add('cardmng.authpass', async (info, data, send) => {
  dumpCardmng('authpass.request', data);
  const refid = get(data, '@attr.refid', null);
  const pass = get(data, '@attr.pass', '-1');

  const profile = await FindProfile(refid);

  if (!profile) {
    return send.status(110);
  }

  if (profile.pin !== pass) {
    return send.status(116);
  }

  // Right password
  send.success();
});

cardmng.add('cardmng.bindmodel', async (info, data, send) => {
  dumpCardmng('bindmodel.request', data);
  const refid = get(data, '@attr.refid', 'DEADC0DEFEEDBEEF');

  await BindProfile(refid, info.gameCode);
  send.object(
    { '@attr': { dataid: refid, refid, pcode: readCardmngMode().pcode } },
    { kencode: !readCardmngMode().plain }
  );
});
