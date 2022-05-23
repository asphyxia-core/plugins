import { getDefaultPlayerInfo, PlayerInfo } from "../models/playerinfo";
import { PlayerRanking } from "../models/playerranking";
import { getDefaultProfile, Profile } from "../models/profile";
import { getDefaultRecord, Record } from "../models/record";
import { Extra, getDefaultExtra } from "../models/extra";
import { getVersion, isDM } from "../utils";
import { getDefaultScores, Scores } from "../models/scores";

import { PLUGIN_VER } from "../const";
import Logger from "../utils/logger"
import { isAsphyxiaDebugMode } from "../Utils/index";
import { SecretMusicEntry } from "../models/secretmusicentry";
import { CheckPlayerResponse, getCheckPlayerResponse } from "../models/Responses/checkplayerresponse";
import { getPlayerStickerResponse, PlayerStickerResponse } from "../models/Responses/playerstickerresponse";
import { getSecretMusicResponse, SecretMusicResponse } from "../models/Responses/secretmusicresponse";
import { getSaveProfileResponse } from "../models/Responses/saveprofileresponse";
import { getDefaultBattleDataResponse } from "../models/Responses/battledataresponse";
import { applySharedFavoriteMusicToExtra, saveSharedFavoriteMusicFromExtra } from "./FavoriteMusic";
import { getPlayerRecordResponse } from "../models/Responses/playerrecordresponse";
import { getPlayerPlayInfoResponse, PlayerPlayInfoResponse } from "../models/Responses/playerplayinforesponse";

const logger = new Logger("profiles")

export const regist: EPR = async (info, data, send) => {

  const refid = $(data).str('player.refid');
  if (!refid) {
      logger.error("Request data is missing required parameter: player.refid")
      return send.deny();
  }

  const no = getPlayerNo(data);
  const version = getVersion(info);
  const playerInfo = await getOrRegisterPlayerInfo(refid, version, no);

  await send.object({
    player: K.ATTR({ no: `${no}` }, {
      is_succession: K.ITEM("bool", 0), //FIX THIS with upsert result.
      did: K.ITEM("s32", playerInfo.id)
    })
  })

}

export const check: EPR = async (info, data, send) => {

  const refid = $(data).str('player.refid');
    if (!refid) {
        logger.error("Request data is missing required parameter: player.refid")
        return send.deny();
    }

  const no = getPlayerNo(data);
  const version = getVersion(info)
  const playerInfo = await getOrRegisterPlayerInfo(refid, version, no)

  const result : CheckPlayerResponse = getCheckPlayerResponse(no, playerInfo.name, playerInfo.id)
  await send.object(result)  
}

