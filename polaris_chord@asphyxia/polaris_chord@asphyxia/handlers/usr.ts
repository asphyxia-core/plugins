/*
 * usr.* — player profile, settings, and score exchange.
 *
 * Save timing (confirmed by decompiling SavePlayDataStepRunner in game.scene.continue):
 *   after clearing a song → result screen → **the instant the Continue scene is entered**
 *   is when usr.save is finally uploaded. Closing the window / Alt+F4 while still on the
 *   result screen does not save.
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

/** usr.get — full player data at login */
export const get: EPR = async (info, data, send) => {
  trace('usr.get', data);
  try {
    const { body } = await buildPlayerBody();
    // Enable LZ77 compression: all nodes + every card item makes the response exceed 321KB,
    // which the game truncates; compressed it is ~100KB and passes safely.
    // The game's request itself is lz77 compressed, so a compressed response is standard.
    await send.object(body, { compress: true });
  } catch (e) {
    enqueue('!! usr.get failed: ' + e + '\n');
    await send.success();
  }
};

export const signUp: EPR = handle();

/**
 * usr.save — save upload after the result screen
 * (name / level / settings / passthrough nodes / item change log)
 */
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
      // The game reports is_tutorial_cleared=0 (tutorial not cleared) every round, so
      // overwriting blindly would kick the player back into the tutorial. Only set it to true
      // on an explicit 1, and never flip it back to false.
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
    // Deck / name titles / play stats / sorting: the structure is complex, so the whole node
    // is stored verbatim and replayed verbatim on usr.get.
    //
    // It must be serialized into a string before storing: these nodes carry
    // `@attr: {__type: "s32"}`, and nedb rejects any field name starting with "__"
    // (it uses __s / __refid itself). Putting the object in directly makes the whole $set
    // throw — which also takes down the option part of the same save.
    for (const key of RAW_KEYS) {
      const v = sub(data, key);
      if (v && typeof v === 'object') {
        try {
          u.raw[key] = JSON.stringify(v);
        } catch (e) {
          enqueue(`!! failed to serialize raw ${key}: ${e}\n`);
        }
      }
    }
    // Item change log → persistent item table (accumulated across plays);
    // action count change log → counters (accumulated across plays)
    accumulateItemChangeLog(u, sub(data, 'usr_item_change_log'));
    accumulateActionCountLog(u, sub(data, 'usr_action_count_change_log'));
    // The temporary gacha card instances already came up with usr_character_card,
    // so clear the temporary table.
    pruneExtraCards(u);

    await saveUser(u);
    // After the results, "Continue / keep playing" awaits the result of this save and checks
    // Result.IsSucceededSavePlayData — which looks at the player data in the response.
    // Replying with only now_date makes the game believe "the save did not succeed" and it
    // pops the "回线混杂" (mixed connection) dialog.
    // So reply with the full profile + settings here (without item, to save size).
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

/**
 * usr.get_usr_music — the 0.00% / Best / history in the song select screen all rely on this
 */
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

/** usr.save_musicscore — score upload, merged into the best score */
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
      if (clear >= 3) cur.perfect += 1;  // tentatively perfect for >=3 (pending enum confirm)
      u.scores[key] = cur;
    }
    await saveUser(u);
    await send.object({ now_date: K.ITEM('str', nowStr()) });
  } catch (e) {
    enqueue('!! usr.save_musicscore failed: ' + e + '\n');
    await send.success();
  }
};

/* Store check-in / check-out: only carries data_id and is not persisted, so returning a
 * success response is enough (leaving it unhandled would be logged as UNHANDLED) */
export const checkIn: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
export const checkOut: EPR = handle(() => ({ now_date: K.ITEM('str', nowStr()) }));
