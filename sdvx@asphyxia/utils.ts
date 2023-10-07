import {Counter} from './models/counter';
import { music_db } from '.';

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
  if (info.method.startsWith('sv6')) return 6;
  return 0;
}

export function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function add_extend(e_id: number, e_type: number,
  p1: number, p2: number, p3: number, p4: number, p5: number,
  sp1: string, sp2: string, sp3: string, sp4: string, sp5: string){
    return {
      id: e_id,
      type: e_type,
      params: [
        p1,
        p2,
        p3,
        p4,
        p5,
        sp1,
        sp2,
        sp3,
        sp4,
        sp5,
      ],
    }
}

export function getRandomCharaterRight(){

}

export function getRandomCharaterLeft(){
  
}

export function getRandomCharaterMiddle(){

}




export function send_webhook(data: any) {
  let https = require('https');
  let contents = JSON.stringify({
    "content": null,
    "embeds": [
      {
        "title": "New SOUND VOLTEX Score",
        "color": 16711680,
        "fields": [
          {
            "name": "Player Name",
            "value": data.name
          },
          {
            "name": "Song Name",
            "value": data.id,
            "inline": true
          },
          {
            "name": "Difficulty",
            "value": data.type,
            "inline": true
          },
          {
            "name": "Score",
            "value": data.score,
          },
          {
            "name": "Ex Score",
            "value": data.exscore,
          },
          {
            "name": "Clear Medal",
            "value": data.clear,
            "inline": true
          },
          {
            "name": "Grade",
            "value": data.grade,
          },
          {
            "name": "S-Critical",
            "value": "0",
            "inline": true
          },
          {
            "name": "Critical",
            "value": "0",
            "inline": true
          },
          {
            "name": "Near",
            "value": "0",
            "inline": true
          },
          {
            "name": "Error",
            "value": "0",
            "inline": true
          }
        ],
        "author": {
          "name": "Asphyxia CORE",
          "icon_url": "https://asphyxia-core.github.io/img/core-logo.png"
        },
        "thumbnail": {
          "url": "https://asphyxia-core.github.io/img/core-logo.png"
        }
      }
    ],
    "attachments": []
  })
  console.log(contents);
  let options = {
      host:'discord.com',
      path:U.GetConfig('discord_webhook_url'),
      method:'POST',
      headers:{
          'Content-Type':'application/json; charset=utf-8',
          'Content-Length':contents.length
      }
  }
  if(U.GetConfig('discord_webhook')){
    let req = https.request(options, res => {
        console.log(`${res.statusCode}`);
        res.on('data', (d) => {
          // process.stdout.write(d);
        });
    });
    req.write(contents);
  }
}