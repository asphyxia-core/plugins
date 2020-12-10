import { Profile } from '../models/profile';
import { Scores } from '../models/scores';

export const newProfile: EPR = async (req, data, send) => {
  const refid = $(data).attr().refid;
  if (!refid) return send.deny();

  await writeProfile(refid, await readProfile(refid));
  send.success();
};

export const load: EPR = async (req, data, send) => {
  try{
  const refid = $(data).attr().refid;
  if (!refid) return send.deny();

  const profile = await readProfile(refid);
  const chara: any[] = [];

  if (profile.unlockAll) {
    for (let i = 0; i < 11; ++i) {
      chara.push(K.ATTR({ id: `${i}`, love: '5' }));
    }
  } else {
    for (const i in profile.charas) {
      chara.push(K.ATTR({ id: `${i}`, love: `${profile.charas[i]}` }));
    }
  }

  send.object({
    last: K.ATTR({
        chara: `${profile.history.chara}`,
        level: `${profile.history.level}`,
        music_id: `${profile.history.mid}`,
        style: `${profile.history.style}`,
    }),
    chara,
    // threshold: {
    //   '@attr': { id: 0, point: 100 },
    // },
  })
  } catch (e) { console.log(e.stack || e.stacktrace )}
};

export const load_m: EPR = async (req, data, send) => {
  const refid = $(data).attr().refid;
  if (!refid) return send.deny();

  const scores = (await readScores(refid)).scores;

  const music: any[] = [];
  for (const mid in scores) {
    const style: any[] = [];
    for (const sid in scores[mid]) {
      const level: any[] = [];
      for (const lid in scores[mid][sid]) {
        level.push(K.ATTR({
            id: lid,
            score: `${scores[mid][sid][lid].score}`,
            clear_type: `${scores[mid][sid][lid].clear}`,
          }),
        );
      }
      style.push(K.ATTR({ id: sid }, { level }));
    }
    music.push(K.ATTR({ music_id: mid }, { style }));
  }

  send.object({
    music,
  });
};

export const save_m: EPR = async (req, data, send) => {
  const refid = $(data).attr().refid;
  if (!refid) return send.deny();

  const scores = (await readScores(refid)).scores;

  const clear = parseInt($(data).attr().clear_type || '-1');
  const level = parseInt($(data).attr().level || '-1');
  const mid = parseInt($(data).attr().music_id || '-1');
  const score = parseInt($(data).attr().score || '-1');
  const style = parseInt($(data).attr().style || '-1');

  if (clear < 0 || level < 0 || mid < 0 || score < 0 || style < 0) {
    return send.success();
  }

  if (!scores[mid]) {
    scores[mid] = {};
  }

  if (!scores[mid][style]) {
    scores[mid][style] = {};
  }

  scores[mid][style][level] = {
    score: Math.max(_.get(scores[mid][style][level], 'score', 0), score),
    clear: Math.max(_.get(scores[mid][style][level], 'clear', 0), clear),
  };

  writeScores(refid, { collection: 'scores', scores });

  send.success();
};

export const save: EPR = async (req, data, send) => {
  const refid = $(data).attr().refid;
  if (!refid) return send.deny();

  const profile = await readProfile(refid);

  const chara = parseInt($(data).attr('last').chara || '-1');
  const level = parseInt($(data).attr('last').level || '-1');
  const love = parseInt($(data).attr('last').love || '-1');
  const mid = parseInt($(data).attr('last').music_id || '-1');
  const style = parseInt($(data).attr('last').style || '-1');

  if (chara < 0 || level < 0 || mid < 0 || love < 0 || style < 0) {
    return send.success();
  }

  if (!profile.unlockAll) {
    profile.charas[chara] = _.get(profile.charas, chara, 0) + love;
  }

  profile.history = {
    chara,
    mid,
    level,
    style,
  };

  await writeProfile(refid, profile);

  send.success();
};

async function readProfile(refid: string): Promise<Profile> {
    const profile = await DB.FindOne<Profile>(refid, { collection: 'profile'} )
    return profile || {
        collection: 'profile',
        unlockAll: false,
        history: { chara: 0, level: 0, mid: 0, style: 0 },
        charas: {},
      }
  }
  
  async function writeProfile(refid: string, profile: Profile) {
    await DB.Upsert<Profile>(refid, { collection: 'profile'}, profile)
  }
  
  async function readScores(refid: string): Promise<Scores> {
    const score = await DB.FindOne<Scores>(refid, { collection: 'scores'} )
    return score || { collection: 'scores', scores: {}}
  }
  
  async function writeScores(refid: string, scores: Scores) {
    await DB.Upsert<Scores>(refid, { collection: 'scores'}, scores)
  }