export const getPlayer: EPR = async (info, data, send) => {
  const refid = $(data).str('player.refid');
    if (!refid) {
        logger.error("Request data is missing required parameter: player.refid")
        return send.deny();
    }

  const no = getPlayerNo(data);
  const version = getVersion(info);
  const time = BigInt(31536000);
  const dm = isDM(info);
  const game = dm ? 'dm' : 'gf';

  logger.debugInfo(`Loading ${game} profile for player ${no} with refid: ${refid}`)
  const name = await DB.FindOne<PlayerInfo>(refid, {
    collection: 'playerinfo',
    version
  })
  const dmProfile = await getProfile(refid, version, 'dm')
  const gfProfile = await getProfile(refid, version, 'gf')
  const dmRecord = await getRecord(refid, version, 'dm')
  const gfRecord = await getRecord(refid, version, 'gf')
  const dmExtra = await getExtra(refid, version, 'dm')
  const gfExtra = await getExtra(refid, version, 'gf')
  const dmScores = (await getScore(refid, version, 'dm')).scores
  const gfScores = (await getScore(refid, version, 'gf')).scores

  const profile = dm ? dmProfile : gfProfile;
  const extra = dm ? dmExtra : gfExtra;

  await applySharedFavoriteMusicToExtra(refid, extra)

  const record: any = {
    gf: getPlayerRecordResponse(gfProfile, gfRecord),
    dm: getPlayerRecordResponse(dmProfile, dmRecord),
  };

  // Format scores
  const musicdata = [];
  const scores = dm ? dmScores : gfScores;
  for (const [musicid, score] of _.entries(scores)) {
    musicdata.push(K.ATTR({ musicid }, {
      mdata: K.ARRAY('s16', [
        -1,
        _.get(score, 'diffs.1.perc', -2),
        _.get(score, 'diffs.2.perc', -2),
        _.get(score, 'diffs.3.perc', -2),
        _.get(score, 'diffs.4.perc', -2),
        _.get(score, 'diffs.5.perc', -2),
        _.get(score, 'diffs.6.perc', -2),
        _.get(score, 'diffs.7.perc', -2),
        _.get(score, 'diffs.8.perc', -2),
        _.get(score, 'diffs.1.rank', 0),
        _.get(score, 'diffs.2.rank', 0),
        _.get(score, 'diffs.3.rank', 0),
        _.get(score, 'diffs.4.rank', 0),
        _.get(score, 'diffs.5.rank', 0),
        _.get(score, 'diffs.6.rank', 0),
        _.get(score, 'diffs.7.rank', 0),
        _.get(score, 'diffs.8.rank', 0),
        0,
        0,
        0,
      ]),
      flag: K.ARRAY('u16', [
        _.get(score, 'diffs.1.fc', false) * 2 +
        _.get(score, 'diffs.2.fc', false) * 4 +
        _.get(score, 'diffs.3.fc', false) * 8 +
        _.get(score, 'diffs.4.fc', false) * 16 +
        _.get(score, 'diffs.5.fc', false) * 32 +
        _.get(score, 'diffs.6.fc', false) * 64 +
        _.get(score, 'diffs.7.fc', false) * 128 +
        _.get(score, 'diffs.8.fc', false) * 256,
        _.get(score, 'diffs.1.ex', false) * 2 +
        _.get(score, 'diffs.2.ex', false) * 4 +
        _.get(score, 'diffs.3.ex', false) * 8 +
        _.get(score, 'diffs.4.ex', false) * 16 +
        _.get(score, 'diffs.5.ex', false) * 32 +
        _.get(score, 'diffs.6.ex', false) * 64 +
        _.get(score, 'diffs.7.ex', false) * 128 +
        _.get(score, 'diffs.8.ex', false) * 256,
        _.get(score, 'diffs.1.clear', false) * 2 +
        _.get(score, 'diffs.2.clear', false) * 4 +
        _.get(score, 'diffs.3.clear', false) * 8 +
        _.get(score, 'diffs.4.clear', false) * 16 +
        _.get(score, 'diffs.5.clear', false) * 32 +
        _.get(score, 'diffs.6.clear', false) * 64 +
        _.get(score, 'diffs.7.clear', false) * 128 +
        _.get(score, 'diffs.8.clear', false) * 256,
        0,
        0,
      ]),
      sdata: K.ARRAY('s16', score.update),
      meter: K.ARRAY('u64', [
        BigInt(_.get(score, 'diffs.1.meter', '0')),
        BigInt(_.get(score, 'diffs.2.meter', '0')),
        BigInt(_.get(score, 'diffs.3.meter', '0')),
        BigInt(_.get(score, 'diffs.4.meter', '0')),
        BigInt(_.get(score, 'diffs.5.meter', '0')),
        BigInt(_.get(score, 'diffs.6.meter', '0')),
        BigInt(_.get(score, 'diffs.7.meter', '0')),
        BigInt(_.get(score, 'diffs.8.meter', '0')),
      ]),
      meter_prog: K.ARRAY('s16', [
        _.get(score, 'diffs.1.prog', 0),
        _.get(score, 'diffs.2.prog', 0),
        _.get(score, 'diffs.3.prog', 0),
        _.get(score, 'diffs.4.prog', 0),
        _.get(score, 'diffs.5.prog', 0),
        _.get(score, 'diffs.6.prog', 0),
        _.get(score, 'diffs.7.prog', 0),
        _.get(score, 'diffs.8.prog', 0),
      ]),
    }));
  }

  const sticker: PlayerStickerResponse[] = getPlayerStickerResponse(name.card);
  const playinfo: PlayerPlayInfoResponse = getPlayerPlayInfoResponse(profile);

  const playerData: any = {
    playerboard: {
      index: K.ITEM('s32', 1),
      is_active: K.ITEM('bool', _.isArray(name.card) ? 1 : 0),
      sticker,
    },
    player_info: {
      player_type: K.ITEM('s8', 0),
      did: K.ITEM('s32', 13376666),
      name: K.ITEM('str', name.name),
      title: K.ITEM('str', name.title),
      charaid: K.ITEM('s32', 0),
    },
    customdata: {
      playstyle: K.ARRAY('s32', extra.playstyle),
      custom: K.ARRAY('s32', extra.custom),
    },
    playinfo: playinfo,
    tutorial: {
      progress: K.ITEM('s32', profile.progress),
      disp_state: K.ITEM('u32', profile.disp_state),
    },
    skilldata: {
      skill: K.ITEM('s32', profile.skill),
      all_skill: K.ITEM('s32', profile.all_skill),
      old_skill: K.ITEM('s32', 0),
      old_all_skill: K.ITEM('s32', 0),
    },
    favoritemusic: {
      list_1: K.ARRAY('s32', extra.list_1),
      list_2: K.ARRAY('s32', extra.list_2),
      list_3: K.ARRAY('s32', extra.list_3),
    },
    recommend_musicid_list: K.ARRAY('s32', extra.recommend_musicid_list ?? Array(5).fill(-1)),
    record,
    groove: {
      extra_gauge: K.ITEM('s32', profile.extra_gauge),
      encore_gauge: K.ITEM('s32', profile.encore_gauge),
      encore_cnt: K.ITEM('s32', profile.encore_cnt),
      encore_success: K.ITEM('s32', profile.encore_success),
      unlock_point: K.ITEM('s32', profile.unlock_point),
    },
    musiclist: { '@attr': { nr: musicdata.length }, musicdata },
  };

  const playerRanking = await getPlayerRanking(refid, version, game)
  
  const addition: any = {
    monstar_subjugation: {},
    bear_fes: {},
  };
  for (let i = 1; i <= 20; ++i) {
    const obj = { point: K.ITEM('s32', 0) };
    if (i == 1) {
      addition['long_otobear_fes_1'] = obj;
      addition['phrase_combo_challenge'] = obj;
      addition['sdvx_stamprally3'] = obj;
      addition['chronicle_1'] = obj;
    } else {
      addition[`phrase_combo_challenge_${i}`] = obj;
    }

    if (i <= 4) {
      addition.bear_fes[`bear_fes_${i}`] = {
        stage: K.ITEM('s32', 0),
        point: K.ARRAY('s32', [0, 0, 0, 0, 0, 0, 0, 0]),
      };
    }

    if (i <= 3) {
      addition.monstar_subjugation[`monstar_subjugation_${i}`] = {
        stage: K.ITEM('s32', 0),
        point_1: K.ITEM('s32', 0),
        point_2: K.ITEM('s32', 0),
        point_3: K.ITEM('s32', 0),
      };
      addition[`kouyou_challenge_${i}`] = { point: K.ITEM('s32', 0) };
    }
  }

  const innerSecretMusic = getSecretMusicResponse(profile)
  const innerFriendData = getFriendDataResponse(profile)
  const innerBattleData = getDefaultBattleDataResponse()
  
  const response = {
    player: K.ATTR({ 'no': `${no}` }, {
      now_date: K.ITEM('u64', time),
      secretmusic: {
        music: innerSecretMusic
      },
      chara_list: {},
      title_parts: {},
      information: {
        info: K.ARRAY('u32', Array(50).fill(0)),
      },
      reward: {
        status: K.ARRAY('u32', extra.reward_status ??  Array(50).fill(0)),
      },          
      rivaldata: {},
      frienddata:  {
        friend: innerFriendData
      },
      
      thanks_medal: {
        medal: K.ITEM('s32', 0),
        grant_medal: K.ITEM('s32', 0),
        grant_total_medal: K.ITEM('s32', 0),
      },
      recommend_musicid_list:  K.ARRAY('s32', extra.recommend_musicid_list ?? Array(5).fill(-1)),
      skindata: {
        skin: K.ARRAY('u32', Array(100).fill(-1)),
      },
      battledata: innerBattleData,
      is_free_ok: K.ITEM('bool', 0),
      ranking: {
        skill: { rank: K.ITEM('s32', playerRanking.skill), total_nr: K.ITEM('s32', playerRanking.totalPlayers) },
        all_skill: { rank: K.ITEM('s32', playerRanking.all_skill), total_nr: K.ITEM('s32', playerRanking.totalPlayers) },
      },
      stage_result: {},
      monthly_skill: {},
      event_skill: {
        skill: K.ITEM('s32', 0),
        ranking: {
          rank: K.ITEM('s32', 0),
          total_nr: K.ITEM('s32', 0),
        },
        eventlist: {},
      },
      event_score: { eventlist: {} },
      rockwave: { score_list: {} },
      jubeat_omiyage_challenge: {},
      light_mode_reward_item: { itemid: K.ITEM('s32', -1), rarity: K.ITEM('s32', 0) },
      standard_mode_reward_item: { itemid: K.ITEM('s32', -1), rarity: K.ITEM('s32', 0) },
      delux_mode_reward_item: { itemid: K.ITEM('s32', -1), rarity: K.ITEM('s32', 0) },
      kac2018: {
        entry_status: K.ITEM('s32', 0),
        data: {
          term: K.ITEM('s32', 0),
          total_score: K.ITEM('s32', 0),
          score: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
          music_type: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
          play_count: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
        },
      },
      sticker_campaign: {},
      kac2017: {
        entry_status: K.ITEM('s32', 0),
      },
      nostalgia_concert: {},
      bemani_summer_2018: {
        linkage_id: K.ITEM('s32', -1),
        is_entry: K.ITEM('bool', 0),
        target_music_idx: K.ITEM('s32', -1),
        point_1: K.ITEM('s32', 0),
        point_2: K.ITEM('s32', 0),
        point_3: K.ITEM('s32', 0),
        point_4: K.ITEM('s32', 0),
        point_5: K.ITEM('s32', 0),
        point_6: K.ITEM('s32', 0),
        point_7: K.ITEM('s32', 0),
        reward_1: K.ITEM('bool', 0),
        reward_2: K.ITEM('bool', 0),
        reward_3: K.ITEM('bool', 0),
        reward_4: K.ITEM('bool', 0),
        reward_5: K.ITEM('bool', 0),
        reward_6: K.ITEM('bool', 0),
        reward_7: K.ITEM('bool', 0),
        unlock_status_1: K.ITEM('s32', 0),
        unlock_status_2: K.ITEM('s32', 0),
        unlock_status_3: K.ITEM('s32', 0),
        unlock_status_4: K.ITEM('s32', 0),
        unlock_status_5: K.ITEM('s32', 0),
        unlock_status_6: K.ITEM('s32', 0),
        unlock_status_7: K.ITEM('s32', 0),
      },
      thanksgiving: {
        term: K.ITEM("u8", 0),
        score: {
          one_day_play_cnt: K.ITEM("s32", 0),
          one_day_lottery_cnt: K.ITEM("s32", 0),
          lucky_star: K.ITEM("s32", 0),
          bear_mark: K.ITEM("s32", 0),
          play_date_ms: K.ITEM("u64", BigInt(0))
        },
        lottery_result: {
          unlock_bit: K.ITEM("u64", BigInt(0))
        }
      },
      lotterybox: {},
      ...addition,
      ...playerData,
      finish: K.ITEM('bool', 1),
    }),
  }

  if (isAsphyxiaDebugMode())  {
    await IO.WriteFile(`apisamples/lastGetPlayerRequest.json`, JSON.stringify(data, null, 4))
    await IO.WriteFile(`apisamples/lastGetPlayerResponse.json`, JSON.stringify(response, null, 4))
  }
  send.object(response);
}

