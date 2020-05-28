import { EVENT4, COURSES4, EXTENDS4 } from '../data/hvn';
import { EVENT5, COURSES5, EXTENDS5 } from '../data/vvw';
export const common: EPR = async (info, data, send) => {
  let events = [];
  let courses = [];
  let extend = [];

  switch (info.method) {
    case 'sv4_common': {
      events = EVENT4;
      courses = COURSES4;
      extend = EXTENDS4;
      break;
    }
    case 'sv5_common': {
      events = EVENT5;
      courses = COURSES5;
      extend = EXTENDS5;
      break;
    }
  }

  let songs = [];

  if (U.GetConfig('unlock_all_songs')) {
    for (let i = 1; i < 1600; ++i) {
      for (let j = 0; j < 5; ++j) {
        songs.push({
          music_id: K.ITEM('s32', i),
          music_type: K.ITEM('u8', j),
          limited: K.ITEM('u8', 3),
        });
      }
    }
  }

  send.object(
    {
      event: {
        info: events.map(e => ({
          event_id: K.ITEM('str', e),
        })),
      },
      extend: {
        info: extend.map(e => ({
          extend_id: K.ITEM('u32', e.id),
          extend_type: K.ITEM('u32', e.type),
          param_num_1: K.ITEM('s32', e.params[0]),
          param_num_2: K.ITEM('s32', e.params[1]),
          param_num_3: K.ITEM('s32', e.params[2]),
          param_num_4: K.ITEM('s32', e.params[3]),
          param_num_5: K.ITEM('s32', e.params[4]),
          param_str_1: K.ITEM('str', e.params[5]),
          param_str_2: K.ITEM('str', e.params[6]),
          param_str_3: K.ITEM('str', e.params[7]),
          param_str_4: K.ITEM('str', e.params[8]),
          param_str_5: K.ITEM('str', e.params[9]),
        })),
      },
      music_limited: { info: songs },
      skill_course: {
        info: courses.reduce(
          (acc, s) =>
            acc.concat(
              s.courses.map(c => ({
                season_id: K.ITEM('s32', s.id),
                season_name: K.ITEM('str', s.name),
                season_new_flg: K.ITEM('bool', s.isNew),
                course_type: K.ITEM('s16', 0),
                course_id: K.ITEM('s16', c.id),
                course_name: K.ITEM('str', c.name),
                skill_level: K.ITEM('s16', c.level),
                skill_name_id: K.ITEM('s16', c.nameID),
                matching_assist: K.ITEM('bool', c.assist),
                clear_rate: K.ITEM('s32', 5000),
                avg_score: K.ITEM('u32', 15000000),
                track: c.tracks.map(t => ({
                  track_no: K.ITEM('s16', t.no),
                  music_id: K.ITEM('s32', t.mid),
                  music_type: K.ITEM('s8', t.mty),
                })),
              }))
            ),
          []
        ),
      },
    },
    { encoding: 'utf8' }
  );
};
