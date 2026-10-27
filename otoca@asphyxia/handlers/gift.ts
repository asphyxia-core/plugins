// Gift QRs scanned after the doll card.
import { getUser } from '../db';
import { u8, u32 } from '../utils';

// Only type 4 (the offline card the game prints when setCardInfo fails) is honoured.
// The apology gift itself is taken later by addItem with gift_type 4. Past campaigns answer 5 (expired).
export const receiveGift: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const gift = $(data).element('info');
  const type = gift ? gift.number('gift_type', 0) : 0;
  const code = gift ? gift.str('gift_code', '') : '';
  const status = type !== 4 ? 5 : u && u.gifts_used.includes(code) ? 2 : 1;
  send.object({
    powder_num: u32(u ? u.powder_num : 0), // always overwrites the game's count
    status: [{ gift_type: u8(type), gift_status: u8(status) }],
  });
};

export const receiveItem: EPR = async (info, data, send) => {
  send.object({ gift_type: u8(7), gift_status: u8(5) });
};
