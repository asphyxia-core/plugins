/// <reference types="node" />

declare type KNumberType =
  | 's8'
  | 'u8'
  | 's16'
  | 'u16'
  | 's32'
  | 'u32'
  | 'time'
  | 'ip4'
  | 'float'
  | 'double'
  | 'bool';
declare type KBigIntType = 's64' | 'u64';
declare type KNumberGroupType =
  | '2s8'
  | '2u8'
  | '2s16'
  | '2u16'
  | '2s32'
  | '2u32'
  | '2f'
  | '2d'
  | '3s8'
  | '3u8'
  | '3s16'
  | '3u16'
  | '3s32'
  | '3u32'
  | '3f'
  | '3d'
  | '4s8'
  | '4u8'
  | '4s16'
  | '4u16'
  | '4s32'
  | '4u32'
  | '4f'
  | '4d'
  | '2b'
  | '3b'
  | '4b'
  | 'vb';
declare type KBigIntGroupType =
  | '2s64'
  | '2u64'
  | '3s64'
  | '3u64'
  | '4s64'
  | '4u64'
  | 'vs8'
  | 'vu8'
  | 'vs16'
  | 'vu16';

/**
 * Attribute object
 */
declare type KAttrMap = { [key: string]: string };

/**
 * Supported response encoding
 */
declare type KEncoding =
  | 'shift_jis'
  | 'utf8'
  | 'euc-jp'
  | 'ascii'
  | 'iso-8859-1';

/**
 * Information about requester
 */
declare interface EamuseInfo {
  module: string;
  method: string;
  model: string;
}

/**
 * Detail of a config
 */
declare interface ConfigOption {
  /** Provide a name to display in webui. If not provided, webui will use key as the name. */
  name?: string;
  /** Provide a description for the option */
  desc?: string;
  /** Type of the option */
  type: 'string' | 'integer' | 'float' | 'boolean';
  /** Only applies to 'integer' and 'float' */
  range?: [number, number];
  /** Validator for notify user about invalid values. return `true` to pass the validation. return a string to send a error message to WebUI. */
  validator?: (data: string) => true | string;
  /** Only applies to 'string', provide options in a dropdown menu. */
  options?: string[];
  /** Indicate whether user need to restart CORE to see changes. */
  needRestart?: boolean;
  /** Default value of the option */
  default: any;
}

/**
 * Response options
 */
declare interface EamuseSendOption {
  status?: number;

  /**
   * Encode response with specified encoding
   * Default: 'SHIFT_JIS'
   */
  encoding?: KEncoding;

  /**
   * Replace response root tag name.
   * Default to child tag name of request <call> tag,
   * which is usually the case and don't need to be replaced.
   */
  rootName?: string;

  compress?: boolean;
  kencode?: boolean;
  encrypt?: boolean;
}

declare interface EamuseSend {
  /**
   * Send empty response with status code 0
   */
  success: (options?: EamuseSendOption) => Promise<void>;

  /**
   * Send empty response with status code 1
   */
  deny: (options?: EamuseSendOption) => Promise<void>;

  /**
   * Send empty response with custom status code
   */
  status: (code: number, options?: EamuseSendOption) => Promise<void>;

  /**
   * Send plain javascript object.
   * When constructing objects, make sure to use helper [[K]]:
   * ```
   * {
   *   outter: K.ATTR({ status: "1" }, {
   *     inner: K.ITEM("s32", 1)
   *   })
   * }
   * ```
   *
   * Or follow xml-like format manually:
   * ```
   * {
   *   outter: {
   *     "@attr": { status: "1" },
   *     inner: {
   *       "@attr": { __type: "s32" },
   *       "@content": [1]
   *     }
   *   }
   * }
   * ```
   * @param res      xml-like formatted javascript object
   * @param options  Response options. See: [[EamuseSendOption]]
   */
  object: (res: any, options?: EamuseSendOption) => Promise<void>;

  /**
   * Send xml data using ejs template system.
   *
   * @param res      xml string as the template
   * @param data     Render template with specified data,
   *                 pass null or undefined to render static xml
   * @param options  Response options. See: [[EamuseSendOption]]
   */
  xml: (res: string, data?: any, options?: EamuseSendOption) => Promise<void>;

  /**
   * Send xml data using pug template system.
   *
   * @param res      pug string as the template
   * @param data     Render template with specified data,
   *                 pass null or undefined to render static xml
   * @param options  Response options. See: [[EamuseSendOption]]
   */
  pug: (res: string, data?: any, options?: EamuseSendOption) => Promise<void>;

