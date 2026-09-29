import { EPISODE, PHASE } from '../data';
import { bool, u8, u32 } from '../utils';

// Sent by ealocal every `expire` seconds from the attract loop; the game waits for the first one at boot.
export const getVersion: EPR = async (info, data, send) => {
  const limited = U.GetConfig('limited_enemy') ? 1 : 0;
  send.object({
    expire: u32(600),
    episode: u8(EPISODE),
    phase: u8(PHASE),
    marker: u8(U.GetConfig('marker')),
    campaign: {
      trial_play: bool(false),
      trial_shop: bool(U.GetConfig('trial_shop')), // one free salon try per player; the game keeps the flag
      starkira_free: bool(U.GetConfig('starkira_free')),
      stamp_double: bool(U.GetConfig('stamp_double')),
      limited_enemy: K.ARRAY('bool', [0, 0, limited, 0, 0, 0, 0, 0]), // only slot 2 has an enemy (team 63)
    },
    question: { id: u8(0), reward: { type: u8(0), id: u32(0), grade: u8(0) } },
  });
};
