import { CommonMusicDataField } from "../commonmusicdata"

export interface PlayableMusicResponse
{
    hot: {
        major: KITEM<'s32'>,
        minor: KITEM<'s32'>
    }
    musicinfo: KATTR<any>
}

export function getPlayableMusicResponse(music : CommonMusicDataField[]) : PlayableMusicResponse {
    return {
      hot: {
        major: K.ITEM('s32', 1),
        minor: K.ITEM('s32', 1),
      },
      musicinfo: K.ATTR({ nr: `${music.length}` }, {
        music,
      }),
    }
  }