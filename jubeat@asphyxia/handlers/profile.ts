import {getVersion} from "../utils";
import Profile from '../models/profile';
import {Score} from '../models/score';

export const profile: EPR = async (info, data, send) => {
  let refId = $(data).str("data.player.pass.refid");
  if (!refId) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const name = $(data).str("data.player.name");

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    if (!name) return send.deny();

    const newProfile = new Profile();
    newProfile.jubeatId = _.random(1, 99999999);
    newProfile.name = name;
    newProfile.previous_version = version;

    await DB.Upsert<Profile>(refId, { collection: "profile" }, newProfile);

    profile = newProfile;
  }

  let migration = false;
  if (profile.previous_version < version) {
    migration = true;
    profile.name = "";
    await DB.Update<Profile>(refId, { collection: "profile" }, { $set: { name: "", previous_version: version } });
  }

  if (name) {
    profile.name = name;
    await DB.Update<Profile>(refId, { collection: "profile" }, { $set: { name } });
  }

  if (version === 3) {
    if (U.GetConfig("unlock_all_songs")) {
      profile.knit.item = {
        secretList: [-1, -1],
        themeList: -1,
        markerList: [-1, -1],
        titleList: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
      };
      profile.knit.item_new = {
        secretList: [0, 0],
        themeList: 0,
        markerList: [0, 0],
        titleList: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      };
    }
    return send.pugFile('templates/knit/profile.pug', { refId, migration, ...profile }, { compress: false });
  }

  return send.deny();
};

export const saveProfile: EPR = async (info, { data }, send) => {
  console.log(U.toXML(data));
  const player = $(data).element("player");

  const refId = player.str("refid");
  if (!refId) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (version === 3) {
    profile.name = player.str("name");

    profile.last.shopname = player.str("shopname", profile.last.shopname);
    profile.last.areaname = player.str("areaname", profile.last.areaname);

    profile.jubility = player.number("info.jubility", profile.jubility);
    profile.jubilityYday = player.number("info.jubility_yday", profile.jubilityYday);

    profile.knit.acvProg = player.number("info.acv_prog", profile.knit.acvProg);
    profile.knit.acvWool = player.number("info.acv_wool", profile.knit.acvWool);
    profile.knit.acvRouteProg = player.numbers("info.acv_route_prog", profile.knit.acvRouteProg);
    profile.knit.acvPoint = player.number("info.acv_point", profile.knit.acvPoint);

    profile.tuneCount = player.number("info.tune_cnt", profile.tuneCount);
    profile.saveCount = player.number("info.save_cnt", profile.saveCount);
    profile.savedCount = player.number("info.saved_cnt", profile.savedCount);
    profile.fullcomboCount = player.number("info.fc_cnt", profile.fullcomboCount);
    profile.fullcomboSeqCount = player.number("info.fc_seq_cnt", profile.fullcomboSeqCount);
    profile.excellentCount = player.number("info.exc_cnt", profile.excellentCount);
    profile.excellentSeqCount = player.number("info.exc_seq_cnt", profile.excellentSeqCount);
    profile.matchCount = player.number("info.match_cnt", profile.matchCount);
    profile.beatCount = player.number('info.beat_cnt', profile.beatCount);
    profile.conciergeSelectedCount = player.number('info.con_sel_cnt', profile.conciergeSelectedCount);
    profile.tagCount = player.number('info.tag_cnt', profile.tagCount);
    profile.mynewsCount = player.number('info.mynews_cnt', profile.mynewsCount);

    if (!U.GetConfig("unlock_all_songs")) {
      profile.knit.item.secretList = player.numbers('item.secret_list', profile.knit.item.secretList);
      profile.knit.item.themeList = player.number('item.theme_list', profile.knit.item.themeList);
      profile.knit.item.markerList = player.numbers('item.marker_list', profile.knit.item.markerList);
      profile.knit.item.titleList = player.numbers('item.title_list', profile.knit.item.titleList);

      profile.knit.item_new.secretList = player.numbers('item.secret_new', profile.knit.item_new.secretList);
      profile.knit.item_new.themeList = player.number('item.theme_new', profile.knit.item_new.themeList);
      profile.knit.item_new.markerList = player.numbers('item.marker_new', profile.knit.item_new.markerList);
      profile.knit.item_new.titleList = player.numbers('item.title_new', profile.knit.item_new.titleList);
    }

    profile.last.conciergeSuggestId = player.number('info.con_suggest_id', profile.last.conciergeSuggestId);
    profile.last.playTime = BigInt(new Date().getMilliseconds());

    // Append
    const collabo = player.element("collabo");
    if (collabo) {
      profile.knit.collabo.success = collabo.bool("success");
      profile.knit.collabo.completed = collabo.bool("completed");
    }

    const result = $(data).element("result");

    if (result) {
      const tunes = result.elements("tune");

      for (const tune of tunes) {
        const musicId = tune.number("music", 0);
        profile.last.musicId = musicId;
        profile.last.seqId = parseInt(tune.attr("player.score").seq) || 0;
        profile.last.title = tune.number("title", profile.last.title);
        profile.last.theme = tune.number("theme", profile.last.theme);
        profile.last.marker = tune.number("marker", profile.last.marker);
        profile.last.sort = tune.number("sort", profile.last.sort);
        profile.last.filter = tune.number("filter", profile.last.filter);
        profile.last.showRank = tune.number("combo_disp", profile.last.showRank);
        profile.last.showCombo = tune.number("rank_sort", profile.last.showCombo);
        profile.last.mselStat = tune.number("msel_stat", profile.last.mselStat);

        const score = tune.number('player.score');
        const seq = parseInt(tune.attr('player.score').seq);
        const clear = parseInt(tune.attr('player.score').clear);
        const combo = parseInt(tune.attr('player.score').combo);
        const bestScore = tune.number('player.best_score');
        const bestClear = tune.number('player.best_clear');
        const playCount = tune.number('player.play_cnt');
        const clearCount = tune.number('player.clear_cnt');
        const fullcomboCount = tune.number('player.fc_cnt');
        const excellentCount = tune.number('player.exc_cnt');
        const mbar = tune.numbers('player.mbar');

        await updateScore(refId, musicId, seq, score, clear, mbar, {
          playCount,
          clearCount,
          fullcomboCount,
          excellentCount
        });
      }
    }

    await DB.Update<Profile>(refId, { collection: "profile" }, profile);

    return send.object({ data: { player: { session_id: K.ITEM('s32', 1) } } });
  }

  return send.deny();
};