  /**
   * Render and send ejs template from a file
   *
   * @param file     Filename of the template
   * @param data     Render template with specified data,
   *                 pass null or undefined to render static xml
   * @param options  Response options. See: [[EamuseSendOption]]
   */
  xmlFile: (
    file: string,
    data?: any,
    options?: EamuseSendOption
  ) => Promise<void>;

  /**
   * Render and send pug template from a file
   *
   * @param file     Filename of the template
   * @param data     Render template with specified data,
   *                 pass null or undefined to render static xml
   * @param options  Response options. See: [[EamuseSendOption]]
   */
  pugFile: (
    file: string,
    data?: any,
    options?: EamuseSendOption
  ) => Promise<void>;
}

/**
 * Helper type for typing your custom route.
 */
declare type EamusePluginRoute = (
  req: EamuseInfo,
  data: any,
  send: EamuseSend
) => Promise<any>;

/**
 * Helper type for typing your custom route.
 *
 * Alias for [[EamusePluginRoute]]
 */
declare type EPR = EamusePluginRoute;

/**
 * R stands for `Register`
 *
 * These functions can only be called in plugins' `register()` function.
 */
declare namespace R {
  /**
   * Register your custom route.
   *
   * You should only call this from your plugin's `register()` function.
   *
   * @param method    Method name of your target route,
   *                  usually looks like `"module.get"`
   * @param handler   Your custom route function/method following the type [[EamusePluginRoute]].
   *                  A boolean can be passed if you don't need any processing:
   *                    - `true`: Sending empty response with status code 0
   *                    - `false`: Sending empty response with status code 1
   */
  function Route(method: string, handler: EamusePluginRoute | boolean): void;

  /**
   * Register all unhandled routes for a game.
   *
   * You should only call this from your plugin's `register()` function.
   *
   * @param handler   Your custom route function/method following the type [[EamusePluginRoute]].
   *                  If undefined, the router will apply a default handler that prints method names.
   */
  function Unhandled(handler?: EamusePluginRoute): void;

  /**
   * Register a target game code to your plugin for checking savedata.
   *
   * You should only call this from your plugin's `register()` function.
   *
   * @param code  Model code of your target machine,
   *                  usually __three capital letters__
   *
   */
  function GameCode(code: string): void;

  /**
   * Register a contributor.
   *
   * Contributors will show up in WebUI.
   *
   * @param name Contributor's name
   * @param link Contributor's homepage
   */
  function Contributor(name: string, link?: string): void;

  /**
   * Register a configuration option.
   *
   * @param key config key
   * @param options See [[ConfigOption]]
   *
   * __NOTE__: `options.validator` will only notify user about invalid value. It wouldn't stop user from saving invalid value.
   */
  function Config(key: string, options: ConfigOption): void;

  /**
   * Register a WebUI event callback
   *
   * Which can be called in WebUI using `emit(event)` function or a post message to `/emit/<event>`
   *
   * Callback can be async function if you want to use await for your DB operations.
   */
  function WebUIEvent(
    event: string,
    callback: (data: any) => void | Promise<void>
  ): void;
}

/**
 * A warpper of javascript object for reading xml-like formatted data.
 */
declare class KDataReader {
  /**
   * Wrapped javascript object
   */
  public obj: any;
  constructor(obj: any);

  /**
   * Get attrubutes for a tag
   *
   * Example:
   * ```xml
   * <data>
   *   <tag status="1">
   *     <inner __type="s32">1</inner>
   *     <inner __type="s32">2</inner>
   *   </tag>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   tag: K.ATTR({ status: "1" }, {
   *     inner: [
   *       K.ITEM("s32", 1),
   *       K.ITEM("s32", 2)
   *     ]
   *   })
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).attr("tag") // { status: "1" }
   * $(data).element("tag").attr().status // "1"
   * $(data).attr("tag.inner.0").__type // "s32"
   * ```
   */
  attr(path?: string): KAttrMap;

  /**
   * Get a bigint value from a tag, convert to bigint if applicable.
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="s64">1</inner>
   *   <inner __type="s32">2</inner>
   *   <invalid __type="str">abc</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: [
   *     K.ITEM("s64", 1n),
   *     K.ITEM("s32", 2)
   *   ],
   *   invalid: K.ITEM("str", "abc")
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).element("inner").bigint() // 1n
   * $(data).bigint("inner.1") // 2n
   * $(data).bigint("invalid", 3n) // 3n
   * ```
   *
   * @param def Default return value when target path does
   *            not exists or is not valid.
   */
  bigint(path: string, def?: bigint): bigint;

