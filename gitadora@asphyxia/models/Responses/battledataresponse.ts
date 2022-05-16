export interface BattleDataResponse
{
    info: {
        orb: KITEM<'s32'>,
        get_gb_point: KITEM<'s32'>,
        send_gb_point: KITEM<'s32'>,
    }
    greeting: {
        greeting_1: KITEM<'str'>,
        greeting_2: KITEM<'str'>,
        greeting_3: KITEM<'str'>,
        greeting_4: KITEM<'str'>,
        greeting_5: KITEM<'str'>,
        greeting_6: KITEM<'str'>,
        greeting_7: KITEM<'str'>,
        greeting_8: KITEM<'str'>,
        greeting_9: KITEM<'str'>,

    }
    setting: {
        matching: KITEM<'s32'>,
        info_level: KITEM<'s32'>,
    }

    score: {
        battle_class: KITEM<'s32'>,
          max_battle_class: KITEM<'s32'>,
          battle_point:  KITEM<'s32'>,
          win: KITEM<'s32'>,
          lose: KITEM<'s32'>,
          draw: KITEM<'s32'>,
          consecutive_win:  KITEM<'s32'>,
          max_consecutive_win:  KITEM<'s32'>,
          glorious_win:  KITEM<'s32'>,
          max_defeat_skill: KITEM<'s32'>,
          latest_result:  KITEM<'s32'>,

    }
    history: {}
}

export function getDefaultBattleDataResponse() : BattleDataResponse {
    return {
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
      }   
}