export const loadScore: EPR = async (info, data, send) => {
  const jubeatId = $(data).number("data.player.jid");
  if (!jubeatId) return send.deny();

  const profile = await DB.FindOne<Profile>(null, { collection: "profile", jubeatId });
  if (!profile) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const scores = await DB.Find<Score>(profile.__refid, { collection: "score" });
  const scoreData: { [musicId: number]: any } = {};

  for (const score of scores) {
    if (!scoreData[score.musicId]) {
      scoreData[score.musicId] = {
        playCnt: [0, 0, 0],
        clearCnt: [0, 0, 0],
        fcCnt: [0, 0, 0],
        exCnt: [0, 0, 0],
        clear: [0, 0, 0],
        score: [0, 0, 0],
        bar: [Array(30).fill(0), Array(30).fill(0), Array(30).fill(0)]
      };
    }

    const data = scoreData[score.musicId];
    data.playCnt[score.seq] = score.playCount;
    data.clearCnt[score.seq] = score.clearCount;
    data.fcCnt[score.seq] = score.fullcomboCount;
    data.exCnt[score.seq] = score.excellentCount;
    data.clear[score.seq] = score.clearType;
    data.score[score.seq] = score.score;
    data.bar[score.seq] = score.bar;
  }

  if (version === 3) return send.object({
    data: {
      player: {
        playdata: K.ATTR({ count: String(Object.keys(scoreData).length) }, {
          musicdata: (() => {
            const musicdata = [];
            Object.entries(scoreData).forEach(([k, v]) => {
              musicdata.push(K.ATTR({ music_id: String(k) }, {
                play_cnt: K.ARRAY('s32', v.playCnt),
                clear_cnt: K.ARRAY('s32', v.clearCnt),
                fc_cnt: K.ARRAY('s32', v.fcCnt),
                ex_cnt: K.ARRAY('s32', v.exCnt),
                clear: K.ARRAY('s8', v.clear),
                score: K.ARRAY('s32', v.score),
                bar: v.bar.map((v, i) => K.ARRAY('u8', v, { seq: String(i) }))
              }));
            });
            return musicdata;
          })()
        })
      }
    }
  });

  return send.deny();
};

const updateScore = async (refId: string, musicId: number, seq: number, score: number, clear: number, mbar: number[], data: any) => {
  let raised;

  const oldScore = await DB.FindOne<Score>(refId, { collection: "score", musicId, seq });

  let scoreData = oldScore;

  if (!oldScore) {
    scoreData = new Score();
    scoreData.musicId = musicId;
    scoreData.seq = seq;
    raised = true;
  } else {
    raised = score > oldScore.score;
    score = Math.max(oldScore.score, score);
  }

  scoreData.clearType = Math.max(scoreData.clearType, clear);
  scoreData.playCount = data.playCount;
  scoreData.clearCount = data.clearCount;
  scoreData.fullcomboCount = data.fullcomboCount;
  scoreData.excellentCount = data.excellentCount;
  scoreData.isHardmodeClear = false;

  if (mbar && raised) {
    scoreData.score = score;
    scoreData.bar = mbar;
  }

  await DB.Upsert(refId, { collection: "score", musicId, seq }, scoreData);
};

export const meeting: EPR = (info, data, send) => {
  return send.object({
    data: {
      meeting: {
        single: K.ATTR({ count: '0' }),
        tag: K.ATTR({ count: '0' }),
      },
      reward: {
        total: K.ITEM('s32', 0),
        point: K.ITEM('s32', 0)
      }
    }
  });
};

export const getCollabo: EPR = (info, data, send) => send.object({
  data: {
    collabo: {
      played: {
        iidx: K.ITEM("s8", 1),
        popn: K.ITEM("s8", 1),
        ddr: K.ITEM("s8", 1),
        reflec: K.ITEM("s8", 1),
        gfdm: K.ITEM("s8", 1),
      }
    }
  }
});
