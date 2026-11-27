import { VersionCourse, VersionData, VersionLeague } from "../models/version_data";

const META = ["_id", "__refid", "createdAt", "updatedAt", "collection", "version"];
const strip = (doc: any) => {
  const out: Record<string, any> = {};
  for (const key of Object.keys(doc || {})) if (!META.includes(key)) out[key] = doc[key];
  return out;
};

/** A player's fields for one version (`{}` until the version saves something). */
export async function loadVersionData(refid: string, version: number): Promise<Record<string, any>> {
  return strip(await DB.FindOne<VersionData>(refid, { collection: "version_data", version }));
}

export async function saveVersionData(refid: string, version: number, fields: Record<string, any>) {
  await DB.Upsert<VersionData>(refid, { collection: "version_data", version }, { $set: strip(fields) });
}

export function versionCourses(refid: string, version: number) {
  return DB.Find<VersionCourse>(refid, { collection: "version_course", version });
}

export function findVersionCourse(refid: string, version: number, courseId: number) {
  return DB.FindOne<VersionCourse>(refid, { collection: "version_course", version, courseId });
}

export async function saveVersionCourse(refid: string, version: number, courseId: number, rating: number, scores: number[]) {
  await DB.Upsert<VersionCourse>(refid, { collection: "version_course", version, courseId }, { $set: { rating, scores } });
}

export function findLeague(refid: string, version: number, leagueId: number) {
  return DB.FindOne<VersionLeague>(refid, { collection: "version_league", version, leagueId });
}

/** Every player's result in one league, for promotions. */
export function leagueResults(version: number, leagueId: number) {
  return DB.Find<VersionLeague>(null, { collection: "version_league", version, leagueId });
}

export function playerLeagues(refid: string, version: number) {
  return DB.Find<VersionLeague>(refid, { collection: "version_league", version });
}

export async function saveLeague(refid: string, version: number, leagueId: number, score: number[], clear: number[]) {
  await DB.Upsert<VersionLeague>(refid, { collection: "version_league", version, leagueId }, { $set: { score, clear } });
}
