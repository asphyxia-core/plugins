import Profile from "../models/profile";
import { mergeRecord } from "./scores";
import { loadVersionData, saveVersionData } from "./version_data";

/** The player's shared profile (jubeat ID, name), after moving any old Qubell save over. */
export async function findPlayer(refid: string): Promise<Profile | null> {
  await migrateQubell(refid);
  return DB.FindOne<Profile>(refid, { collection: "profile" });
}

export function playerByJid(jid: number) {
  return DB.FindOne<Profile>(null, { collection: "profile", jubeatId: jid });
}

/** An unused 8-digit jubeat ID. */
export async function newJubeatId(): Promise<number> {
  for (let i = 0; i < 20; i++) {
    const jid = 10000000 + Math.floor(Math.random() * 89999999);
    if (!(await playerByJid(jid))) return jid;
  }
  return 10000000 + Math.floor(Math.random() * 89999999);
}

/** Creates the shared profile, in the shape festo loads. */
export async function createPlayer(refid: string, name: string, jubeatId?: number): Promise<Profile> {
  const profile: Profile = {
    collection: "profile",
    jubeatId: jubeatId || await newJubeatId(),
    eventFlag: 0,
    name,
    isFirstplay: true,
    emo: [],
    lastShopname: "",
    lastAreaname: "",
  };
  await DB.Upsert<Profile>(refid, { collection: "profile" }, profile);
  return DB.FindOne<Profile>(refid, { collection: "profile" });
}

/**
 * The player's profile, created when missing. Versions before festo use this
 * in get_pdata too: CORE already reports a card as registered for L44 once any
 * version made a profile for it, so the game skips gametop.regist.
 */
export async function loadPlayer(refid: string, name?: string): Promise<Profile> {
  return (await findPlayer(refid)) || createPlayer(refid, name || "なし");
}

// ---------------------------------------------------------------------------------------------
// Qubell saves from plugin v2.1.0 (qubell_profile / qubell_score)
// ---------------------------------------------------------------------------------------------

const QUBELL = 8;

/**
 * Moves a v2.1.0 Qubell save into the shared profile, Qubell's version data
 * and the shared scores, once. The old documents are kept, marked `migrated`.
 */
async function migrateQubell(refid: string) {
  const old: any = await DB.FindOne<any>(refid, { collection: "qubell_profile" });
  if (!old || old.migrated) return;

  if (!(await DB.FindOne<Profile>(refid, { collection: "profile" }))) {
    const taken = old.jid && await playerByJid(old.jid);
    await createPlayer(refid, old.name || "なし", taken ? undefined : old.jid);
  }

  if (Object.keys(await loadVersionData(refid, QUBELL)).length === 0) {
    const { _id, __refid, createdAt, updatedAt, collection, jid, name, migrated, ...fields } = old;
    await saveVersionData(refid, QUBELL, fields);
  }

  let scores = 0;
  for (const s of await DB.Find<any>(refid, { collection: "qubell_score" })) {
    await mergeRecord(refid, {
      musicId: s.musicId, seq: s.seq, score: s.score, clear: s.clear, bar: s.bar,
      playCount: s.playCnt, clearCount: s.clearCnt, fullcomboCount: s.fcCnt, excellentCount: s.exCnt,
    });
    scores++;
  }

  await DB.Update<any>(refid, { collection: "qubell_profile" }, { $set: { migrated: true } } as any);
  console.log(`[jubeat] moved Qubell save of ${old.name} (${scores} records) to the shared profile`);
}
