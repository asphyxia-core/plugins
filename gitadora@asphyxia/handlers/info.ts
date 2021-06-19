import { getEncoreStageData } from "../data/extrastage";

export const shopInfoRegist: EPR = async (info, data, send) => {
  send.object({
    data: {
      cabid: K.ITEM('u32', 1),
      locationid: K.ITEM('str', 'Asphyxia'),
    },
    temperature: {
      is_send: K.ITEM('bool', 0),
    },
    tax: {
      tax_phase: K.ITEM('s32', 0),
    },
  })
}

export const gameInfoGet: EPR = async (info, data, send) => {
  const addition: any = {
    monstar_subjugation: {
      bonus_musicid: K.ITEM('s32', 0),
    },
    bear_fes: {},
    nextadium: {},
  };
  const time = BigInt(31536000);
  for (let i = 1; i <= 20; ++i) {
    const obj = {
      term: K.ITEM('u8', 0),
      start_date_ms: K.ITEM('u64', time),
      end_date_ms: K.ITEM('u64', time),
    };
    if (i == 1) {
      addition[`phrase_combo_challenge`] = obj;
      addition[`long_otobear_fes_1`] = {
        term: K.ITEM('u8', 0),
        start_date_ms: K.ITEM('u64', time),
        end_date_ms: K.ITEM('u64', time),
        bonus_musicid: {},
      };
      addition[`sdvx_stamprally3`] = obj;
      addition[`chronicle_1`] = obj;
      addition[`paseli_point_lottery`] = obj;
      addition['sticker_campaign'] = {
        term: K.ITEM('u8', 0),
        sticker_list: {},
      };
      addition['thanksgiving'] = {
        ...obj,
        box_term: {
          state: K.ITEM('u8', 0)
        }
      };
      addition['lotterybox'] = {
        ...obj,
        box_term: {
          state: K.ITEM('u8', 0)
        }
      };
    } else {
      addition[`phrase_combo_challenge_${i}`] = obj;
    }

    if (i <= 4) {
      addition['monstar_subjugation'][`monstar_subjugation_${i}`] = obj;
      addition['bear_fes'][`bear_fes_${i}`] = obj;
    }

    if (i <= 3) {
      addition[`kouyou_challenge_${i}`] = {
        term: K.ITEM('u8', 0),
        bonus_musicid: K.ITEM('s32', 0),
      };
    }
  }

  const extraData = getEncoreStageData(info)

  await send.object({
    now_date: K.ITEM('u64', BigInt(Date.now())),
    extra: {
      extra_lv: K.ITEM('u8', extraData.level),
      extramusic: {
        music: extraData.musics.map(mid => {
          return {
            musicid: K.ITEM('s32', mid),
            get_border: K.ITEM('u8', 0),
          }
        })
      }
    },
    infect_music: { term: K.ITEM('u8', 0) },
    unlock_challenge: { term: K.ITEM('u8', 0) },
    battle: { term: K.ITEM('u8', 0) },
    battle_chara: { term: K.ITEM('u8', 0) },
    data_ver_limit: { term: K.ITEM('u8', 0) },
    ea_pass_propel: { term: K.ITEM('u8', 0) },
    monthly_skill: {
      term: K.ITEM('u8', 0),
      target_music: {
        music: {
          musicid: K.ITEM('s32', 0),
        },
      },
    },
    update_prog: { term: K.ITEM('u8', 0) },
    rockwave: { event_list: {} },
    general_term: {},
    jubeat_omiyage_challenge: {},
    kac2017: {},
    nostalgia_concert: {},
    trbitemdata: {},
    ctrl_movie: {},
    ng_jacket: {},
    ng_recommend_music: {},
    ranking: {
      skill_0_999: {},
      skill_1000_1499: {},
      skill_1500_1999: {},
      skill_2000_2499: {},
      skill_2500_2999: {},
      skill_3000_3499: {},
      skill_3500_3999: {},
      skill_4000_4499: {},
      skill_4500_4999: {},
      skill_5000_5499: {},
      skill_5500_5999: {},
      skill_6000_6499: {},
      skill_6500_6999: {},
      skill_7000_7499: {},
      skill_7500_7999: {},
      skill_8000_8499: {},
      skill_8500_9999: {},
      total: {},
      original: {},
      bemani: {},
      famous: {},
      anime: {},
      band: {},
      western: {},
    },
    processing_report_state: K.ITEM('u8', 0),
    assert_report_state: K.ITEM('u8', 0),
    recommendmusic: { '@attr': { nr: 0 } },
    demomusic: { '@attr': { nr: 0 } },
    event_skill: {},
    temperature: { is_send: K.ITEM('bool', 0) },
    bemani_summer_2018: { is_open: K.ITEM('bool', 0) },
    kac2018: {
      event: {
        term: K.ITEM('s32', 0),
        since: K.ITEM('u64', BigInt(0)),
        till: K.ITEM('u64', BigInt(0)),
        is_open: K.ITEM('bool', 0),
        target_music: {
          music_id: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
        },
      },
    },
    ...addition,
  });
};