async function getOrRegisterPlayerInfo(refid: string, version: string, no: number) {
  let playerInfo = await DB.FindOne<PlayerInfo>(refid, {
    collection: 'playerinfo',
    version
  });

  if (!playerInfo) {
    logger.debugInfo(`Registering new profile for player ${no} with refid: ${refid}`);
    playerInfo = await registerUser(refid, version);
  }
  return playerInfo;
}

function getPlayerNo(data: any): number {
  return parseInt($(data).attr("player").no || '1', 10)
}

async function registerUser(refid: string, version: string, id = _.random(0, 99999999)) {
  while (await DB.FindOne<Profile>(null, { collection: 'profile', id })) {
    id = _.random(0, 99999999);
  }

  const defaultInfo: PlayerInfo = getDefaultPlayerInfo(version, id)

  const gf = { game: 'gf', version };
  const dm = { game: 'dm', version };

  await DB.Upsert(refid, { collection: 'playerinfo', version }, defaultInfo);
  await DB.Upsert(refid, { collection: 'profile', ...gf }, getDefaultProfile('gf', version, id));
  await DB.Upsert(refid, { collection: 'profile', ...dm }, getDefaultProfile('dm', version, id));
  await DB.Upsert(refid, { collection: 'record', ...gf }, getDefaultRecord('gf', version));
  await DB.Upsert(refid, { collection: 'record', ...dm }, getDefaultRecord('dm', version));
  await DB.Upsert(refid, { collection: 'extra', ...gf }, getDefaultExtra('gf', version, id));
  await DB.Upsert(refid, { collection: 'extra', ...dm }, getDefaultExtra('dm', version, id));
  await DB.Upsert(refid, { collection: 'scores', ...gf }, getDefaultScores('gf', version));
  await DB.Upsert(refid, { collection: 'scores', ...dm }, getDefaultScores('dm', version));

  return defaultInfo
}

