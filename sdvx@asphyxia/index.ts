import { example, changeName } from './handlers/example';

export function register() {
  R.GameCode('KFC');
  
  R.Route('example.method', example);
}
