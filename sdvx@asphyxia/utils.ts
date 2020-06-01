import { Counter } from './models/counter';
export function IDToCode(id: number) {
  const padded = _.padStart(id.toString(), 8);
  return `${padded.slice(0, 4)}-${padded.slice(4)}`;
}

export async function GetCounter(key: string) {
  return (
    await DB.Upsert<Counter>(
      { collection: 'counter', key: 'mix' },
      { $inc: { value: 1 } }
    )
  ).docs[0].value;
}