  /**
   * Get a bigint array from a tag. Only returns valid arrays
   * when target tag has a type of [[KBigIntType]] or [[KBigIntGroupType]]
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="s64" __count="2">1 2</inner>
   *   <invalid __type="s32" __count="2">3 4</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: K.ARRAY("s64", [1n, 2n]),
   *   invalid: K.ARRAY("s32", [3, 4])
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).bigints("inner") // [1n, 2n]
   * $(data).bigints("invalid") // undefined
   * ```
   */
  bigints(path: string, def?: bigint[]): bigint[];

  /**
   * Get a boolean value from a tag, return true only if value in the tag is number and **greater than zero**
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="bool">0</inner>
   *   <inner __type="s32">2</inner>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: [
   *     K.ITEM("bool", false),
   *     K.ITEM("s32", 2)
   *   ]
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).bool("inner.0") // false
   * $(data).bool("inner.1") // true
   * $(data).bool("invalid") // false
   * ```
   */
  bool(path: string): boolean;

  /**
   * Get a Buffer object from a tag, Only returns valid Buffer
   * when target tag has a type of "bin"
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="bin">00ff</inner>
   *   <invalid __type="u8" __count="3">1 2 3</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: K.ITEM("bin", Buffer.from([0x00, 0xff])),
   *   invalid: K.ARRAY("u8", [1, 2, 3])
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).buffer("inner") // <Buffer 00 ff>
   * $(data).buffer("invalid") // undefined
   * ```
   */
  buffer(path: string, def?: Buffer): Buffer;

  /**
   * Get raw content representation regardless of tag type
   *
   * Example:
   * ```xml
   * <data>
   *   <number __type="s32">1</number>
   *   <array __type="u8" __count="3">1 2 3</array>
   *   <string __type="str">abc</string>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   number: K.ITEM("s32", 1),
   *   array: K.ARRAY("u8", [1, 2, 3]),
   *   string: K.ITEM("str", "abc")
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).content("number") // [1]
   * $(data).content("array") // [1, 2, 3]
   * $(data).content("string") // "abc"
   * ```
   */
  content(path: string, def?: any): any;

  /**
   * Get first element named **path** inside a tag
   *
   * Example:
   * ```xml
   * <data>
   *   <inner>
   *     <id __type="s32">1</id>
   *   </inner>
   *   <inner>
   *     <id __type="s32">1</id>
   *   </inner>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: [
   *     { id: K.ITEM("s32", 1) },
   *     { id: K.ITEM("s32", 2) }
   *   ]
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).element("inner") // <KDataReader>
   * $(data).element("inner").obj // { id: [object] }
   * $(data).element("inner").number("id") // 1
   * ```
   */
  element(path: string): KDataReader;

  /**
   * Get array of all elements named **path** inside a tag
   *
   * Example:
   * ```xml
   * <data>
   *   <inner>
   *     <id __type="s32">1</id>
   *   </inner>
   *   <inner>
   *     <id __type="s32">1</id>
   *   </inner>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: [
   *     { id: K.ITEM("s32", 1) },
   *     { id: K.ITEM("s32", 2) }
   *   ]
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).elements("inner") // [<KDataReader>, <KDataReader>]
   * $(data).elements("inner")[1].number("id") // 2
   * ```
   */
  elements(path: string): KDataReader[];

  /**
   * Get a number value from a tag, convert to number if applicable.
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="s64">1</inner>
   *   <inner __type="s32">2</inner>
   *   <invalid __type="str">abc</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: [
   *     K.ITEM("s64", 1n),
   *     K.ITEM("s32", 2)
   *   ],
   *   invalid: K.ITEM("str", "abc")
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).element("inner").number() // 1
   * $(data).number("inner.1") // 2
   * $(data).number("invalid", 3) // 3
   * ```
   *
   * @param def Default return value when target path does
   *            not exists or is not valid.
   */
  number(path: string, def?: number): number;

  /**
   * Get a number array from a tag. Only returns valid arrays
   * when target tag has a type of [[KNumberType]] or [[KNumberGroupType]]
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="s64" __count="2">1 2</inner>
   *   <invalid __type="s32" __count="2">3 4</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   invalid: K.ARRAY("s64", [1n, 2n]),
   *   inner: K.ARRAY("s32", [3, 4])
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).bigints("invalid") // undefined
   * $(data).bigints("inner") // [3, 4]
   * ```
   */
  numbers(path: string, def?: number[]): number[];

