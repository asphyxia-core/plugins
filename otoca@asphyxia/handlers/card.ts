// New players and dolls, and scanning a printed card.
import { accessoryNode, equipWithAccessories, gradeList } from '../closet';
import { EPISODE } from '../data';
import { getCard, getDoll, getUser, nextSeq, saveUser } from '../db';
import { greeting, newDoll, newUser } from '../player';
import { bool, log, now, u8, u32 } from '../utils';
import { phase } from './version';

export const addUser: EPR = async (info, data, send) => {
  const u = newUser(await nextSeq('user'), $(data).str('user_name', ''));
  const d = await newDoll(u, $(data).number('doll_id', 0), $(data).str('doll_name', ''));
  await DB.Insert(u);
  send.object({
    user_seq: u32(u.user_seq),
    doll_seq: u32(d.doll_seq),
    doll_seed: u32(d.doll_seed),
    powder_num: u32(u.powder_num),
    stamp_num: u32(u.stamp_num),
    mission_no: u8(u.mission_no),
    question_id: u8(u.question_id),
    ticket_rc_first: bool(u.ticket_rc_first),
  });
};

export const addDoll: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  const d = await newDoll(u, $(data).number('doll_id', 0), $(data).str('doll_name', ''));
  await saveUser(u);
  send.object({ doll_seq: u32(d.doll_seq), doll_seed: u32(d.doll_seed) });
};

export const getCardInfo: EPR = async (info, data, send) => {
  const otocard_id = $(data).str('otocard_id', '');
  const card = await getCard(otocard_id);
  const u = card && (await getUser(card.user_seq));
  const d = card && (await getDoll(card.doll_seq));
  if (!u || !d) {
    // status 1: the game plays offline with what the QR holds
    log(`getCardInfo: unknown card ${otocard_id}`, {});
    return send.deny();
  }
  const worn = card.accessory;
  send.object({
    user_seq: u32(u.user_seq),
    user_name: K.ITEM('str', u.user_name),
    doll_seq: u32(d.doll_seq),
    doll_id: u32(d.doll_id),
    doll_name: K.ITEM('str', d.doll_name),
    doll_level: u32(d.doll_level),
    doll_seed: u32(d.doll_seed),
    locked: bool(!!u.keycard_id), // tied to a key card: reads the key next, closet limit 999
    luck_offset: u32(d.luck_offset),
    equip: [...card.equip, ...worn.map(a => [a.id, a.gr])].map(e => ({ equip_id: u32(e[0]), equip_grade: u8(e[1]) })),
    accessory: worn.map(accessoryNode),
    score: {
      release_state: u32(u.release_state),
      stamp_conv_num: u32(u.stamp_conv_num),
      user_flags: K.ARRAY('u8', u.user_flags),
      last_time: K.ITEM('time', u.last_time),
      curr_time: K.ITEM('time', now()),
      greeting_level: u8(greeting(u.last_time)),
      user_marker: u8(u.user_marker),
      mission_no: u8(u.mission_no),
      setting: { sort_type: u8(u.sort_type), disp_skill: u8(u.disp_skill) },
      question_id: u8(u.question_id),
      enemy: u.enemy.map(e => ({ enemy_team_id: u32(e[0]), enemy_team_level: u32(e[1]) })),
      last_enemy: u.last_enemy.map(e => ({ episode: u8(e[0]), enemy_team_id: u32(e[1]), enemy_team_level: u32(e[2]) })),
      enemy_detail: { i: Object.keys(u.friendly).map(t => ({ id: K.ITEM('u16', +t), pt: u32(u.friendly[t]) })) },
    },
    // the bonus printed on this card; the game applies it to one battle
    offset: { kira_hp: u8(card.kira[0]), kira_atk: u8(card.kira[1]), kira_mat: u8(card.kira[2]), kira_spd: u8(card.kira[3]) },
    active_key: bool(!!u.keycard_id),
    version: { episode: u8(EPISODE), phase: u8(phase()) },
    makeup: { hair_color: u8(d.makeup[0]), eye_color: u8(d.makeup[1]) },
    closet: {
      powder_num: u32(u.powder_num),
      stamp_num: u32(u.stamp_num),
      wallet: {
        balance: u32(u.balance),
        ticket_half_price: bool(u.ticket_half_price),
        ticket_rc_first: bool(u.ticket_rc_first),
      },
      equip: { i: gradeList(equipWithAccessories(u)) },
      material: { i: gradeList(u.material) },
      decoseal: Object.keys(u.decoseal).slice(0, 1).map(id => ({ decoseal_id: u32(+id), decoseal_num: u32(u.decoseal[id]) })),
      accessory: {
        i: u.accessory.map(a => ({ aseq: u32(a.aseq), id: u32(a.id), gr: u8(a.gr), offset: K.ARRAY('u8', a.offset) })),
      },
      cardbg: u.cardbg.slice(0, 4).map(id => ({ id: u8(id) })),
    },
  });
};
