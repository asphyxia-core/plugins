/**
 * Identity of a supported game version.
 *
 * Every jubeat version calls the same method names (`gametop.get_pdata`, ...),
 * so the version is picked from the date in the model string
 * (`L44:J:A:A:2015100000`) instead of from the method name.
 */
export interface VersionInfo {
  /**
   * The game's number in the series (7 prop, 8 Qubell, 9 clan, 10 festo).
   * Also the key of per-version records, and the first digits of the music
   * ids the version added.
   */
  readonly id: number;
  /** Display name. */
  readonly name: string;
  /** First model date the version answers (inclusive). */
  readonly from: number;
  /** First model date it no longer answers (exclusive). */
  readonly until: number;
  /**
   * Highest music id the version can have. Records are shared by all
   * versions; songs added later are not sent. Undefined: no limit.
   */
  readonly maxMusicId?: number;
}

export interface GameVersion extends VersionInfo {
  /** Handlers by full method name (`gametop.get_pdata`). */
  readonly routes: Readonly<Record<string, EamusePluginRoute | boolean>>;
}
