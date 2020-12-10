export interface Profile {
    collection: 'profile',
    
    name: string;
    playCount: number;
    todayPlayCount: number;
    music: number;
    sheet: number;
    brooch: number;
    hispeed: number;
    beatGuide: number;
    headphone: number;
    judgeBar: number;
    group: number;
    mode: number;
    near: number;
    offset: number;
    bingo: number;
    skill: string;
    keyBeam: number;
    orbit: number;
    noteHeight: number;
    noteWidth: number;
    judgeWidth: number;
    beatVolume: number;
    beatType: number;
    keyVolume: number;
    bgmVolume: number;
    note: number;
    sf: number;
    judgeFX: number;
    simple: number;
    money: number;
    fame: number;
    fameId: number;
    island: number;
    params: {
      [key: string]: number[];
    };
    brooches: {
      [key: string]: {
        watch: number;
        level: number;
        steps: number;
        new: number;
      };
    };
    islands: {
      [key: string]: {
        look: number;
        select: number;
        time: number;
        containers: {
          [key: string]: {
            prog: number;
            rewards: { [key: string]: number };
          };
        };
      };
    };
    kentei: {
      [key: string]: {
        stage: number;
        score: number[];
        rate: number;
        flag: number;
        count: number;
      };
    };
    musicList: {
      type_0: number[];
      type_1: number[];
      type_2: number[];
      type_3: number[];
    };
    musicList2: {
      type_0: number[];
      type_1: number[];
      type_2: number[];
      type_3: number[];
    };
  }