export const savePlayers: EPR = async (info, data, send) => {

  const version = getVersion(info);
  const dm = isDM(info);
  const game = dm ? 'dm' : 'gf';

  let players = $(data).elements("player")

  let response = { 
    player: [],
    gamemode: _.get(data, 'gamemode'),
  };

  try
  {
    for (let player of players) {

      const no = parseInt(player.attr().no || '1', 10)
      // Only save players that are using a profile. Don't try to save guest players.
      const hasCard = player.attr().card === 'use'
      if (!hasCard) {
        logger.debugInfo(`Skipping save for guest ${game} player ${no}.`)
        continue
      }

      const refid = player.str('refid')   
      if (!refid)  {
        throw "Request data is missing required parameter: player.refid"
      }

      await saveSinglePlayer(player, refid, no, version, game);

      let ranking = await getPlayerRanking(refid, version, game)
      let responsePart = getSaveProfileResponse(no, ranking)
      response.player.push(responsePart)
    }

  if (isAsphyxiaDebugMode()) {
    await IO.WriteFile(`apisamples/lastSavePlayersRequest.json`, JSON.stringify(data, null, 4))
    await IO.WriteFile(`apisamples/lastSavePlayersResponse.json`, JSON.stringify(response, null, 4))
  }
  await send.object(response);
  }
  catch (e)  {
    logger.error(e)
    logger.error(e.stack)
    return send.deny();
  }
};

