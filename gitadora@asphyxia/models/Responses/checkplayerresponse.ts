export interface CheckPlayerResponse {    
    player: {
    name: KITEM<'str'>,
    charaid: KITEM<'s32'>,
    did: KITEM<'s32'>,
    skilldata: {
        skill: KITEM<'s32'>
        all_skill: KITEM<'s32'>
        old_skill: KITEM<'s32'>
        old_all_skill: KITEM<'s32'>
    },  
  }
}

export function getCheckPlayerResponse(playerNo : number, name: string, id: number) : CheckPlayerResponse
{
  return {
      player: K.ATTR({ no: `${playerNo}`, state: '2' }, {
        name: K.ITEM('str', name),
        charaid: K.ITEM('s32', 0),
        did: K.ITEM('s32', id),
        skilldata: {
          skill: K.ITEM('s32', 0),
          all_skill: K.ITEM('s32', 0),
          old_skill: K.ITEM('s32', 0),
          old_all_skill: K.ITEM('s32', 0),
        }
      })
    }
}