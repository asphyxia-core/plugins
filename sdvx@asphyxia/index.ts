import { common } from './handlers/common';
import { hiscore, rival, saveMix, loadMix } from './handlers/features';
import {
  load,
  create,
  loadScore,
  save,
  saveScore,
  saveCourse,
  buy,
} from './handlers/profiles';

export function register() {
  R.GameCode('KFC');

  R.Config('unlock_all_songs', { type: 'boolean', default: false });
  R.Config('unlock_all_navigators', { type: 'boolean', default: false });

  const MultiRoute = (method: string, handler: EPR | boolean) => {
    // Helper for register multiple versions.
    R.Route(`game.sv4_${method}`, handler);
    R.Route(`game.sv5_${method}`, handler);
  };

  // Common
  MultiRoute('common', common);

  // Profile
  MultiRoute('new', create);
  MultiRoute('load', load);
  MultiRoute('load_m', loadScore);
  MultiRoute('save', save);
  MultiRoute('save_m', saveScore);
  MultiRoute('save_c', saveCourse);
  MultiRoute('frozen', true);
  MultiRoute('buy', buy);

  // Features
  MultiRoute('hiscore', hiscore);
  MultiRoute('load_r', rival);
  MultiRoute('save_ap', saveMix);
  MultiRoute('load_ap', loadMix);

  // Lazy
  MultiRoute('lounge', false);
  MultiRoute('shop', true);
  MultiRoute('save_e', true);
  MultiRoute('play_e', true);
  MultiRoute('play_s', true);
  MultiRoute('entry_s', true);
  MultiRoute('entry_e', true);
  MultiRoute('exception', true);
  R.Route('eventlog.write', true);

  R.Unhandled();
}
