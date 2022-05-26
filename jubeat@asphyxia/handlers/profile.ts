import { getVersion } from '../utils';
import Profile from '../models/profile';
import { Score } from '../models/score';

export const profile: { regist: EPR; get: EPR; meeting: EPR; save: EPR } = {
  regist: async (info, data, send) => {
    const version = getVersion(info);
    const refId = $(data).str('data.player.pass.refid');
    const newName = $(data).str('data.player.name', 'JUBEAT');

    if (version <= 0) return send.deny();
    if (!refId || !newName) return send.deny();

    let profile = await DB.FindOne<Profile>(refId, { collection: 'profile' });

    if (profile) return send.deny();

    await DB.Insert<Profile>(refId, {
      collection: 'profile',
      jid: _.random(1, 99999999),
      name: newName.toUpperCase(),
    });

    profile = await DB.FindOne<Profile>(refId, { collection: 'profile' });

    if (version === 2)
      return send.pugFile('templates/profile/ripples.pug', {
        profile,
        scores: [],
      });
  },
  get: async (info, data, send) => {
    const version = getVersion(info);
    const refId = $(data).str('data.player.pass.refid');

    if (version <= 0) return send.deny();
    if (!refId) return send.deny();

    const profile = await DB.FindOne<Profile>(refId, { collection: 'profile' });

    if (!profile) return send.deny();

    const playerScores = await DB.Find<Score>(refId, { collection: 'score' });
    const scores = {};

    console.dir(playerScores, { depth: null });

    playerScores.map(v => {
      if (!scores[v.musicId]) scores[v.musicId] = [{}, {}, {}];

      scores[v.musicId][v.seqId] = {
        score: v.score,
        clearFlag: v.clearFlag,
        mbar: v.musicBar,
      };
    });

    console.dir(scores, { depth: null });

    if (version === 2)
      return send.pugFile('templates/profile/ripples.pug', { profile, scores });
  },
  meeting: async (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    if (version === 2)
      return send.object({
        data: {
          entryinfo: K.ATTR(
            { count: '0' },
            {
              meeting: [],
            }
          ),
          holdinfo: {
            meeting: [],
          },
          reward: {
            total: K.ITEM('s32', 0),
            point: K.ITEM('s32', 0),
          },
        },
      });
  },
  save: async (info, data, send) => {
    const version = getVersion(info);
    if (version <= 0) return send.deny();

    const retry = $(data).number('retry', 0);
    if (retry > 0) return send.deny();

    const refId = $(data).str('data.player.refid');
    if (!refId) return send.deny();

    const profile = await DB.FindOne<Profile>(refId, { collection: 'profile' });
    if (!profile) return send.deny();

    if (version === 2) {
      let lastMusicId: number;
      let lastSeqId: number;
      let lastUsedMarker: number;
      let lastUsedTheme: number;
      let lastUsedTitle: number;
      let lastUsedSort: number;
      let lastUsedFilter: number;
      let lastShowRankSort: number;
      let lastComboDisp: number;

      const tunes = $(data).elements('data.result.tune');

      for (let i = 0; i < tunes.length; i++) {
        const musicId = tunes[i].number('music');
        const seqId = Number(tunes[i].attr('music')?.seq);
        const marker = tunes[i].number('marker');
        const theme = tunes[i].number('theme');
        const title = tunes[i].number('title');
        const sort = tunes[i].number('sort');
        const filter = tunes[i].number('filter');
        const rankSort = tunes[i].number('rank_sort');
        const comboDisp = tunes[i].number('combo_disp');
        const score = tunes[i].number('player.score');
        const clearFlag = Number(tunes[i].attr('player.score')?.clear);
        const maxCombo = Number(tunes[i].attr('player.score')?.combo);
        const mbar = tunes[i].numbers('player.mbar');

        lastMusicId = musicId;
        lastSeqId = seqId;
        lastUsedMarker = marker;
        lastUsedTheme = theme;
        lastUsedTitle = title;
        lastUsedSort = sort;
        lastUsedFilter = filter;
        lastShowRankSort = rankSort;
        lastComboDisp = comboDisp;

        let oldScore = await DB.FindOne<Score>(refId, {
          collection: 'score',
          musicId,
          seqId,
        });

        if (!oldScore) {
          await DB.Insert<Score>(refId, {
            collection: 'score',
            musicId,
            seqId,
            score: 0,
            clearFlag: 0,
            maxCombo: 0,
            marker: 0,
            theme: 0,
            musicBar: new Array(20).fill(0),
            playCount: 0,
            clearCount: 0,
            fullComboCount: 0,
            excCount: 0,
          });

          oldScore = await DB.FindOne<Score>(refId, {
            collection: 'score',
            musicId,
            seqId,
          });
        }

        await DB.Update<Score>(
          refId,
          { collection: 'score', musicId, seqId },
          {
            $set: {
              score: Math.max(oldScore.score, score),
              clearFlag: Math.max(oldScore.clearFlag, clearFlag),
              maxCombo: Math.max(oldScore.maxCombo, maxCombo),
              marker,
              theme,
              ...(score > oldScore.score && { musicBar: mbar }),
            },
            $inc: {
              playCount: 1,
              ...(clearFlag === 2 && { clearCount: 1 }),
              ...(clearFlag === 4 && { fullComboCount: 1 }),
              ...(clearFlag === 8 && { excCount: 1 }),
            },
          }
        );
      }

      const mode = $(data).number('data.player.mode', 0);

      await DB.Update<Profile>(
        refId,
        { collection: 'profile' },
        {
          $set: {
            'ripples.info': {
              grade: $(data).number('data.player.grade', 0),
              gradePoint: $(data).number('data.player.grade_point', 0),
            },
            'ripples.last': {
              mode,
              musicId: lastMusicId,
              seqId: lastSeqId,
              marker: lastUsedMarker,
              title: lastUsedTitle,
              theme: lastUsedTheme,
              sort: lastUsedSort,
              filter: lastUsedFilter,
              rankSort: lastShowRankSort,
              comboDisp: lastComboDisp,
            },
          },
          $inc: {
            ...(mode === 1 && { 'ripples.info.onlineCount': 1 }),
            ...(mode === 0 && { 'ripples.info.multiCount': 1 }),
          },
        }
      );

      return send.object({
        data: {
          player: {
            session_id: K.ITEM('u32', 1),
            ranking: K.ITEM('u32', 0),
          },
        },
      });
    }

    return send.deny();
  },
};
