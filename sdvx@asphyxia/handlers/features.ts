import { Profile } from '../models/profile';
import { MusicRecord } from '../models/music_record';
import { getVersion, IDToCode, GetCounter } from '../utils';
import { Mix } from '../models/mix';
import { MatchingRoom } from '../models/matching';

let Tracker:MatchingRoom[] = [];

export const hiscore: EPR = async (info, data, send) => {
  const records = await DB.Find<MusicRecord>(null, { collection: 'music' });

  const version = getVersion(info);

  const profiles = _.groupBy(
    await DB.Find<Profile>(null, { collection: 'profile' }),
    '__refid'
  );

  return send.object({
    sc: {
      d: _.map(
        _.groupBy(records, r => {
          return `${r.mid}:${r.type}`;
        }),
        r => _.maxBy(r, 'score')
      ).map(r => ({
        id: K.ITEM('u32', r.mid),
        ty: K.ITEM('u32', r.type),
        a_sq: K.ITEM('str', IDToCode(profiles[r.__refid][0].id)),
        a_nm: K.ITEM('str', profiles[r.__refid][0].name),
        a_sc: K.ITEM('u32', r.score),
        l_sq: K.ITEM('str', IDToCode(profiles[r.__refid][0].id)),
        l_nm: K.ITEM('str', profiles[r.__refid][0].name),
        l_sc: K.ITEM('u32', r.score),
        ax_sq: K.ITEM('str', IDToCode(profiles[r.__refid][0].id)),
        ax_nm: K.ITEM('str', profiles[r.__refid][0].name),
        ax_sc: K.ITEM('u32', r.exscore),
        lx_sq: K.ITEM('str', IDToCode(profiles[r.__refid][0].id)),
        lx_nm: K.ITEM('str', profiles[r.__refid][0].name),
        lx_sc: K.ITEM('u32', r.exscore),
        avg_sc: K.ITEM('u32', r.score),
        cr: K.ITEM('s32', 10000)
      })),
    },
  });
};

export const rival: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const rivals = (
    await DB.Find<Profile>(null, { collection: 'profile' })
  ).filter(p => p.__refid != refid);

  return send.object({
    rival: await Promise.all(
      rivals.map(async (p, index) => {
        return {
          no: K.ITEM('s16', index),
          seq: K.ITEM('str', IDToCode(p.id)),
          name: K.ITEM('str', p.name),
          music: (
            await DB.Find<MusicRecord>(p.__refid, { collection: 'music' })
          ).map(r => ({
            param: K.ARRAY('u32', [r.mid, r.type, r.score, r.exscore, r.clear, r.grade]),
          })),
        };
      })
    ),
  });
};

export const saveMix: EPR = async (info, data, send) => {
  const refid = $(data).str('ref_id');
  if (!refid) return send.deny();

  const profile = await DB.FindOne<Profile>(refid, { collection: 'profile' });
  if (!profile) return send.deny();

  const mix = $(data).element('automation');

  const id = await GetCounter('mix');
  let code = _.padStart(_.random(0, 999999999999).toString(), 12, '0');
  while (await DB.FindOne<Mix>({ collection: 'mix', code })) {
    code = _.padStart(_.random(0, 999999999999).toString(), 12, '0');
  }

  const doc = await DB.Insert<Mix>({
    collection: 'mix',
    id,
    code,
    name: mix.str('mix_name'),
    creator: profile.name,
    param: mix.str('generate_param'),
    tag: mix.number('tag_bit'),
    jacket: mix.number('jacket_id'),
  });

  return send.object({
    automation: {
      mix_id: K.ITEM('s32', id),
      mix_code: K.ITEM('str', doc.code),
      seq: K.ITEM('str', doc.code),
      mix_name: K.ITEM('str', doc.name),
      player_name: K.ITEM('str', doc.creator),
      generate_param: K.ITEM('str', doc.param),
      distribution_date: K.ITEM('u32', 19990101),
      jacket_id: K.ITEM('s32', doc.jacket),
      tag_bit: K.ITEM('s32', doc.tag),
      like_flg: K.ITEM('bool', 0),
    },
  });
};

export const loadMix: EPR = async (info, data, send) => {
  const code = $(data).str('mix_code');

  const mix = await DB.FindOne<Mix>({ collection: 'mix', code });
  if (!mix) {
    return send.object({ result: K.ITEM('s32', 1) });
  }

  return send.object({
    automation: {
      mix_id: K.ITEM('s32', mix.id),
      mix_code: K.ITEM('str', mix.code),
      seq: K.ITEM('str', mix.code),
      mix_name: K.ITEM('str', mix.name),
      player_name: K.ITEM('str', mix.creator),
      generate_param: K.ITEM('str', mix.param),
      distribution_date: K.ITEM('u32', 19990101),
      jacket_id: K.ITEM('s32', mix.jacket),
      tag_bit: K.ITEM('s32', mix.tag),
      like_flg: K.ITEM('bool', 0),
    },
  });
};


export const globalMatch: EPR = async (info, data, send) => {
  const gipArr = $(data).numbers('gip');
  const lipArr = $(data).numbers('lip');
  const gip = gipArr.join('.');
  const lip = lipArr.join('.');
  const gameID = $(data).number('mid');

  const filter = $(data).number('filter');

  Tracker = Tracker.filter(e => Math.trunc(new Date().getTime()/1000) - e.sec <= 90)
  
  let curr_game_arr = Tracker.filter(e => e.filter == filter);
  curr_game_arr = curr_game_arr.filter(e => e.gameID == gameID);

  console.log(JSON.stringify(curr_game_arr,null,2))


  let in_tracker = false;

  for(const element of curr_game_arr) {
    if(element.gip == gip){
      in_tracker = true;
      break;
    }
  }

  if(!in_tracker){
    let curr_game:MatchingRoom;
    curr_game = <MatchingRoom> {
      gameID:gameID,
      gip:gip,
      lip:lip,
      sec: Math.trunc(new Date().getTime()/1000),
      port:$(data).number('port'),
      filter:filter
    };
    Tracker.push(curr_game);
  }
  
  
  console.log(JSON.stringify(Tracker,null,2))

  let temp = {
    entry_id: K.ITEM('u32',0),
    entry: curr_game_arr.map(e => ({
        gip: K.ITEM('4u8',e.gip.split('.').map(e => parseInt(e))),
        lip: K.ITEM('4u8',e.lip.split('.').map(e => parseInt(e))),
        port: K.ITEM('u16',e.port),
    }))
  }
  console.log(JSON.stringify(temp, null, 2));

  send.object(temp);
  

}