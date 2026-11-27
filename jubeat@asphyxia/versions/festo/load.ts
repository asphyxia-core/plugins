import { Score } from '../../models/score';
import { createPlayer, findPlayer, playerByJid } from '../../handlers/player';
import { festoInfo } from './info';
import { profileData } from './profile_data';

declare const BigInt: any; // CORE typecheck targets es2017

export const getProfile = async (
  info: EamuseInfo,
  data: any,
  send: EamuseSend
) => {
  console.log('gametop.regist');
  let refId = $(data).str('data.player.refid');
  const name = $(data).str('data.player.name');

  console.log(data, { depth: null });
  if (!refId) return send.deny();

  let profile = await findPlayer(refId);

  if (!profile && name) {
    profile = await createPlayer(refId, name);
  } else if (!profile && !name) {
    return send.deny();
  }

  return send.object(
    {
      data: {
        ...festoInfo(),

        player: {
          jid: K.ITEM('s32', profile.jubeatId),
          session_id: K.ITEM('s32', 1),
          name: K.ITEM('str', profile.name),
          event_flag: K.ITEM('u64', BigInt(profile.eventFlag || 0)),

          ...(await profileData(profile)),
        },
      },
    },
    { compress: true }
  );
};

export const Getinfo = (info: EamuseInfo, data: any, send: EamuseSend) => {
  console.log(data, { depth: null });
  return send.object(
    { data: festoInfo() },
    { compress: true }
  );
};

export const loadScore = async (info, data, send) => {
  console.log('gametop.get_mdata');
  console.log(data, { depth: null });
  const mdata_ver = $(data).number('data.player.mdata_ver');
  const jubeatId = $(data).number('data.player.jid');
  if (!jubeatId) return send.deny();

  const profile = await playerByJid(jubeatId);
  if (!profile) return send.deny();

  const scores = await DB.Find<Score>(profile.__refid, { collection: 'score' });
  const scoreData: {
    [musicId: number]: {
      [isHardMode: number]: {
        musicRate: number[];
        score: number[];
        clear: number[];
        playCnt: number[];
        clearCnt: number[];
        fcCnt: number[];
        exCnt: number[];
        bar: number[][];
      };
    };
  } = {};

  for (const score of scores) {
    if (!scoreData[score.musicId]) {
      scoreData[score.musicId] = {};
    }
    if (!scoreData[score.musicId][score.isHardMode ? 1 : 0]) {
      scoreData[score.musicId][score.isHardMode ? 1 : 0] = {
        musicRate: [0, 0, 0],
        playCnt: [0, 0, 0],
        clearCnt: [0, 0, 0],
        fcCnt: [0, 0, 0],
        exCnt: [0, 0, 0],
        clear: [0, 0, 0],
        score: [0, 0, 0],
        bar: [Array(30).fill(0), Array(30).fill(0), Array(30).fill(0)],
      };
    }

    const data = scoreData[score.musicId][score.isHardMode ? 1 : 0];
    // Records saved by older versions have no music rate, and may have no ghost.
    data.musicRate[score.seq] = score.musicRate || 0;
    data.playCnt[score.seq] = score.playCount || 0;
    data.clearCnt[score.seq] = score.clearCount || 0;
    data.fcCnt[score.seq] = score.fullcomboCount || 0;
    data.exCnt[score.seq] = score.excellentCount || 0;
    data.clear[score.seq] = score.clear || 0;
    data.score[score.seq] = score.score || 0;
    if (score.bar && score.bar.length) data.bar[score.seq] = score.bar;
  }

  var sendobj = {
    data: {
      player: {
        jid: K.ITEM('s32', jubeatId),

        mdata_list: {
          music: (() => {
            var musicArray = [];
            Object.keys(scoreData).forEach(musicId =>
              Object.keys(scoreData[musicId]).forEach(isHardMode => {
                musicArray.push(
                  K.ATTR(
                    { music_id: String(musicId) },
                    {
                      [isHardMode === '1' ? 'hard' : 'normal']: {
                        score: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].score
                        ),
                        clear: K.ARRAY(
                          's8',
                          scoreData[musicId][isHardMode].clear
                        ),
                        music_rate: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].musicRate
                        ),
                        play_cnt: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].playCnt
                        ),
                        clear_cnt: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].clearCnt
                        ),
                        fc_cnt: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].fcCnt
                        ),
                        ex_cnt: K.ARRAY(
                          's32',
                          scoreData[musicId][isHardMode].exCnt
                        ),
                        bar: scoreData[musicId][isHardMode].bar.map(
                          (bar, seq) => K.ARRAY('u8', bar, { seq: String(seq) })
                        ),
                      },
                    }
                  )
                );
              })
            );
            return musicArray;
          })(),
        },
      },
    },
  };

  if (mdata_ver != 1) {
    sendobj = {
      data: {
        player: {
          jid: K.ITEM('s32', jubeatId),
          mdata_list: {
            music: [],
          },
        },
      },
    };
  }
  console.log(sendobj, { depth: null });
  return send.object(sendobj, { compress: true });
};

export const Meeting = (req: EamuseInfo, data: any, send: EamuseSend) => {
  return send.object(
    {
      data: {
        meeting: {
          single: K.ATTR({ count: '0' }),
        },
        reward: {
          total: K.ITEM('s32', 0),
          point: K.ITEM('s32', 0),
        },
      },
    },
    { compress: true }
  );
};
