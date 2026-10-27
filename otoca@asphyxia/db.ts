import { ID_CHARS } from './data';
import { Card } from './models/card';
import { Counter } from './models/counter';
import { Doll } from './models/doll';
import { User } from './models/user';
import { rand } from './utils';

export async function nextSeq(name: string) {
  const c = await DB.FindOne<Counter>({ collection: 'counter', name });
  const value = (c ? c.value : 0) + 1;
  await DB.Upsert<Counter>({ collection: 'counter', name }, { $set: { value } });
  return value;
}

// ponytail: random ids with a uniqueness check, fine for a home server's card count.
export async function newId() {
  for (;;) {
    let id = '';
    for (let i = 0; i < 8; i++) id += ID_CHARS[rand(ID_CHARS.length)];
    if (id === '00000000') continue;
    const used = (await DB.Count<Card>({ collection: 'card', otocard_id: id })) +
      (await DB.Count<User>({ collection: 'user', keycard_id: id }));
    if (!used) return id;
  }
}

export const getUser = (user_seq: number) => DB.FindOne<User>({ collection: 'user', user_seq });
export const getDoll = (doll_seq: number) => DB.FindOne<Doll>({ collection: 'doll', doll_seq });
export const getCard = (otocard_id: string) => DB.FindOne<Card>({ collection: 'card', otocard_id });

async function save(key: object, doc: object) {
  const { _id, ...rest } = doc as any;
  await DB.Update(key, { $set: rest });
}
export const saveUser = (u: User) => save({ collection: 'user', user_seq: u.user_seq }, u);
export const saveDoll = (d: Doll) => save({ collection: 'doll', doll_seq: d.doll_seq }, d);
