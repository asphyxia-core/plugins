import { Profile } from "../profile"
import { Record } from "../record"

export interface PlayerRecordResponse {
    max_record: {
        skill: KITEM<'s32'>,
        all_skill: KITEM<'s32'>,
        clear_diff: KITEM<'s32'>,
        full_diff: KITEM<'s32'>,
        exce_diff: KITEM<'s32'>,
        clear_music_num: KITEM<'s32'>,
        full_music_num: KITEM<'s32'>,
        exce_music_num: KITEM<'s32'>,
        clear_seq_num: KITEM<'s32'>,
        classic_all_skill: KITEM<'s32'>
    },
    diff_record: {
        diff_100_nr: KITEM<'s32'>,
        diff_150_nr: KITEM<'s32'>,
        diff_200_nr: KITEM<'s32'>,
        diff_250_nr: KITEM<'s32'>,
        diff_300_nr: KITEM<'s32'>,
        diff_350_nr: KITEM<'s32'>,
        diff_400_nr: KITEM<'s32'>,
        diff_450_nr: KITEM<'s32'>,
        diff_500_nr: KITEM<'s32'>,
        diff_550_nr: KITEM<'s32'>,
        diff_600_nr: KITEM<'s32'>,
        diff_650_nr: KITEM<'s32'>,
        diff_700_nr: KITEM<'s32'>,
        diff_750_nr: KITEM<'s32'>,
        diff_800_nr: KITEM<'s32'>,
        diff_850_nr: KITEM<'s32'>,
        diff_900_nr: KITEM<'s32'>,
        diff_950_nr: KITEM<'s32'>,
        diff_100_clear: KARRAY<'s32'>
        diff_150_clear: KARRAY<'s32'>
        diff_200_clear: KARRAY<'s32'>
        diff_250_clear: KARRAY<'s32'>
        diff_300_clear: KARRAY<'s32'>
        diff_350_clear: KARRAY<'s32'>
        diff_400_clear: KARRAY<'s32'>
        diff_450_clear: KARRAY<'s32'>
        diff_500_clear: KARRAY<'s32'>
        diff_550_clear: KARRAY<'s32'>
        diff_600_clear: KARRAY<'s32'>
        diff_650_clear: KARRAY<'s32'>
        diff_700_clear: KARRAY<'s32'>
        diff_750_clear: KARRAY<'s32'>
        diff_800_clear: KARRAY<'s32'>
        diff_850_clear: KARRAY<'s32'>
        diff_900_clear: KARRAY<'s32'>
        diff_950_clear: KARRAY<'s32'>
    }
}

export function getPlayerRecordResponse(profile: Profile, rec: Record) : PlayerRecordResponse {
    return {
        max_record: {
          skill: K.ITEM('s32', profile.max_skill),
          all_skill: K.ITEM('s32', profile.max_all_skill),
          clear_diff: K.ITEM('s32', profile.clear_diff),
          full_diff: K.ITEM('s32', profile.full_diff),
          exce_diff: K.ITEM('s32', profile.exce_diff),
          clear_music_num: K.ITEM('s32', profile.clear_music_num),
          full_music_num: K.ITEM('s32', profile.full_music_num),
          exce_music_num: K.ITEM('s32', profile.exce_music_num),
          clear_seq_num: K.ITEM('s32', profile.clear_seq_num),
          classic_all_skill: K.ITEM('s32', profile.classic_all_skill),
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
