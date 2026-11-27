/**
 * Per-version player data for versions before festo.
 *
 * The shared `profile` keeps the jubeat ID and name (and festo's own fields);
 * anything an older version defines its own way lives here, keyed by version
 * id, so other versions never receive it.
 */
export interface VersionData {
  collection: "version_data";
  version: number;
  [field: string]: any;
}

/** A course result in one version (prop's course mode). */
export interface VersionCourse {
  collection: "version_course";
  version: number;
  courseId: number;
  /** The game's rating: 1 failed, 2 bronze, 3 silver, 4 gold. */
  rating: number;
  scores: number[];
}

/** A player's result in one weekly league (prop). */
export interface VersionLeague {
  collection: "version_league";
  version: number;
  leagueId: number;
  score: number[];
  clear: number[];
}
