export interface Doll {
  collection: 'doll';
  doll_seq: number;
  user_seq: number;
  doll_id: number;
  doll_name: string;
  doll_seed: number;
  doll_level: number;
  equip: number[][]; // 4 slots [equip_id, grade]: weapon, top, bottom, shoes
  accessory: number[]; // 2 slots of accessory_seq, 0 = empty
  makeup: number[]; // hair_color, eye_color
  luck_offset: number;
}