async function saveSinglePlayer(dataplayer: KDataReader, refid: string, no: number, version: string, game: 'gf' | 'dm')
{
  logger.debugInfo(`Saving ${game} profile for player ${no} with refid: ${refid}`)
  const profile = await getProfile(refid, version, game) as any;
  const extra = await getExtra(refid, version, game) as any;
  const rec = await getRecord(refid, version, game) as any;

  const autoSet = function (field: keyof Profile, path: string, array = false): void  {
    if (array) {
      profile[field] = dataplayer.numbers(path, profile[field])
    } else {
      profile[field] = dataplayer.number(path, profile[field])
    }
  };

  const autoExtra = (field: keyof Extra, path: string, array = false): void => {
    if (array) {
      extra[field] = dataplayer.numbers(path, extra[field])
    } else {     
      extra[field] = dataplayer.number(path, extra[field])
    }
  };

  const autoRec = (field: keyof Record, path: string, array = false): void => {
    if (array) {
      rec[field] = dataplayer.numbers(path, rec[field])
    } else {
      rec[field] = dataplayer.number(path, rec[field])
    }
  };

  let newSecretMusic = parseSecretMusic(dataplayer)
  profile.secretmusic = {
    music: newSecretMusic
  }

  autoSet('max_skill', 'record.max.skill');
  autoSet('max_all_skill', 'record.max.all_skill');
  autoSet('clear_diff', 'record.max.clear_diff');
  autoSet('full_diff', 'record.max.full_diff');
  autoSet('exce_diff', 'record.max.exce_diff');
  autoSet('clear_music_num', 'record.max.clear_music_num');
  autoSet('full_music_num', 'record.max.full_music_num');
  autoSet('exce_music_num', 'record.max.exce_music_num');
  autoSet('clear_seq_num', 'record.max.clear_seq_num');
  autoSet('classic_all_skill', 'record.max.classic_all_skill');

  autoSet('play', 'playinfo.play');
  autoSet('playtime', 'playinfo.playtime');
  autoSet('playterm', 'playinfo.playterm');
  autoSet('session_cnt', 'playinfo.session_cnt');
  autoSet('extra_stage', 'playinfo.extra_stage');
  autoSet('extra_play', 'playinfo.extra_play');
  autoSet('extra_clear', 'playinfo.extra_clear');
  autoSet('encore_play', 'playinfo.encore_play');
  autoSet('encore_clear', 'playinfo.encore_clear');
  autoSet('pencore_play', 'playinfo.pencore_play');
  autoSet('pencore_clear', 'playinfo.pencore_clear');
  autoSet('max_clear_diff', 'playinfo.max_clear_diff');
  autoSet('max_full_diff', 'playinfo.max_full_diff');
  autoSet('max_exce_diff', 'playinfo.max_exce_diff');
  autoSet('clear_num', 'playinfo.clear_num');
  autoSet('full_num', 'playinfo.full_num');
  autoSet('exce_num', 'playinfo.exce_num');
  autoSet('no_num', 'playinfo.no_num');
  autoSet('e_num', 'playinfo.e_num');
  autoSet('d_num', 'playinfo.d_num');
  autoSet('c_num', 'playinfo.c_num');
  autoSet('b_num', 'playinfo.b_num');
  autoSet('a_num', 'playinfo.a_num');
  autoSet('s_num', 'playinfo.s_num');
  autoSet('ss_num', 'playinfo.ss_num');
  autoSet('last_category', 'playinfo.last_category');
  autoSet('last_musicid', 'playinfo.last_musicid');
  autoSet('last_seq', 'playinfo.last_seq');
  autoSet('disp_level', 'playinfo.disp_level');

  autoSet('extra_gauge', 'groove.extra_gauge');
  autoSet('encore_gauge', 'groove.encore_gauge');
  autoSet('encore_cnt', 'groove.encore_cnt');
  autoSet('encore_success', 'groove.encore_success');
  autoSet('unlock_point', 'groove.unlock_point');

  autoSet('progress', 'tutorial.progress');
  autoSet('disp_state', 'tutorial.disp_state');

  autoSet('skill', 'skilldata.skill');
  autoSet('all_skill', 'skilldata.all_skill');

  autoRec('diff_100_nr', 'record.diff.diff_100_nr');
  autoRec('diff_150_nr', 'record.diff.diff_150_nr');
  autoRec('diff_200_nr', 'record.diff.diff_200_nr');
  autoRec('diff_250_nr', 'record.diff.diff_250_nr');
  autoRec('diff_300_nr', 'record.diff.diff_300_nr');
  autoRec('diff_350_nr', 'record.diff.diff_350_nr');
  autoRec('diff_400_nr', 'record.diff.diff_400_nr');
  autoRec('diff_450_nr', 'record.diff.diff_450_nr');
  autoRec('diff_500_nr', 'record.diff.diff_500_nr');
  autoRec('diff_550_nr', 'record.diff.diff_550_nr');
  autoRec('diff_600_nr', 'record.diff.diff_600_nr');
  autoRec('diff_650_nr', 'record.diff.diff_650_nr');
  autoRec('diff_700_nr', 'record.diff.diff_700_nr');
  autoRec('diff_750_nr', 'record.diff.diff_750_nr');
  autoRec('diff_800_nr', 'record.diff.diff_800_nr');
  autoRec('diff_850_nr', 'record.diff.diff_850_nr');
  autoRec('diff_900_nr', 'record.diff.diff_900_nr');
  autoRec('diff_950_nr', 'record.diff.diff_950_nr');
  autoRec('diff_100_clear', 'record.diff.diff_100_clear', true);
  autoRec('diff_150_clear', 'record.diff.diff_150_clear', true);
  autoRec('diff_200_clear', 'record.diff.diff_200_clear', true);
  autoRec('diff_250_clear', 'record.diff.diff_250_clear', true);
  autoRec('diff_300_clear', 'record.diff.diff_300_clear', true);
  autoRec('diff_350_clear', 'record.diff.diff_350_clear', true);
  autoRec('diff_400_clear', 'record.diff.diff_400_clear', true);
  autoRec('diff_450_clear', 'record.diff.diff_450_clear', true);
  autoRec('diff_500_clear', 'record.diff.diff_500_clear', true);
  autoRec('diff_550_clear', 'record.diff.diff_550_clear', true);
  autoRec('diff_600_clear', 'record.diff.diff_600_clear', true);
  autoRec('diff_650_clear', 'record.diff.diff_650_clear', true);
  autoRec('diff_700_clear', 'record.diff.diff_700_clear', true);
  autoRec('diff_750_clear', 'record.diff.diff_750_clear', true);
  autoRec('diff_800_clear', 'record.diff.diff_800_clear', true);
  autoRec('diff_850_clear', 'record.diff.diff_850_clear', true);
  autoRec('diff_900_clear', 'record.diff.diff_900_clear', true);
  autoRec('diff_950_clear', 'record.diff.diff_950_clear', true);

  autoExtra('list_1', 'favoritemusic.music_list_1', true);
  autoExtra('list_2', 'favoritemusic.music_list_2', true);
  autoExtra('list_3', 'favoritemusic.music_list_3', true);
  autoExtra('recommend_musicid_list', 'recommend_musicid_list', true);

  autoExtra('playstyle', 'customdata.playstyle', true);
  autoExtra('custom', 'customdata.custom', true);
  autoExtra('reward_status', 'reward.status', true)

  await DB.Upsert(refid, { collection: 'profile', game, version }, profile)
  await DB.Upsert(refid, { collection: 'record', game, version }, rec)
  await DB.Upsert(refid, { collection: 'extra', game, version }, extra)

  const playedStages = dataplayer.elements('stage');
  logStagesPlayed(playedStages)
  
  const scores = await updatePlayerScoreCollection(refid, playedStages, version, game)
  await saveScore(refid, version, game, scores); 
  await saveSharedFavoriteMusicFromExtra(refid, extra)
}

