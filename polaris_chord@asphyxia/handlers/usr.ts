/*
 * usr.* —— 玩家档案、设置、成绩的收发。
 *
 * 存档时机（反编译 game.scene.continue 的 SavePlayDataStepRunner 确认）：
 *   打完一首歌 → 结算 → **进入 Continue 场景的瞬间** 才会上报 usr.save。
 *   在结算画面直接关窗口/Alt+F4 不会存档。
 */

import { dv, enqueue, handle, list, nowStr, sub, trace } from './common';
import {
  RAW_KEYS,
  accumulateActionCountLog,
  accumulateItemChangeLog,
  buildMainOption,
  loadUser,
  pruneExtraCards,
  saveUser,
} from './store';
import { buildPlayerBody } from './playerdata';

/** usr.get —— 登录时的全量玩家数据 */
export const get: EPR = async (info, data, send) => {
  trace('usr.get', data);
  try {
    const { body } = await buildPlayerBody();
    // 启用 LZ77 压缩：全量节点 + 全部卡道具的响应超过 321KB 会被游戏截断
    //（README「曲目数量的真相」实测），压缩后 ~100KB 安全通过。
    // 游戏请求本身就是 lz77 压缩的，响应压缩是标准机制。
    await send.object(body, { compress: true });
  } catch (e) {
    enqueue('!! usr.get failed: ' + e + '\n');
    await send.success();
  }
};

export const signUp: EPR = handle();

/** usr.save —— 结算后的存档上报（名字/等级/设置/透传节点/道具变化日志） */
export const save: EPR = async (info, data, send) => {
  trace('usr.save', data);
  try {
    const u = await loadUser();
    const p = sub(data, 'usr_profile');
    if (p) {
      const name = dv(sub(p, 'usr_name'));
      if (typeof name === 'string' && name.length > 0) u.name = name;
      const rank = Number(dv(sub(p, 'usr_rank')));
      if (rank > 0) u.rank = rank;
      const exp = Number(dv(sub(p, 'exp')));
      if (Number.isFinite(exp) && exp >= 0) u.exp = exp;
      const comment = dv(sub(p, 'comment'));
      if (typeof comment === 'string') u.comment = comment;
      const tut = dv(sub(p, 'is_tutorial_cleared'));
      // 游戏每局都会上报 is_tutorial_cleared=0（未通关教程），直接覆盖会把人踢回教程，
      // 所以只在明确为 1 时置真，从不清回 false。
      if (tut !== undefined && Number(tut) === 1) u.tutorial = true;
    }
    const mo = sub(data, 'usr_main_option');
    if (mo && typeof mo === 'object') {
      for (const k of Object.keys(mo)) {
        let v = dv(mo[k]);
        if (Array.isArray(v)) v = v.length === 1 ? v[0] : undefined;
        if (v !== undefined && v !== null && typeof v !== 'object') u.option[k] = v;
      }
    }
    // 卡组 / 称号铭牌 / 游玩统计 / 排序：结构复杂，原样存整段节点，usr.get 时原样回放
    //
    // 必须序列化成字符串再存：这些节点里带着 `@attr: {__type: "s32"}`，
    // 而 nedb 拒绝任何以 "__" 开头的字段名（它自己用 __s / __refid），
    // 直接塞对象会让整个 $set 抛错 —— 连带同一次保存里的 option 也一起失败。
    for (const key of RAW_KEYS) {
      const v = sub(data, key);
      if (v && typeof v === 'object') {
        try {
          u.raw[key] = JSON.stringify(v);
        } catch (e) {
          enqueue(`!! raw ${key} 序列化失败: ${e}\n`);
        }
      }
    }
    // 道具变化日志 → 持久道具表（跨局累加）；action count 变化日志 → 计数器（跨局累加）
    accumulateItemChangeLog(u, sub(data, 'usr_item_change_log'));
    accumulateActionCountLog(u, sub(data, 'usr_action_count_change_log'));
    // 抽卡临时卡实例已经随 usr_character_card 报上来了，清掉临时表
    pruneExtraCards(u);

    await saveUser(u);
    // 结算后「Continue / 继续游玩」会 await 这次保存的结果，并检查
    // Result.IsSucceededSavePlayData —— 它看的是响应里的玩家数据，
    // 只回 now_date 会让游戏认为「没保存成功」→ 弹「回线混杂」。
    // 这里回完整档案 + 设置（不带 item，省体积）。
    await send.object({
      now_date: K.ITEM('str', nowStr()),
      usr_id: K.ITEM('s32', u.usr_id),
      usr_profile: K.ATTR({}, {
        usr_name: K.ITEM('str', u.name),
        usr_rank: K.ITEM('s32', u.rank),
        exp: K.ITEM('s32', u.exp),
        comment: K.ITEM('str', u.comment),
        is_tutorial_cleared: K.ITEM('bool', u.tutorial),
      }),
      usr_main_option: K.ATTR({}, buildMainOption(u)),
    }, { compress: false });
  } catch (e) {
    enqueue('!! usr.save failed: ' + e + '\n');
    await send.success();
  }
};

