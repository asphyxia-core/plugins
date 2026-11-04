/*
 * Shared utilities: constants, logging, config reading, XRPC node value helpers, route wrapping.
 * Consistent with the official plugin template — logic lives in handlers/, index.ts only registers.
 */

/* ---------- Constants ---------- */

export const LOG_FILE = 'xrpc.log';

export const OPEN_AT = '20240101000000';
export const CLOSE_AT = '20991231235959';
// For mst_event only: the client's LimitedTimeEventRepository parses open_at/close_at with
// DateTime.TryParse (ISO8601); the compact KONAMI format (20240101000000) fails to parse and
// makes every event get discarded
export const ISO_OPEN = '2024-01-01T00:00:00';
export const ISO_CLOSE = '2099-12-31T23:59:59';

/* ---------- Time / logging ---------- */

export function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}Z`
  );
}

let cache: string | null = null;
let queue: Promise<void> = Promise.resolve();

export function enqueue(text: string): void {
  queue = queue.then(async () => {
    try {
      if (cache === null) {
        const path = IO.Resolve(LOG_FILE);
        cache = IO.Exists(path) ? (((await IO.ReadFile(path, 'utf8')) as string | null) ?? '') : '';
      }
      cache += text;
      const limit = logLimit();
      if (limit > 0 && cache.length > limit) {
        cache = cache.slice(cache.length - limit);
      }
      await IO.WriteFile(IO.Resolve(LOG_FILE), cache);
    } catch (e) {
      console.log('[xif] log write failed: ' + e);
    }
  });
}

function json(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch (e) {
    return String(v);
  }
}

/** Read a WebUI config entry (registered by R.Config), falling back to the default when it is
 *  missing or holds an invalid value */
export function cfg<T>(key: string, fallback: T): T {
  try {
    const v = U.GetConfig(key);
    if (v === undefined || v === null || v === '') return fallback;
    return v as T;
  } catch (e) {
    return fallback;
  }
}

/** Size limit for xrpc.log (bytes); 0 = unlimited. Controlled by the log_limit_kb config entry */
function logLimit(): number {
  const kb = cfg<number>('log_limit_kb', 1024);
  return kb > 0 ? kb * 1024 : 0;
}

export function trace(name: string, data: any): void {
  if (!cfg<boolean>('debug_trace', true)) return;
  let xml = '';
  try {
    xml = U.toXML(data);
  } catch (e) {
    xml = '(toXML failed: ' + e + ')';
  }
  enqueue(`\n===== ${nowStr()}  ${name} =====\n--- json ---\n${json(data)}\n--- xml ---\n${xml}\n`);
}

/* ---------- ID / node value helpers ---------- */

/** Derive a stable 16-hex-digit ID from the card number (same shape as asphyxia's refid/dataid) */
export function toRefid(card: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < card.length; i++) {
    const c = card.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + c * (i + 7)) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const part = (n: number) => n.toString(16).toUpperCase().padStart(8, '0');
  return part(h1) + part(h2);
}

export function cardAttr(data: any, key: string): string {
  try {
    const v = $(data).attr()[key];
    return v === undefined || v === null ? '' : String(v);
  } catch (e) {
    return '';
  }
}

/** A leaf node looks like { '@attr': {__type}, '@content': v }; this returns the bare value
 *
 *  Note that ea3's @content is **always an array**: `<high_speed>10</high_speed>` parses into
 *  `{"@content":[10]}`. Without unwrapping it, `typeof v === 'object'` makes every numeric value
 *  be skipped as an object — which is exactly the root cause of "settings such as volume and
 *  speed are reset on every login".
 *  A single-element array is returned as a scalar; a multi-element one (e.g. usr_deck.deck) still
 *  returns an array.
 */
export function dv(node: any): any {
  if (node === undefined || node === null) return undefined;
  if (Array.isArray(node)) return node.length === 1 ? dv(node[0]) : node.map(dv);
  if (typeof node === 'object' && '@content' in node) return dv(node['@content']);
  return node;
}

export function sub(data: any, name: string): any {
  return data && typeof data === 'object' ? data[name] : undefined;
}

/** Repeated nodes get parsed into an array; normalize to an array here */
export function list(node: any, item: string): any[] {
  const v = sub(node, item);
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/* ---------- Route wrapping ---------- */

/** Route wrapper standardizing "log the request -> build the response -> fall back to success on
 *  an exception" */
export function handle(build?: (data: any) => any): EPR {
  return async (info, data, send) => {
    const name = `${info.module}.${info.method}`;
    trace(name, data);
    try {
      const res = build ? build(data) : null;
      if (res) {
        await send.object(res);
      } else {
        await send.success();
      }
    } catch (e) {
      enqueue(`!! handler error on ${name}: ${e}\n`);
      await send.success();
    }
  };
}
