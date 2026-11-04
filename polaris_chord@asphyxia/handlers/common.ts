/*
 * 公共工具：常量、日志、配置读取、XRPC 节点取值辅助、路由包装。
 * 与官方插件模板一致 —— 逻辑放 handlers/，index.ts 只做注册。
 */

/* ---------- 常量 ---------- */

export const LOG_FILE = 'xrpc.log';

export const OPEN_AT = '20240101000000';
export const CLOSE_AT = '20991231235959';
// mst_event 专用：游戏端 LimitedTimeEventRepository 用 DateTime.TryParse（ISO8601）
// 解析 open_at/close_at，KONAMI 紧凑格式（20240101000000）解析失败会让事件全部被丢弃
export const ISO_OPEN = '2024-01-01T00:00:00';
export const ISO_CLOSE = '2099-12-31T23:59:59';

/* ---------- 时间 / 日志 ---------- */

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

/** 读取 WebUI 配置项（R.Config 注册的），缺失或取值异常时回退默认值 */
export function cfg<T>(key: string, fallback: T): T {
  try {
    const v = U.GetConfig(key);
    if (v === undefined || v === null || v === '') return fallback;
    return v as T;
  } catch (e) {
    return fallback;
  }
}

/** xrpc.log 的大小上限（字节）；0 = 不限制。由配置项 log_limit_kb 控制 */
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

/* ---------- ID / 节点取值 ---------- */

/** 由卡号派生稳定的 16 位十六进制 ID（与 asphyxia 的 refid/dataid 同形） */
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

/** 叶子节点形如 { '@attr': {__type}, '@content': v }，取裸值
 *
 *  注意 ea3 的 @content **永远是数组**：`<high_speed>10</high_speed>` 解析成
 *  `{"@content":[10]}`。不拆包的话 `typeof v === 'object'` 会把所有数值当对象跳过
 *  —— 这正是「音量/速度等设置每次登录都被重置」的根因。
 *  单元素数组按标量返回，多元素（如 usr_deck.deck）仍返回数组。
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

/** 重复节点会被解析成数组，这里统一成数组 */
export function list(node: any, item: string): any[] {
  const v = sub(node, item);
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/* ---------- 路由包装 ---------- */

/** 统一「记录日志 → 构造响应 → 异常兜底成功」的路由包装 */
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
