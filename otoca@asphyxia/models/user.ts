export interface Accessory {
  aseq: number;
  id: number;
  gr: number;
  offset: number[]; // param_offset, skill_offset_1..3 (percent of the equip's base values)
}

export interface User {
  collection: 'user';
  user_seq: number;
  user_name: string;
  keycard_id: string;
  key_inquire_id: string;
  powder_num: number;
  stamp_num: number;
  stamp_conv_num: number;
  stamp_bonus: number; // stamps from gifts, pressed with the next addStamp
  balance: number;
  ticket_half_price: boolean;
  ticket_rc_first: boolean;
  equip: { [id: string]: number[] }; // count per grade 0..2, accessories not included
  material: { [id: string]: number[] };
  decoseal: { [id: string]: number };
  accessory: Accessory[];
  next_aseq: number;
  cardbg: number[];
  release_state: number;
  user_flags: number[];
  last_time: number;
  user_marker: number;
  mission_no: number;
  question_id: number;
  sort_type: number;
  disp_skill: number;
  enemy: number[][]; // [team, level] of every team/level beaten
  last_enemy: number[][]; // [episode, team, level], newest first
  friendly: { [team: string]: number };
  gifts_used: string[];
}
