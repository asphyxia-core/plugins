import {Room} from '../models/matching';

export const check: EPR = async (info, data, send) => {
  const enter = $(data).bool('data.enter');
  const time = $(data).number('data.time');

  // enter
  // 0 - game is loading
  // 1 - music select screen

  return send.object({
    data: {
      entrant_nr: K.ITEM('u32', 1, { time: String(time) }),
      interval: K.ITEM('s16', 5),
      entry_timeout: K.ITEM('s16', 30),
      waitlist: K.ATTR({ count: '0' })
    }
  });
};

export const entry: EPR = async (info, data, send) => {
  const localMatchingNode = $(data).element('data.local_matching');
  const connectNode = $(data).element('data.connect');
  const musicNode = $(data).element('data.music');

  const localKey = localMatchingNode.numbers('key');
  const connectKey = connectNode.numbers('key');

  let matchRoom = await DB.FindOne<Room>({
    collection: 'matching_rooms',
    musicId: musicNode.number('id'),
    seqId: musicNode.number('seq'),
    isMatchEnd: false,
    isFull: false
  });

  if (!matchRoom) {
    matchRoom = {
      collection: 'matching_rooms',

      version: $(data).number('data.version'),
      roomId: _.random(1, 999999999),
      masterKey: connectKey,
      masterGlobal: connectNode.str('global'),
      masterPrivate: connectNode.str('private'),
      localKey,
      musicId: musicNode.number('id'),
      seqId: musicNode.number('seq'),
      members: [
        {
          cabid: $(data).number('data.cabid'),
          addr: connectNode.str('private')
        }
      ],
      isFull: false,
      isMatchEnd: false
    };

    await DB.Upsert<Room>({
      collection: 'matching_rooms', localKey,
      musicId: musicNode.number('id'),
      seqId: musicNode.number('seq'),
      isMatchEnd: false,
      isFull: false
    }, matchRoom);
  }

  return send.object({
    data: {
      roomid: K.ITEM('s64', BigInt(matchRoom.roomId), { master: matchRoom.masterKey === connectKey ? '1' : '0' }),
      ...matchRoom.masterKey === connectKey && {
        refresh_intr: K.ITEM('s16', 10),
      },
      ...matchRoom.masterKey !== connectKey && {
        connect: {
          key: K.ARRAY('u8', matchRoom.masterKey),
          global: K.ITEM('str', matchRoom.masterGlobal),
          private: K.ITEM('str', matchRoom.masterPrivate),
        }
      },
      music: {
        id: K.ITEM('u32', matchRoom.musicId),
        seq: K.ITEM('u8', matchRoom.seqId),
      }
    }
  });
};

export const refresh: EPR = async (info, data, send) => {
  const roomId = Number($(data).bigint('data.roomid'));
  const pcbinfos = $(data).elements('data.joined.pcbinfo');

  const room = await DB.FindOne<Room>({ collection: 'matching_rooms', roomId });

  if (room) {
    for (const i of pcbinfos) {
      const cabid = i.number('cabid');
      const addr = i.str('addr');

      for (const i of room.members) {
        if (i.addr === addr) continue;

        room.members.push({
          cabid,
          addr
        });
      }
    }

    await DB.Update<Room>({ collection: 'matching_rooms', roomId: Number(roomId) }, {
      $set: {
        members: room.members
      }
    });

    if (room.members.length >= 4) {
      await DB.Update<Room>({ collection: 'matching_rooms', roomId: Number(roomId) }, {
        $set: {
          isFull: true
        }
      });
    }
  }

  return send.object({
    data: {
      refresh_intr: K.ITEM('s16', 5),
      start: K.ITEM('bool', room.isFull)
    }
  });
};

export const report: EPR = async (info, data, send) => {
  const roomId = $(data).bigint('data.roomid');

  await DB.Update<Room>({ collection: 'matching_rooms', roomId: Number(roomId) }, {
    $set: {
      isMatchEnd: true
    }
  });

  return send.object({
    data: {
      refresh_intr: K.ITEM('s16', 3),
    }
  });
};
