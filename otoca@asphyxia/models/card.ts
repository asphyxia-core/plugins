import { Accessory } from './user';

export interface Card {
  collection: 'card';
  otocard_id: string;
  inquire_id: string;
  user_seq: number;
  doll_seq: number;
  kira_type: number;
  kira: number[]; // hp, atk, mat, spd bonus printed on this card
  // the coord printed on this card: scanning an old card plays the latest doll in that card's coord,
  // even with items sold since then
  equip: number[][];
  accessory: Accessory[];
  decoseal_id: number;
  from_otocard_id: string;
  created: number;
}