async function updatePlayerScoreCollection(refid, playedStages, version, game) {
  const scores = (await getScore(refid, version, game)).scores;
  for (const stage of playedStages) {
    const mid = stage.number('musicid', -1);
    const seq = stage.number('seq', -1);

    if (mid < 0 || seq < 0) continue;

    // const skill = stage.number('skill', 0);
    const newSkill = stage.number('new_skill', 0);
    const clear = stage.bool('clear');
    const fc = stage.bool('fullcombo');
    const ex = stage.bool('excellent');

    const perc = stage.number('perc', 0);
    const rank = stage.number('rank', 0);
    const meter = stage.bigint('meter', BigInt(0));
    const prog = stage.number('meter_prog', 0);

    if(!scores[mid]) {
      scores[mid]  = {
        update: [0, 0],
        diffs: {}
      }
    }

    if (newSkill > scores[mid].update[1]) {
      scores[mid].update[0] = seq;
      scores[mid].update[1] = newSkill;
    }

    scores[mid].diffs[seq] = { //FIXME: Real server is bit complicated. this one is too buggy.
      perc: Math.max(_.get(scores[mid].diffs[seq], 'perc', 0), perc),
      rank: Math.max(_.get(scores[mid].diffs[seq], 'rank', 0), rank),
      meter: meter.toString(),
      prog: Math.max(_.get(scores[mid].diffs[seq], 'prog', 0), prog),
      clear: _.get(scores[mid].diffs[seq], 'clear') || clear,
      fc: _.get(scores[mid].diffs[seq], 'fc') || fc,
      ex: _.get(scores[mid].diffs[seq], 'ex') || ex,
    };
  }

  return scores
}

