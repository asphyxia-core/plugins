import { GameVersion } from "./types";
import { Prop } from "./prop";
import { Qubell } from "./qubell";
import { Clan } from "./clan";
import { Festo } from "./festo";

/**
 * Supported game versions, oldest first. Each one owns its routes, so a
 * version can change without touching the others.
 *
 * To add a version, copy the closest module, change what differs, and list it here.
 */
export const VERSIONS: GameVersion[] = [Prop, Qubell, Clan, Festo];

/**
 * The version a cabinet runs, from the date in its model string. A model
 * without a date is answered as festo, as before the split.
 */
export function versionFor(model: string): GameVersion | undefined {
  const date = parseInt((model || "").split(":")[4]);
  if (isNaN(date)) return Festo;
  return VERSIONS.find(v => date >= v.from && date < v.until);
}

const dispatch = (method: string): EamusePluginRoute => async (info, data, send) => {
  const version = versionFor(info.model);
  if (!version) {
    console.warn(`[jubeat] unsupported version ${info.model} (${method})`);
    return send.deny();
  }
  const handler = version.routes[method];
  if (handler === undefined) {
    console.warn(`[jubeat] ${version.name}: unhandled method ${method}`);
    return send.success();
  }
  if (handler === true) return send.success();
  if (handler === false) return send.deny();
  // Never let a handler exception surface as an HTTP error: log it and deny instead.
  try {
    return await handler(info, data, send);
  } catch (e) {
    console.error(`[jubeat] ${version.name} ${method} failed: ${e && e.stack ? e.stack : e}`);
    return send.deny();
  }
};

/** Registers one route per method any version handles, dispatched by version. */
export function registerVersions() {
  const methods = new Set<string>();
  for (const version of VERSIONS) Object.keys(version.routes).forEach(m => methods.add(m));
  methods.forEach(method => R.Route(method, dispatch(method)));
}
