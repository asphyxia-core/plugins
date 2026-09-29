// What a play reports: battle results, gold and friend points, stamps, letters and questionnaires.
import { LETTER_WALLPAPER, MAX_BALANCE } from '../data';
import { getDoll, getUser, saveDoll, saveUser } from '../db';
import { updateRelease } from '../player';
import { now, u32 } from '../utils';

export const report: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.success();
  const b = $(data).element('battle');
  if (b) {
    const team = b.number('enemy_team_id', 0);
    const level = b.number('enemy_team_level', 0);
    const episode = b.number('episode', 0);
    // battle_result 0 win, 1 lose, 2 draw; the game adds a beaten pair to score/enemy only on a win
    if (team && b.number('battle_result', 1) === 0 && u.enemy.length < 200 &&
        !u.enemy.some(e => e[0] === team && e[1] === level)) u.enemy.push([team, level]);
    if (team) u.last_enemy = [[episode, team, level], ...u.last_enemy.filter(e => e[0] !== episode)].slice(0, 6);
  }
  u.user_flags = $(data).numbers('user_flags', u.user_flags);
  u.user_marker = $(data).number('user_marker', u.user_marker);
  u.sort_type = $(data).number('setting.sort_type', u.sort_type);
  u.disp_skill = $(data).number('setting.disp_skill', u.disp_skill);
  u.last_time = now();
  const d = await getDoll($(data).number('doll_seq'));
  if (d && d.user_seq === u.user_seq) {
    d.doll_level = Math.max(1, Math.min(31, $(data).number('doll_level', d.doll_level)));
    await saveDoll(d);
  }
  await updateRelease(u);
  await saveUser(u);
  send.success();
};

// Only gold and friend points: doll levels are raised by the game itself.
export const addExp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  u.balance = Math.min(MAX_BALANCE, u.balance + $(data).number('gold.add_amount', 0));
  const team = $(data).number('friendly.enemy_team_id', 0);
  if (team) u.friendly[team] = (u.friendly[team] || 0) + $(data).number('friendly.add_point', 0);
  await saveUser(u);
  send.object({ balance: u32(u.balance), friend_point: u32(team ? u.friendly[team] : 0) });
};

// The stamp card has 10 squares; a full card turns into star powder.
export const addStamp: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (!u) return send.deny();
  // one stamp per play (official), plus stamps from gifts; the game animates old -> after one by one
  const after = u.stamp_num + (U.GetConfig('stamp_double') ? 2 : 1) + u.stamp_bonus;
  u.stamp_bonus = 0;
  const full = Math.floor(after / 10);
  u.stamp_num = after % 10;
  u.powder_num += full; // one powder per full card (official)
  u.stamp_conv_num += full;
  await saveUser(u);
  send.object({
    powder_num: u32(u.powder_num),
    stamp_num: u32(u.stamp_num),
    stamp_conv_rate: u32(10), // squares per card; the game divides by it
    stamp_after_num: u32(after),
  });
};

export const reportMission: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  const n = $(data).number('mission_no', 0);
  if (u && u.mission_no === n) {
    u.mission_no = Math.min(n + 1, 9); // the game treats every mission below mission_no as done
    // all 8 letters: the original wallpaper (closet/cardbg adds to the wallpapers the game offers)
    if (u.mission_no === 9 && !u.cardbg.includes(LETTER_WALLPAPER) && u.cardbg.length < 4) u.cardbg.push(LETTER_WALLPAPER);
    await saveUser(u);
  }
  send.success();
};

// score/question_id is the questionnaire still to show; no questionnaires are offered, so it stays 0.
export const reportQuestion: EPR = async (info, data, send) => {
  const u = await getUser($(data).number('user_seq'));
  if (u) {
    u.question_id = 0;
    await saveUser(u);
  }
  send.success();
};
