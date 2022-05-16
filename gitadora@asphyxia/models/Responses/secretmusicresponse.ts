import { Profile } from "../profile";

export interface SecretMusicResponse {
    musicid: KITEM<'s32'>;
    seq: KITEM<'u16'>;
    kind: KITEM<'s32'>;
}

export function getSecretMusicResponse(profile: Profile) : SecretMusicResponse[] {
    let response : SecretMusicResponse[] = []
  
    if (!profile.secretmusic?.music ) {
      return response
    }
  
    for (let music of profile.secretmusic.music) {
      response.push({
        musicid: K.ITEM('s32', music.musicid),
        seq: K.ITEM('u16', music.seq),
        kind: K.ITEM('s32', music.kind)
      })
    }
  
    return response
  }