async function getPlayerRanking(refid: string, version: string, game: 'gf' | 'dm') : Promise<PlayerRanking> {
  let profiles = await getAllProfiles(version, game)
  let playerCount = profiles.length
  let sortedProfilesA = profiles.sort((a,b) => b.skill - a.skill)
  let sortedProfilesB = profiles.sort((a,b) => b.all_skill - a.all_skill)

  let idxA = _.findIndex(sortedProfilesA, (e) => e.__refid === refid)
  idxA = idxA > -1 ? idxA + 1 : playerCount     // Default to last place if not found in the DB.
  let idxB = _.findIndex(sortedProfilesB, (e) => e.__refid === refid)
  idxB = idxB > -1 ? idxB + 1 : playerCount     // Default to last place if not found in the DB.

  return {
    refid,
    skill: idxA,
    all_skill: idxB,
    totalPlayers: playerCount  
  }
}

async function getAllProfiles( version: string, game: 'gf' | 'dm') {
  return await DB.Find<Profile>(null, {
    collection: 'profile',
    version: version,
    game: game
  })
}

async function getProfile(refid: string, version: string, game: 'gf' | 'dm') {
  return await DB.FindOne<Profile>(refid, {
    collection: 'profile',
    version: version,
    game: game
  })
}

async function getExtra(refid: string, version: string, game: 'gf' | 'dm') {
  return await DB.FindOne<Extra>(refid, {
    collection: 'extra',
    version: version,
    game: game
  })
}

