import {Counter} from './models/counter';

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

export function getVersion(info: EamuseInfo) {
  const dateCode = parseInt(info.model.split(":")[4]);
  if (dateCode <= 2013052900) return 1;
  if (dateCode <= 2014112000) return 2;
  if (dateCode <= 2016121200) return 3;
  if (info.method.startsWith('sv4')) return 4;
  if (info.method.startsWith('sv5')) return 5;
  if (dateCode >= 2021083100) return -6;
  if (info.method.startsWith('sv6')) return 6;
  return 0;
}

export function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}