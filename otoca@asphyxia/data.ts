// Values taken from the game's data (data_ncg/paramdb) and the arcade's rules.

// versiondata.csv: base 5-2, newest 5-11. 5-6 to 5-11 unlock the same content; only the rival card pack
// (rivalcard_packdata.csv: the last row at or below the version) and its title-screen icon differ,
// so the phase picks the pack.
export const EPISODE = 5;
export const RIVAL_PACKS = [
  { name: 'ジュエル・ソング', phase: 7 },
  { name: 'ミッドサマーナイト・ドリーム', phase: 8 },
  { name: 'スターズ・シャイニング', phase: 9 },
  { name: 'ファイアリー・エンジェル', phase: 10 },
  { name: 'レ・フェニーチ', phase: 11 },
];
// Alphabet of the ids the game packs into its QR codes (5 bits per char).
export const ID_CHARS = '0123456789ABCDEFGHJKLMNPRSTUWXYZ';
// equipdata.csv rows with kind 4 (accessories): they carry an accessory_seq.
export const ACCESSORY_IDS: number[][] = [
  [41, 52], [144, 203], [206, 212], [293, 347], [351, 356], [360, 361], [365, 366],
  [470, 531], [535, 536], [584, 609], [619, 626], [648, 664], [696, 720], [731, 740],
];
// dollinitdata.csv: starting equips (weapon, top, bottom, shoes) per doll_id.
export const DOLL_INIT: { [doll_id: number]: number[] } = {
  1: [9, 18, 29, 40], 2: [9, 20, 31, 40], 3: [9, 17, 28, 40],
  4: [9, 19, 30, 40], 5: [9, 21, 32, 40], 6: [9, 409, 438, 40],
};
// Accessory stat / skill 1-3 percent ranges per grade N, R, SR (wiki item list: accessories vary per piece).
export const ACCESSORY_OFFSET = [
  [[60, 80], [80, 100], [50, 100], [0, 0]],
  [[70, 90], [100, 100], [80, 100], [40, 50]],
  [[80, 100], [100, 100], [100, 100], [80, 100]],
];
export const FIRST_KEY_ACCESSORY = 144; // ピンクマーチリボン, made in the tailor tutorial when the first key is made
export const LETTER_WALLPAPER = 29; // guess: card_bg_0018 (nyandora night sky), the reward for all 8 letters
export const TEMP_ASEQ = 1000000000; // the game's own placeholder seqs for this play's drops (sell scene)
export const MAX_BALANCE = 9999999;