async function getRecord(refid: string, version: string, game: 'gf' | 'dm') {
  return await DB.FindOne<Record>(refid, {
    collection: 'record',
    version: version,
    game: game
  })
}

async function getScore(refid: string, version: string, game: 'gf' | 'dm'): Promise<Scores> {
  return (await DB.FindOne<Scores>(refid, {
    collection: 'scores',
    version: version,
    game: game
  })) || {
    collection: 'scores',
    version: version,
    pluginVer: PLUGIN_VER,
    game: game,
    scores: {}
  }
}

async function saveScore(refid: string, version: string, game: 'gf' | 'dm', scores: Scores['scores']) {
  return await DB.Upsert<Scores>(refid, {
    collection: 'scores',
    version,
    game
  }, {
    collection: 'scores',
    version,
    game,
    scores
  })
}

function parseSecretMusic(playerData: KDataReader) : SecretMusicEntry[]
{
  let response : SecretMusicEntry[] = []

  let elements = playerData.element('secretmusic')?.elements('music')
  if (!elements) {
    return response
  }  
  
  for (let el of elements) {
    let item : SecretMusicEntry = {
      musicid: el.number('musicid'),
      seq: el.number('seq'),
      kind: el.number('kind')
    }

    response.push(item)    
  }
  return response
}

function getFriendDataResponse(profile: Profile) {
  let response = []
  return response;
}

function logStagesPlayed(playedStages: KDataReader[]) {

  let result = "Stages played: "
  for (let stage of playedStages) {
    let id = stage.number('musicid')
    result += `${id}, `
  }

  logger.debugLog(result)
}
