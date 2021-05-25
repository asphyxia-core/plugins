export interface Room {
  collection: 'matching_rooms';

  version: number;
  roomId: number;
  masterKey: number[];
  masterGlobal: string;
  masterPrivate: string;
  localKey: number[];
  musicId: number;
  seqId: number;
  members: {
    cabid: number;
    addr: string;
  }[];
  isFull: boolean;
  isMatchEnd: boolean;
}