  /**
   * Get a string from a tag, Only returns valid string
   * when target tag has a type of "str"
   *
   * Example:
   * ```xml
   * <data>
   *   <inner __type="str">abc</inner>
   *   <invalid __type="s32">1</invalid>
   * </data>
   * ```
   * ```javascript
   * const data = {
   *   inner: K.ITEM("str", "abc"),
   *   invalid: K.ITEM("s32", 1)
   * }
   * ```
   *
   * Evals:
   * ```javascript
   * $(data).str("inner") // "abc"
   * $(data).str("invalid") // undefined
   * ```
   */
  str(path: string, def?: string): string;
}

/**
 * Helper for reading xml-like formatted data.
 */
declare function $(data: any): KDataReader;
declare namespace $ {
  function ATTR(data: any, path?: string): KAttrMap;
  function BIGINT(data: any, path: string, def?: bigint): bigint;
  function BIGINTS(data: any, path: string, def?: bigint[]): bigint[];
  function BOOL(data: any, path: string): boolean;
  function BUFFER(data: any, path: string, def?: Buffer): Buffer;
  function CONTENT(data: any, path: string, def?: any): any;
  function ELEMENT(data: any, path: string, def?: any): any;
  function ELEMENTS(data: any, path: string, def?: any): any;
  function NUMBER(data: any, path: string, def?: number): number;
  function NUMBERS(data: any, path: string, def?: number[]): number[];
  function STR(data: any, path: string, def?: string): string;
}

/**
 * K stands for `Konstruct`
 *
 * Helper for constructing xml-like javascript object.
 */
declare namespace K {
  /**
   * Example:
   * ```
   * {
   *   tag: K.ATTR({attr: "1"}, {
   *     inner: [{}, {}]
   *   })
   * }
   * ```
   * Represents:
   * ```
   * <tag attr="1">
   *   <inner/>
   *   <inner/>
   * </tag>
   * ```
   * @param attr  Attribute map
   * @param inner Inner tag/data
   */
  function ATTR(attr: KAttrMap, inner?: any): any;

  /**
   * Example:
   * ```
   * {
   *   tag: K.ITEM('s32', 1, {attr: "2"})
   * }
   * ```
   * Represents:
   * ```
   * <tag __type="s32" attr="2">1</tag>
   * ```
   * @param type    ____type__ attribute, which is used during encoding and compression
   * @param content data of specified type
   * @param attr    attribute map in addition to **__type**
   */
  function ITEM(type: 'str', content: string, attr?: KAttrMap): any;
  function ITEM(type: 'bin', content: Buffer, attr?: KAttrMap): any;
  function ITEM(type: 'ip4', content: string, attr?: KAttrMap): any;
  function ITEM(type: 'bool', content: boolean, attr?: KAttrMap): any;
  function ITEM(type: KNumberType, content: number, attr?: KAttrMap): any;
  function ITEM(type: KBigIntType, content: bigint, attr?: KAttrMap): any;
  function ITEM(
    type: KNumberGroupType,
    content: number[],
    attr?: KAttrMap
  ): any;
  function ITEM(
    type: KBigIntGroupType,
    content: bigint[],
    attr?: KAttrMap
  ): any;

  /**
   * Example:
   * ```
   * {
   *   tag: K.ARRAY('s32', [1, 2, 3], {attr: "4"})
   * }
   * ```
   * Represents:
   * ```
   * <tag __type="s32" __count="3" attr="2">1 2 3</tag>
   * ```
   * @param type    ____type__ attribute, which is used during encoding and compression
   * @param content array of data, ____count__ attribute will be automatically set to `content.length`
   * @param attr    attribute map in addition to **__type** and **__count**
   */
  function ARRAY(type: 'u8' | 's8', content: Buffer, attr?: KAttrMap): any;
  function ARRAY(type: KNumberType, content: number[], attr?: KAttrMap): any;
  function ARRAY(type: KBigIntType, content: bigint[], attr?: KAttrMap): any;
}

/**
 * Filesystem IO
 *
 * These are designed to match nodejs `fs` module. Along with custom filesystem implementation for reading compressed data.
 *
 * __DO NOT__ use IO for savedata. Please use [[DB]] namespace so your data can be managed by WebUI.
 *
 * Also, due to difference between operating systems, you should always prepare your files using ascii path.
 * Both UTF-8 and local encodings will have cross-platform compatibility issues.
 */
