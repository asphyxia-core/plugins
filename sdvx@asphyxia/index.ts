import { common } from './handlers/common';
import { load, create, loadScores, save, saveScores } from './handlers/profile';

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
  MultiRoute('load_m', loadScores);
  MultiRoute('load_r', true);
  MultiRoute('save', save);
  MultiRoute('save_m', saveScores);
  MultiRoute('frozen', true);

  // Useless
  MultiRoute('lounge', false);

  R.Unhandled();
}
