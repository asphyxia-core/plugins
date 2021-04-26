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

    const newProfile: Profile = {
      collection: 'profile',
      jubeatId: _.random(1, 99999999),
      name: name,
      previous_version: version
    };

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
    if (!profile.knit) {
      profile.knit = {
        collabo: { completed: false, success: false },
        info: {
          acvPoint: 0,
          acvProg: 0,
          acvRouteProg: Array(4).fill(0),
          acvWool: 0,
          beatCount: 0,
          conciergeSelectedCount: 0,
          excellentCount: 0,
          excellentSeqCount: 0,
          fullcomboCount: 0,
          fullcomboSeqCount: 0,
          jubility: 0,
          jubilityYday: 0,
          matchCount: 0,
          mynewsCount: 0,
          saveCount: 0,
          savedCount: 0,
          tagCount: 0,
          tuneCount: 0
        },
        item: {
          markerList: Array(2).fill(0),
          secretList: Array(2).fill(0),
          themeList: 0,
          titleList: Array(24).fill(0)
        },
        item_new: {
          markerList: Array(2).fill(0),
          secretList: Array(2).fill(0),
          themeList: 0,
          titleList: Array(24).fill(0)
        },
        last: {
          areaname: 'NONE',
          category: 0,
          conciergeSuggestId: 0,
          filter: 0,
          marker: 0,
          mselStat: 0,
          musicId: 0,
          parts: 0,
          playTime: "0",
          seqEditId: '',
          seqId: 0,
          shopname: 'NONE',
          showCombo: 0,
          showRank: 0,
          sort: 0,
          theme: 0,
          title: 0
        }
      };
      await DB.Update(refId, { collection: "profile" }, profile);
    }
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
    return send.pugFile('templates/knit/profile.pug', {
      refId,
      migration,
      name: profile.name,
      jubeatId: profile.jubeatId, ...profile.knit
    }, { compress: true });
  }

  if (version === 4) {
    if (U.GetConfig("unlock_all_songs")) {

    }
    return send.pugFile('templates/copious/profile.pug', { refId, migration, ...profile }, { compress: false });
  }

  return send.deny();
};

export const saveProfile: EPR = async (info, { data }, send) => {
  const player = $(data).element("player");

  const refId = player.str("refid");
  if (!refId) return send.deny();

  const version = getVersion(info);
  if (version === 0) return send.deny();

  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (version === 3) {
    profile.name = player.str("name");

    const { info, last, item, item_new, collabo } = profile.knit;

    last.shopname = player.str("shopname", last.shopname);
    last.areaname = player.str("areaname", last.areaname);

    info.jubility = player.number("info.jubility", info.jubility);
    info.jubilityYday = player.number("info.jubility_yday", info.jubilityYday);
    info.acvProg = player.number("info.acv_prog", info.acvProg);
    info.acvWool = player.number("info.acv_wool", info.acvWool);
    info.acvRouteProg = player.numbers("info.acv_route_prog", info.acvRouteProg);
    info.acvPoint = player.number("info.acv_point", info.acvPoint);
    info.tuneCount = player.number("info.tune_cnt", info.tuneCount);
    info.saveCount = player.number("info.save_cnt", info.saveCount);
    info.savedCount = player.number("info.saved_cnt", info.savedCount);
    info.fullcomboCount = player.number("info.fc_cnt", info.fullcomboCount);
    info.fullcomboSeqCount = player.number("info.fc_seq_cnt", info.fullcomboSeqCount);
    info.excellentCount = player.number("info.exc_cnt", info.excellentCount);
    info.excellentSeqCount = player.number("info.exc_seq_cnt", info.excellentSeqCount);
    info.matchCount = player.number("info.match_cnt", info.matchCount);
    info.beatCount = player.number('info.beat_cnt', info.beatCount);
    info.conciergeSelectedCount = player.number('info.con_sel_cnt', info.conciergeSelectedCount);
    info.tagCount = player.number('info.tag_cnt', info.tagCount);
    info.mynewsCount = player.number('info.mynews_cnt', info.mynewsCount);

    last.conciergeSuggestId = player.number('info.con_suggest_id', last.conciergeSuggestId);
    last.playTime = String(new Date().getTime());

    if (!U.GetConfig("unlock_all_songs")) {
      item.secretList = player.numbers('item.secret_list', item.secretList);
      item.themeList = player.number('item.theme_list', item.themeList);
      item.markerList = player.numbers('item.marker_list', item.markerList);
      item.titleList = player.numbers('item.title_list', item.titleList);

      item_new.secretList = player.numbers('item.secret_new', profile.knit.item_new.secretList);
      item_new.themeList = player.number('item.theme_new', profile.knit.item_new.themeList);
      item_new.markerList = player.numbers('item.marker_new', profile.knit.item_new.markerList);
      item_new.titleList = player.numbers('item.title_new', profile.knit.item_new.titleList);
    }

    // Append
    const collaboNode = player.element("collabo");
    if (collaboNode) {
      collabo.success = collaboNode.bool("success");
      collabo.completed = collaboNode.bool("completed");
    }

    const result = $(data).element("result");
    if (result) {
      const tunes = result.elements("tune");
      for (const tune of tunes) {
        const musicId = tune.number("music", 0);
        last.musicId = musicId;
        last.seqId = parseInt(tune.attr("player.score").seq) || 0;
        last.title = tune.number("title", last.title);
        last.theme = tune.number("theme", last.theme);
        last.marker = tune.number("marker", last.marker);
        last.sort = tune.number("sort", last.sort);
        last.filter = tune.number("filter", last.filter);
        last.showRank = tune.number("combo_disp", last.showRank);
        last.showCombo = tune.number("rank_sort", last.showCombo);
        last.mselStat = tune.number("msel_stat", last.mselStat);

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
  }

  try {
    await DB.Update<Profile>(refId, { collection: "profile" }, profile);

    return send.object({ data: { player: { session_id: K.ITEM('s32', 1) } } });
  } catch {
    return send.deny();
  }
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
