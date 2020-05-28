import { common } from './handlers/common';
import { load, create, loadScores, save } from './handlers/profile';
export function register() {
  R.GameCode('KFC');

  R.Config('unlock_all_songs', { type: 'boolean', default: false });
  R.Config('unlock_all_navigators', { type: 'boolean', default: false });

  R.Route('game.sv4_common', common);
  R.Route('game.sv4_load', load);
  R.Route('game.sv4_load_m', loadScores);
  R.Route('game.sv4_new', create);
  R.Route('game.sv4_frozen', true);
  R.Route('game.sv4_load_r', true);
  R.Route('game.sv4_save', save);
  R.Route('game.sv4_save_m', true);

  R.Route('game.sv5_common', common);
}
