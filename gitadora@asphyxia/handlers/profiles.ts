import { PlayerInfo } from "../models/playerinfo";
import { Profile } from "../models/profile";
import { Record } from "../models/record";
import { Extra } from "../models/extra";
import { getVersion, isDM } from "../utils";
import { Scores } from "../models/scores";
import { PLUGIN_VER } from "../const";

export const regist: EPR = async (info, data, send) => {
  const refid = $(data).str('player.refid');
  if (!refid) return send.deny();

  const no = getPlayerNo(data);
  const version = getVersion(info);

  const playerInfo = await DB.FindOne<PlayerInfo>(refid, {
    collection: 'playerinfo',
    version
  })

  if (playerInfo) {
    send.object({
      player: K.ATTR({ no: `${no}` }, {
        is_succession: K.ITEM("bool", 0), //FIX THIS with upsert result.
        did: K.ITEM("s32", playerInfo.id)
      })
    })
  } else {
    let info = await registerUser(refid, version)
    send.object({
      player: K.ATTR({ no: `${no}` }, {
        is_succession: K.ITEM("bool", 0), //FIX THIS with upsert result.
        did: K.ITEM("s32", info.id)
      })
    })
  }
}

export const check: EPR = async (info, data, send) => {
  const refid = $(data).str('player.refid');
  if (!refid) return send.deny();

  const no = getPlayerNo(data);
  const version = getVersion(info)

  const playerInfo = await DB.FindOne<PlayerInfo>(refid, {
    collection: 'playerinfo',
  })

  if (playerInfo) {
    send.object({
      player: K.ATTR({ no: `${no}`, state: '2' }, {
        name: K.ITEM('str', playerInfo.name),
        charaid: K.ITEM('s32', 0),
        did: K.ITEM('s32', playerInfo.id),
        skilldata: {
          skill: K.ITEM('s32', 0),
          all_skill: K.ITEM('s32', 0),
          old_skill: K.ITEM('s32', 0),
          old_all_skill: K.ITEM('s32', 0),
        }
      })
    })
  } else {
    let info = await registerUser(refid, version)
    send.object({
      player: K.ATTR({ no: `${no}`, state: '2' }, {
        name: K.ITEM('str', info.name),
        charaid: K.ITEM('s32', 0),
        did: K.ITEM('s32', info.id),
        skilldata: {
          skill: K.ITEM('s32', 0),
          all_skill: K.ITEM('s32', 0),
          old_skill: K.ITEM('s32', 0),
          old_all_skill: K.ITEM('s32', 0),
        }
      })
    })
  }
}