declare namespace IO {
  /**
   * Resolve a relative path starting from your plugin directory to an absolute path.
   */
  function Resolve(path: string): string;

  /**
   * Asynchronously read a directory.
   * @param path A path to a directory.
   */
  function ReadDir(
    path: string
  ): Promise<{ name: string; type: 'file' | 'dir' | 'unsupported' }[]>;

  /**
   * Asynchronously writes data to a file, replacing the file if it already exists.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
   * @param options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
   * If `encoding` is not supplied, the default of `'utf8'` is used.
   * If `mode` is not supplied, the default of `0o666` is used.
   * If `mode` is a string, it is parsed as an octal integer.
   * If `flag` is not supplied, the default of `'w'` is used.
   */
  function WriteFile(
    path: string,
    data: any,
    options:
      | { encoding?: string | null; mode?: number | string; flag?: string }
      | string
      | null
  ): Promise<void>;

  /**
   * Asynchronously writes data to a file, replacing the file if it already exists.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param data The data to write. If something other than a Buffer or Uint8Array is provided, the value is coerced to a string.
   */
  function WriteFile(path: string, data: any): Promise<void>;

  /**
   * Asynchronously reads the entire contents of a file.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options An object that may contain an optional flag.
   * If a flag is not provided, it defaults to `'r'`.
   */
  function ReadFile(
    path: string,
    options: { encoding?: null; flag?: string } | undefined | null
  ): Promise<Buffer>;

  /**
   * Asynchronously reads the entire contents of a file.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
   * If a flag is not provided, it defaults to `'r'`.
   */
  function ReadFile(
    path: string,
    options: { encoding: string; flag?: string } | string
  ): Promise<string>;

  /**
   * Asynchronously reads the entire contents of a file.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   * @param options Either the encoding for the result, or an object that contains the encoding and an optional flag.
   * If a flag is not provided, it defaults to `'r'`.
   */
  function ReadFile(
    path: string,
    options:
      | { encoding?: string | null; flag?: string }
      | string
      | undefined
      | null
  ): Promise<string | Buffer>;

  /**
   * Asynchronously reads the entire contents of a file.
   * @param path A path to a file.
   * If a file descriptor is provided, the underlying file will _not_ be closed automatically.
   */
  function ReadFile(path: string): Promise<Buffer>;
}

/**
 * U stands for `Utilities`
 *
 * You can find miscellaneous helpers here
 */
declare namespace U {
  /**
   * Convert json data to xml string.
   *
   * @param data xml-like javascript object
   */
  function toXML(data: any): string;

  /**
   * Convert xml string to javascript object. Output will always be plain javascript string.
   *
   * @param xml xml string
   * @param simplify if true, the parser will ignore attributes and only generate string values. (default: true)
   */
  function parseXML(xml: string, simplify?: boolean): any;

  /**
   * Get config from user configuration file.
   * @param key
   */
  function GetConfig(key: string): any;
}

/** @ignore */
type Doc<T> = { _id?: string } & T;
/** @ignore */
type Query<T> = {
  [P in keyof T]?:
    | T[P]
    | (T[P] extends Array<infer E>
        ? { $elemMatch: Query<E[]> } | { $size: number }
        : T[P] extends number | string
        ?
            | { $lt: T[P] }
            | { $lte: T[P] }
            | { $gt: T[P] }
            | { $gte: T[P] }
            | { $in: T[P][] }
            | { $ne: any }
            | { $nin: any[] }
            | { $exists: boolean }
            | { $regex: RegExp }
        : T[P] extends object
        ? Query<T[P]>
        : T[P]);
} & {
  $or?: Query<T>[];
  $and?: Query<T>[];
  $not?: Query<T>;
  $where?: (this: T) => boolean;
  _id?: string;
  [path: string]: any;
};
/** @ignore */
type Operators =
  | '$exists'
  | '$lt'
  | '$lte'
  | '$gt'
  | '$gte'
  | '$in'
  | '$ne'
  | '$nin'
  | '$regex';
/** @ignore */
type PickyOperator<T, C, F> = Pick<
  {
    [P in keyof T]?: T[P] extends C ? F : Omit<T[P], Operators>;
  },
  {
    [P in keyof T]: T[P] extends C ? P : never;
  }[keyof T]
