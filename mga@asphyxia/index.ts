interface PlayerData {
  collection: 'data',
  str: string[],
  bin: string[]
}

export function register() {
  R.GameCode('I36');

  R.Route(`eventlog.write`, async (req, data, send) => {
    send.object({
      gamesession: K.ITEM('s64', BigInt(1)),
      logsendflg: K.ITEM('s32', 0),
      logerrlevel: K.ITEM('s32', 0),
      evtidnosendflg: K.ITEM('s32', 0),
    })
  });

  R.Route(`system.getmaster`, async (req, data, send) => {
    send.object({
      result: K.ITEM('s32', 1),
      strdata1: K.ITEM('str', Buffer.from('2011081000:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1:1', 'utf-8').toString('base64')),
      strdata2: K.ITEM('str', Buffer.from('1,1,1,1,1,1,1,1,1,1,1,1,1,1', 'utf-8').toString('base64')),
      updatedate: K.ITEM('u64', BigInt('1120367223')),
    })
  });

  R.Route(`playerdata.usergamedata_send`, async (req, data, send) => {
    const refid = $(data).element('data').str('eaid');
    const datanum = $(data).element('data').number('datanum');
    let playerData: PlayerData = {
      collection: 'data',
      str: [],
      bin: []
    };

    const record = $(data).element('data').element('record').obj;

    for (let i = 0; i < datanum; i++) {
      playerData.str[i] = Buffer.from(_.get(record.d[i], '@content'), 'base64').toString('utf-8');
      playerData.bin[i] = _.get(record.d[i].bin1, '@content');
    }

    DB.Upsert(refid, { collection: 'data' }, playerData);

    send.object({
      result: K.ITEM('s32', 0),
    });
  });

  R.Route(`playerdata.usergamedata_recv`, async (req, data, send) => {
    const refid = $(data).element('data').str('eaid');

    const playerData = await DB.FindOne<PlayerData>(refid, { collection: 'data' });

    let player = {
      record_num: K.ITEM('u32', playerData.str.length),
      record: {
        d: []
      }
    };

    for(let i = 0; i < playerData.str.length; i++) {
      let data = playerData.str[i].split(',');
      player.record.d[i] = K.ITEM('str', Buffer.from(data.slice(2).join(','), 'utf-8').toString('base64') + playerData.bin[i]);
      player.record.d[i].bin1 = K.ITEM('str', playerData.bin[i]);
    }

    send.object({
      player,
      result: K.ITEM('s32', 0)
    });
  });

  R.Route(`playerdata.usergamedata_scorerank`, async (req, data, send) => {
    send.object({
      result: K.ITEM('s32', 0)
    });
  });

  R.Unhandled((req: EamuseInfo, data: any, send: EamuseSend) => {
    return send.success();
  });
}