/** usr.get_usr_music —— 选曲界面的 0.00% / Best / history 都靠这个 */
export const getUsrMusic: EPR = async (info, data, send) => {
  trace('usr.get_usr_music', data);
  try {
    const u = await loadUser();
    const music = Object.keys(u.scores).map((key) => {
      const [mid, grade] = key.split('_');
      const v = u.scores[key] || {};
      return {
        music_id: K.ITEM('s32', Number(mid)),
        chart_difficulty_type: K.ITEM('s32', Number(grade)),
        achievement_rate: K.ITEM('s32', v.rate || 0),
        highscore: K.ITEM('s32', v.score || 0),
        score_rank: K.ITEM('s32', v.rank || 0),
        maxcombo: K.ITEM('s32', v.maxcombo || 0),
        combo_rank: K.ITEM('s32', v.combo_rank || 0),
        clear_status: K.ITEM('s32', v.clear || 0),
        play_count: K.ITEM('s32', v.play || 0),
        clear_count: K.ITEM('s32', v.clear_count || 0),
        perfect_clear_count: K.ITEM('s32', v.perfect || 0),
        full_combo_count: K.ITEM('s32', v.fullcombo || 0),
      };
    });
    await send.object({ usr_music_highscore: K.ATTR({}, { music }) });
  } catch (e) {
    enqueue('!! usr.get_usr_music failed: ' + e + '\n');
    await send.success();
  }
};

/** usr.save_musicscore —— 成绩上报，合并进最好成绩 */
export const saveMusicScore: EPR = async (info, data, send) => {
  trace('usr.save_musicscore', data);
  try {
    const u = await loadUser();
    const logs = list(sub(data, 'usr_music_play_log'), 'music');
    for (const m of logs) {
      const mid = Number(dv(sub(m, 'music_id')));
      const grade = Number(dv(sub(m, 'chart_difficulty_type')));
      if (!Number.isFinite(mid) || mid <= 0) continue;
      const key = `${mid}_${Number.isFinite(grade) ? grade : 0}`;
      const cur = u.scores[key] || {
        rate: 0, score: 0, rank: 0, maxcombo: 0, combo_rank: 0,
        clear: 0, play: 0, clear_count: 0, perfect: 0, fullcombo: 0,
      };
      cur.play += 1;
      const rate = Number(dv(sub(m, 'achievement_rate'))) || 0;
      const score = Number(dv(sub(m, 'score'))) || 0;
      const combo = Number(dv(sub(m, 'combo'))) || 0;
      const clear = Number(dv(sub(m, 'clear_status'))) || 0;
      const rank = Number(dv(sub(m, 'score_rank'))) || 0;
      if (rate >= cur.rate) { cur.rate = rate; }
      if (score >= cur.score) { cur.score = score; cur.rank = rank; }
      if (combo > cur.maxcombo) { cur.maxcombo = combo; }
      const cr = Number(dv(sub(m, 'combo_rank'))) || 0;
      if (cr > cur.combo_rank) cur.combo_rank = cr;
      if (clear > cur.clear) { cur.clear = clear; cur.clear_count += 1; }
      if (clear >= 3) cur.perfect += 1;      // 暂按 >=3 记为 perfect（待枚举确认）
      u.scores[key] = cur;
    }
    await saveUser(u);
    await send.object({ now_date: K.ITEM('str', nowStr()) });
  } catch (e) {
    enqueue('!! usr.save_musicscore failed: ' + e + '\n');
    await send.success();
  }
};

/* 入店 / 退店登记：只带 data_id，不落库，给个成功响应即可（不处理会被记 UNHANDLED） */
export const checkIn: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const checkOut: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
