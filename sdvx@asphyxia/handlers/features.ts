import { Profile } from '../models/profile';
import { MusicRecord } from '../models/music_record';
import { IDToCode, GetCounter } from '../utils';
import { Mix } from '../models/mix';

export const hiscore: EPR = async (info, data, send) => {
  const records = await DB.Find<MusicRecord>(null, { collection: 'music' });

  const profiles = _.groupBy(
    await DB.Find<Profile>(null, { collection: 'profile' }),
    '__refid'
  );

  send.object({
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

  send.object({
    rival: await Promise.all(
      rivals.map(async (p, index) => {
        return {
          no: K.ITEM('s16', index),
          seq: K.ITEM('str', IDToCode(p.id)),
          name: K.ITEM('str', p.name),
          music: (
            await DB.Find<MusicRecord>(p.__refid, { collection: 'music' })
          ).map(r => ({
            param: K.ARRAY('u32', [r.mid, r.type, r.score, r.clear, r.grade]),
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

  send.object({
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
    send.object({ result: K.ITEM('s32', 1) });
    return;
  }

  send.object({
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