export const getPlayer: EPR = async (info, data, send) => {
  const refid = $(data).str('player.refid');
  if (!refid) return send.deny();

  const no = getPlayerNo(data);
  const version = getVersion(info);
  const time = BigInt(31536000);
  const dm = isDM(info);

  const name = await DB.FindOne<PlayerInfo>(refid, {
    collection: 'playerinfo',
  })
  const dmProfile = await getProfile(refid, version, 'dm')
  const gfProfile = await getProfile(refid, version, 'gf')
  const dmRecord = await getRecord(refid, version, 'dm')
  const gfRecord = await getRecord(refid, version, 'gf')
  const dmExtra = await getExtra(refid, version, 'dm')
  const gfExtra = await getExtra(refid, version, 'gf')
  const dmScores = await getScores(refid, version, 'dm')
  const gfScores = await getScores(refid, version, 'gf')

  const profile = dm ? dmProfile : gfProfile;
  const extra = dm ? dmExtra : gfExtra;

  const record: any = {
    gf: {},
    dm: {},
  };
  for (const mode of ['dm', 'gf']) {
    let game = mode == 'gf' ? gfProfile : dmProfile;
    let rec = mode == 'gf' ? gfRecord : dmRecord;
    record[mode] = {
      max_record: {
        skill: K.ITEM('s32', game.max_skill),
        all_skill: K.ITEM('s32', game.max_all_skill),
        clear_diff: K.ITEM('s32', game.clear_diff),
        full_diff: K.ITEM('s32', game.full_diff),
        exce_diff: K.ITEM('s32', game.exce_diff),
        clear_music_num: K.ITEM('s32', game.clear_music_num),
        full_music_num: K.ITEM('s32', game.full_music_num),
        exce_music_num: K.ITEM('s32', game.exce_music_num),
        clear_seq_num: K.ITEM('s32', game.clear_seq_num),
        classic_all_skill: K.ITEM('s32', game.classic_all_skill),
      },
      diff_record: {
        diff_100_nr: K.ITEM('s32', rec.diff_100_nr),
        diff_150_nr: K.ITEM('s32', rec.diff_150_nr),
        diff_200_nr: K.ITEM('s32', rec.diff_200_nr),
        diff_250_nr: K.ITEM('s32', rec.diff_250_nr),
        diff_300_nr: K.ITEM('s32', rec.diff_300_nr),
        diff_350_nr: K.ITEM('s32', rec.diff_350_nr),
        diff_400_nr: K.ITEM('s32', rec.diff_400_nr),
        diff_450_nr: K.ITEM('s32', rec.diff_450_nr),
        diff_500_nr: K.ITEM('s32', rec.diff_500_nr),
        diff_550_nr: K.ITEM('s32', rec.diff_550_nr),
        diff_600_nr: K.ITEM('s32', rec.diff_600_nr),
        diff_650_nr: K.ITEM('s32', rec.diff_650_nr),
        diff_700_nr: K.ITEM('s32', rec.diff_700_nr),
        diff_750_nr: K.ITEM('s32', rec.diff_750_nr),
        diff_800_nr: K.ITEM('s32', rec.diff_800_nr),
        diff_850_nr: K.ITEM('s32', rec.diff_850_nr),
        diff_900_nr: K.ITEM('s32', rec.diff_900_nr),
        diff_950_nr: K.ITEM('s32', rec.diff_950_nr),
        diff_100_clear: K.ARRAY('s32', rec.diff_100_clear),
        diff_150_clear: K.ARRAY('s32', rec.diff_150_clear),
        diff_200_clear: K.ARRAY('s32', rec.diff_200_clear),
        diff_250_clear: K.ARRAY('s32', rec.diff_250_clear),
        diff_300_clear: K.ARRAY('s32', rec.diff_300_clear),
        diff_350_clear: K.ARRAY('s32', rec.diff_350_clear),
        diff_400_clear: K.ARRAY('s32', rec.diff_400_clear),
        diff_450_clear: K.ARRAY('s32', rec.diff_450_clear),
        diff_500_clear: K.ARRAY('s32', rec.diff_500_clear),
        diff_550_clear: K.ARRAY('s32', rec.diff_550_clear),
        diff_600_clear: K.ARRAY('s32', rec.diff_600_clear),
        diff_650_clear: K.ARRAY('s32', rec.diff_650_clear),
        diff_700_clear: K.ARRAY('s32', rec.diff_700_clear),
        diff_750_clear: K.ARRAY('s32', rec.diff_750_clear),
        diff_800_clear: K.ARRAY('s32', rec.diff_800_clear),
        diff_850_clear: K.ARRAY('s32', rec.diff_850_clear),
        diff_900_clear: K.ARRAY('s32', rec.diff_900_clear),
        diff_950_clear: K.ARRAY('s32', rec.diff_950_clear),
      },
    };
  }

  // Format scores
  const musicdata = [];
  const scores = dm ? dmScores : gfScores;
  for (const score of scores) {
    const mid = score.mid
    musicdata.push(K.ATTR({ musicid: `${mid}` }, {
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

  const sticker: any[] = [];

  if (_.isArray(name.card)) {
    for (const item of name.card) {
      const id = _.get(item, 'id');
      const posX = _.get(item, 'position.0');
      const posY = _.get(item, 'position.1');
      const scaleX = _.get(item, 'scale.0');
      const scaleY = _.get(item, 'scale.1');
      const rotation = _.get(item, 'rotation');

      if (
        !isFinite(id) ||
        !isFinite(posX) ||
        !isFinite(posY) ||
        !isFinite(scaleX) ||
        !isFinite(scaleY) ||
        !isFinite(rotation)
      ) {
        continue;
      }

      sticker.push({
        id: K.ITEM('s32', id),
        pos_x: K.ITEM('float', posX),
        pos_y: K.ITEM('float', posY),
        scale_x: K.ITEM('float', scaleX),
        scale_y: K.ITEM('float', scaleY),
        rotate: K.ITEM('float', rotation),
      });
    }
  }

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
    playinfo: {
      cabid: K.ITEM('s32', 0),
      play: K.ITEM('s32', profile.play),
      playtime: K.ITEM('s32', profile.playtime),
      playterm: K.ITEM('s32', profile.playterm),
      session_cnt: K.ITEM('s32', profile.session_cnt),
      matching_num: K.ITEM('s32', 0),
      extra_stage: K.ITEM('s32', profile.extra_stage),
      extra_play: K.ITEM('s32', profile.extra_play),
      extra_clear: K.ITEM('s32', profile.extra_clear),
      encore_play: K.ITEM('s32', profile.encore_play),
      encore_clear: K.ITEM('s32', profile.encore_clear),
      pencore_play: K.ITEM('s32', profile.pencore_play),
      pencore_clear: K.ITEM('s32', profile.pencore_clear),
      max_clear_diff: K.ITEM('s32', profile.max_clear_diff),
      max_full_diff: K.ITEM('s32', profile.max_full_diff),
      max_exce_diff: K.ITEM('s32', profile.max_exce_diff),
      clear_num: K.ITEM('s32', profile.clear_num),
      full_num: K.ITEM('s32', profile.full_num),
      exce_num: K.ITEM('s32', profile.exce_num),
      no_num: K.ITEM('s32', profile.no_num),
      e_num: K.ITEM('s32', profile.e_num),
      d_num: K.ITEM('s32', profile.d_num),
      c_num: K.ITEM('s32', profile.c_num),
      b_num: K.ITEM('s32', profile.b_num),
      a_num: K.ITEM('s32', profile.a_num),
      s_num: K.ITEM('s32', profile.s_num),
      ss_num: K.ITEM('s32', profile.ss_num),
      last_category: K.ITEM('s32', profile.last_category),
      last_musicid: K.ITEM('s32', profile.last_musicid),
      last_seq: K.ITEM('s32', profile.last_seq),
      disp_level: K.ITEM('s32', profile.disp_level),
    },
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

  send.object({
    player: K.ATTR({ 'no': `$no` }, {
      now_date: K.ITEM('u64', time),
      secretmusic: {
        music: {
          musicid: K.ITEM('s32', 0),
          seq: K.ITEM('u16', 255),
          kind: K.ITEM('s32', 40),
        },
      },
      chara_list: {},
      title_parts: {},
      information: {
        info: K.ARRAY('u32', Array(50).fill(0)),
      },
      reward: {
        status: K.ARRAY('u32', Array(50).fill(0)),
      },
      rivaldata: {},
      frienddata: {},
      thanks_medal: {
        medal: K.ITEM('s32', 0),
        grant_medal: K.ITEM('s32', 0),
        grant_total_medal: K.ITEM('s32', 0),
      },
      recommend_musicid_list: K.ARRAY('s32', [0, 0, 0, 0, 0]),
      skindata: {
        skin: K.ARRAY('u32', Array(100).fill(-1)),
      },
      battledata: {
        info: {
          orb: K.ITEM('s32', 0),
          get_gb_point: K.ITEM('s32', 0),
          send_gb_point: K.ITEM('s32', 0),
        },
        greeting: {
          greeting_1: K.ITEM('str', ''),
          greeting_2: K.ITEM('str', ''),
          greeting_3: K.ITEM('str', ''),
          greeting_4: K.ITEM('str', ''),
          greeting_5: K.ITEM('str', ''),
          greeting_6: K.ITEM('str', ''),
          greeting_7: K.ITEM('str', ''),
          greeting_8: K.ITEM('str', ''),
          greeting_9: K.ITEM('str', ''),
        },
        setting: {
          matching: K.ITEM('s32', 0),
          info_level: K.ITEM('s32', 0),
        },
        score: {
          battle_class: K.ITEM('s32', 0),
          max_battle_class: K.ITEM('s32', 0),
          battle_point: K.ITEM('s32', 0),
          win: K.ITEM('s32', 0),
          lose: K.ITEM('s32', 0),
          draw: K.ITEM('s32', 0),
          consecutive_win: K.ITEM('s32', 0),
          max_consecutive_win: K.ITEM('s32', 0),
          glorious_win: K.ITEM('s32', 0),
          max_defeat_skill: K.ITEM('s32', 0),
          latest_result: K.ITEM('s32', 0),
        },
        history: {},
      },
      is_free_ok: K.ITEM('bool', 0),
      ranking: {
        skill: { rank: K.ITEM('s32', 1), total_nr: K.ITEM('s32', 1) },
        all_skill: { rank: K.ITEM('s32', 1), total_nr: K.ITEM('s32', 1) },
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
      ...addition,
      ...playerData,
      finish: K.ITEM('bool', 1),
    }),
  });
}

function getPlayerNo(data: any): number {
  return parseInt($(data).attr("player").no || '1', 10)
}

async function registerUser(refid: string, version: string, id = _.random(0, 99999999)) {
  while (await DB.FindOne<PlayerInfo>(null, { collecttion: 'profile', id })) {
    id = _.random(0, 99999999);
  }

  const defaultInfo: PlayerInfo = {
    collection: 'playerinfo',
    pluginVer: PLUGIN_VER,
    id,
    version,
    name: 'ASPHYXIA-CORE USER',
    title: 'Please edit on WebUI',
  }

  const defaultProfile = (dm): Profile => {
    return {
      collection: 'profile',
      pluginVer: PLUGIN_VER,

      game: dm ? 'dm' : 'gf',
      version,
      id,

      play: 0,
      playtime: 0,
      playterm: 0,
      session_cnt: 0,
      extra_stage: 0,
      extra_play: 0,
      extra_clear: 0,
      encore_play: 0,
      encore_clear: 0,
      pencore_play: 0,
      pencore_clear: 0,
      max_clear_diff: 0,
      max_full_diff: 0,
      max_exce_diff: 0,
      clear_num: 0,
      full_num: 0,
      exce_num: 0,
      no_num: 0,
      e_num: 0,
      d_num: 0,
      c_num: 0,
      b_num: 0,
      a_num: 0,
      s_num: 0,
      ss_num: 0,
      last_category: 0,
      last_musicid: -1,
      last_seq: 0,
      disp_level: 0,
      progress: 0,
      disp_state: 0,
      skill: 0,
      all_skill: 0,
      extra_gauge: 0,
      encore_gauge: 0,
      encore_cnt: 0,
      encore_success: 0,
      unlock_point: 0,
      max_skill: 0,
      max_all_skill: 0,
      clear_diff: 0,
      full_diff: 0,
      exce_diff: 0,
      clear_music_num: 0,
      full_music_num: 0,
      exce_music_num: 0,
      clear_seq_num: 0,
      classic_all_skill: 0
    }
  };

  const defaultRecord = (dm): Record => {
    return {
      collection: 'record',
      pluginVer: PLUGIN_VER,

      game: dm ? 'dm' : 'gf',
      version,

      diff_100_nr: 0,
      diff_150_nr: 0,
      diff_200_nr: 0,
      diff_250_nr: 0,
      diff_300_nr: 0,
      diff_350_nr: 0,
      diff_400_nr: 0,
      diff_450_nr: 0,
      diff_500_nr: 0,
      diff_550_nr: 0,
      diff_600_nr: 0,
      diff_650_nr: 0,
      diff_700_nr: 0,
      diff_750_nr: 0,
      diff_800_nr: 0,
      diff_850_nr: 0,
      diff_900_nr: 0,
      diff_950_nr: 0,
      diff_100_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_150_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_200_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_250_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_300_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_350_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_400_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_450_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_500_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_550_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_600_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_650_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_700_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_750_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_800_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_850_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_900_clear: [0, 0, 0, 0, 0, 0, 0],
      diff_950_clear: [0, 0, 0, 0, 0, 0, 0],
    }
  }

  const defaultExtra = (dm): Extra => {
    return {
      collection: 'extra',
      pluginVer: PLUGIN_VER,

      game: dm ? 'dm' : 'gf',
      version,
      id,

      playstyle: [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
      ],
      custom: Array(50).fill(0),
      list_1: Array(100).fill(-1),
      list_2: Array(100).fill(-1),
      list_3: Array(100).fill(-1),

    }
  }

  const gf = { game: 'gf', version };
  const dm = { game: 'dm', version };

  await DB.Upsert(refid, { collection: 'playerinfo', version }, defaultInfo)
  await DB.Upsert(refid, { collection: 'profile', ...gf }, defaultProfile(false))
  await DB.Upsert(refid, { collection: 'profile', ...dm }, defaultProfile(true))
  await DB.Upsert(refid, { collection: 'record', ...gf }, defaultRecord(false))
  await DB.Upsert(refid, { collection: 'record', ...dm }, defaultRecord(true))
  await DB.Upsert(refid, { collection: 'extra', ...gf }, defaultExtra(false))
  await DB.Upsert(refid, { collection: 'extra', ...dm }, defaultExtra(true))

  return defaultInfo
}

export const savePlayer: EPR = async (info, data, send) => {
  const refid = $(data).str('player.refid');
  if (!refid) return send.deny();

  const no = getPlayerNo(data);
  const version = getVersion(info);
  const dm = isDM(info);

  const game = dm ? 'dm' : 'gf';

  const profile = await getProfile(refid, version, game) as any;
  const extra = await getExtra(refid, version, game) as any;
  const rec = await getRecord(refid, version, game) as any;
  const dataplayer = $(data).element("player")

  const autoSet = (field: keyof Profile, path: string, array = false): void => {
    if (array) {
      profile[field] = dataplayer.content(path, profile[field])
    } else {
      profile[field] = dataplayer.content(path, profile[field])[0]
    }
  };

  const autoExtra = (field: keyof Extra, path: string, array = false): void => {
    if (array) {
      extra[field] = dataplayer.content(path, extra[field])
    } else {
      extra[field] = dataplayer.content(path, extra[field])[0]
    }
  };

  const autoRec = (field: keyof Record, path: string, array = false): void => {
    if (array) {
      rec[field] = dataplayer.content(path, rec[field])
    } else {
      rec[field] = dataplayer.content(path, rec[field])[0]
    }
  };

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

  autoExtra('playstyle', 'customdata.playstyle', true);
  autoExtra('custom', 'customdata.custom', true);

  await DB.Upsert(refid, { collection: 'profile', game, version }, profile)
  await DB.Upsert(refid, { collection: 'record', game, version }, rec)
  await DB.Upsert(refid, { collection: 'extra', game, version }, extra)

  const stages = $(data).elements('player.stage');
  for (const stage of stages) {
    const mid = stage.content('musicid', -1);
    const seq = stage.content('seq', -1);

    if (mid < 0 || seq < 0) continue;

    // const skill = stage.content('skill', 0);
    const newSkill = stage.content('new_skill', 0);
    const clear = stage.bool('clear');
    const fc = stage.bool('fullcombo');
    const ex = stage.bool('excellent');

    const perc = stage.content('perc', 0);
    const rank = stage.content('rank', 0);
    const meter = stage.bigint('meter', BigInt(0));
    const prog = stage.content('meter_prog', 0);


    const score = (await DB.FindOne<Scores>(refid, {
      collection: 'scores',
      mid,
      version,
      game
    })) || {
      collection: 'scores',
      game,
      version,
      pluginVer: PLUGIN_VER,
      mid,
      update: [0, 0],
      diffs: {}
    };

    if (newSkill > score.update[1]) {
      score.update[0] = seq;
      score.update[1] = newSkill;
    }

    score.diffs[seq] = {
      perc: Math.max(_.get(score.diffs[seq], 'perc', 0), perc),
      rank: Math.max(_.get(score.diffs[seq], 'rank', 0), rank),
      meter: meter.toString(),
      prog: Math.max(_.get(score.diffs[seq], 'prog', 0), prog),
      clear: _.get(score.diffs[seq], 'clear') || clear,
      fc: _.get(score.diffs[seq], 'fc') || fc,
      ex: _.get(score.diffs[seq], 'ex') || ex,
    };

    await DB.Upsert(refid, {
      collection: 'scores',
      mid,
      version,
      game
    }, score)
  }

  await send.object({
    player: K.ATTR({ no: `${no}` }, {
      skill: { rank: K.ITEM('s32', 1), total_nr: K.ITEM('s32', 1) },
      all_skill: { rank: K.ITEM('s32', 1), total_nr: K.ITEM('s32', 1) },
      kac2018: {
        data: {
          term: K.ITEM('s32', 0),
          total_score: K.ITEM('s32', 0),
          score: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
          music_type: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
          play_count: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
        },
      },
    }),
    gamemode: _.get(data, 'gamemode'),
  });
};

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

async function getScores(refid: string, version: string, game: 'gf' | 'dm') {
  return (await DB.Find<Scores>(refid, {
    collection: 'scores',
    version: version,
    game: game
  }))
}