>;
/** @ignore */
type ArrayPushOperator<T> = Pick<
  {
    [P in keyof T]?: T[P] extends Array<infer E>
      ? E | { $each?: E[]; $slice?: number }
      : never;
  },
  { [P in keyof T]: T[P] extends Array<any> ? P : never }[keyof T]
> & { [path: string]: any | { $each?: any[]; $slice?: number } };
/** @ignore */
type ArraySetOperator<T> = Pick<
  {
    [P in keyof T]?: T[P] extends Array<infer E> ? E | { $each: E[] } : never;
  },
  { [P in keyof T]: T[P] extends Array<any> ? P : never }[keyof T]
> & { [path: string]: any | { $each: any[] } };
/** @ignore */
type ArrayInOperator<T> = Pick<
  {
    [P in keyof T]?: T[P] extends Array<infer E> ? E | { $in: E[] } : never;
  },
  { [P in keyof T]: T[P] extends Array<any> ? P : never }[keyof T]
> & { [path: string]: any | { $in: any[] } };
/** @ignore */
type ArrayPopOperator<T> = Pick<
  {
    [P in keyof T]?: T[P] extends Array<any> ? -1 | 1 : never;
  },
  { [P in keyof T]: T[P] extends Array<any> ? P : never }[keyof T]
> & { [path: string]: -1 | 1 };
/** @ignore */
type Update<T> = Partial<T> & {
  $unset?: PickyOperator<T, number, true> & { [path: string]: true };
  $set?: { [P in keyof T]?: Omit<T[P], Operators> } & { [path: string]: any };
  $min?: PickyOperator<T, number, number> & { [path: string]: number };
  $max?: PickyOperator<T, number, number> & { [path: string]: number };
  $inc?: PickyOperator<T, number, number> & { [path: string]: number };
  $push?: ArrayPushOperator<T>;
  $addToSet?: ArraySetOperator<T>;
  $pop?: ArrayPopOperator<T>;
  $pull?: ArrayInOperator<T>;
} & {
  [path: string]: any;
};

/**
 * Database operation.
 *
 * There are two pools of data for each plugin: ___PluginSpace___ and __ProfileSpace__
 *
 * If `refid` is a string, query will match a specific profile data in __ProfileSpace__.
 *
 * If `refid` is null, query will match all profile data in __ProfileSpace__.
 *   (doesn't apply to [[DB.Insert]])
 *
 * If `refid` is not provided, query will match data in ___PluginSpace___.
 *
 * ---
 *
 * **NOTE**: since WebUI can delete data in __ProfileSpace__,
 * you should refrain from referencing refid in your document to prevent getting unclearable garbage data.
 *
 * If you need to make rival/friend feature, we recommend you to get all profile data by passing null to `refid`.
 * There will be 16 profiles maximum which is small enough to manage.
 */
declare namespace DB {
  function FindOne<T>(refid: string | null, query: Query<T>): Promise<Doc<T>>;
  function FindOne<T>(query: Query<T>): Promise<Doc<T>>;

  function Find<T>(refid: string | null, query: Query<T>): Promise<Doc<T>[]>;
  function Find<T>(query: Query<T>): Promise<Doc<T>[]>;

  function Insert<T>(refid: string, doc: T): Promise<Doc<T>>;
  function Insert<T>(doc: T): Promise<Doc<T>>;

  function Remove<T>(refid: string | null, query: Query<T>): Promise<number>;
  function Remove<T>(query: Query<T>): Promise<number>;

  function Update<T>(
    refid: string | null,
    query: Query<T>,
    update: Update<T>
  ): Promise<{
    updated: number;
    docs: Doc<T>[];
  }>;
  function Update<T>(
    query: Query<T>,
    update: Update<T>
  ): Promise<{
    updated: number;
    docs: Doc<T>[];
  }>;

  function Upsert<T>(
    refid: string | null,
    query: Query<T>,
    update: Update<T>
  ): Promise<{
    updated: number;
    docs: Doc<T>[];
    upsert: boolean;
  }>;
  function Upsert<T>(
    query: Query<T>,
    update: Update<T>
  ): Promise<{
    updated: number;
    docs: Doc<T>[];
    upsert: boolean;
  }>;

  function Count<T>(refid: string | null, query: Query<T>): Promise<number>;
  function Count<T>(query: Query<T>): Promise<number>;
}

/** @ignore */
declare namespace _ {}
/** @ignore */
declare const _: any;
/// <reference types="lodash" />
