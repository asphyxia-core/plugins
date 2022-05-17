import { PlayerRanking } from "../playerranking"

export interface SaveProfileResponse
{
    skill: {
        rank: KITEM<'s32'>,
        total_nr: KITEM<'s32'>
    }
    all_skill: {
        rank: KITEM<'s32'>,
        total_nr: KITEM<'s32'>
    }
    kac2018: {
        data: {
            term: KITEM<'s32'>,
            total_score: KITEM<'s32'>,
            score: KARRAY<'s32'>,
            music_type: KARRAY<'s32'>,
            play_count: KARRAY<'s32'>
        }
    }
}

export function getSaveProfileResponse(playerNo: number, ranking : PlayerRanking)
{
  const result : SaveProfileResponse = K.ATTR({ no: `${playerNo}` }, {
    skill: { rank: K.ITEM('s32', ranking.skill), total_nr: K.ITEM('s32', ranking.totalPlayers) },
    all_skill: { rank: K.ITEM('s32', ranking.all_skill), total_nr: K.ITEM('s32', ranking.totalPlayers) },
    kac2018: {
      data: {
        term: K.ITEM('s32', 0),
        total_score: K.ITEM('s32', 0),
        score: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
        music_type: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
        play_count: K.ARRAY('s32', [0, 0, 0, 0, 0, 0]),
      },
    },
  })

  return result
}