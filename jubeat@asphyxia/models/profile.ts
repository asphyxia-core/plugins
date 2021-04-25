export default class Profile {
  collection: "profile" = "profile";

  jubeatId: number = _.random(1, 99999999);
  name: string = "JUBEAT";

  previous_version = 0;

  jubility: number = 0;
  jubilityYday: number = 0;
  tuneCount: number = 0;
  saveCount: number = 0;
  savedCount: number = 0;
  fullcomboCount: number = 0;
  fullcomboSeqCount: number = 0;
  excellentCount: number = 0;
  excellentSeqCount: number = 0;
  matchCount: number = 0;
  beatCount: number = 0;
  tagCount: number = 0;
  mynewsCount: number = 0;
  conciergeSelectedCount: number = 0;

  last: {
    shopname: string;
    areaname: string;
    playTime: bigint;
    title: number;
    theme: number;
    marker: number;
    showRank: number;
    showCombo: number;
    musicId: number;
    seqId: number;
    seqEditId: string;
    sort: number;
    filter: number;
    mselStat: number;
    conciergeSuggestId: number;
  } = {
    shopname: "NONE",
    areaname: "NONE",
    playTime: BigInt(0),
    title: 0,
    theme: 0,
    marker: 0,
    showRank: 1,
    showCombo: 1,
    musicId: 0,
    seqId: 0,
    seqEditId: "",
    sort: 0,
    filter: 0,
    mselStat: 0,
    conciergeSuggestId: 0
  };

  knit: {
    acvProg: number;
    acvWool: number;
    acvRouteProg: number[];
    acvPoint: number;
    item: {
      secretList: number[],
      themeList: number,
      markerList: number[],
      titleList: number[]
    },
    item_new: {
      secretList: number[],
      themeList: number,
      markerList: number[],
      titleList: number[]
    },
    collabo: {
      success: boolean;
      completed: boolean;
    }
  } = {
    acvProg: 0,
    acvWool: 0,
    acvRouteProg: [0, 0, 0, 0],
    acvPoint: 0,
    item: {
      secretList: [0, 0],
      themeList: 0,
      markerList: [0, 0],
      titleList: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    item_new: {
      secretList: [0, 0],
      themeList: 0,
      markerList: [0, 0],
      titleList: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    collabo: {
      success: false,
      completed: false
    }
  };
}
