export default interface Profile {
  collection: "profile";

  jubeatId: number;
  name: string;

  previous_version: number;

  knit?: {
    info: {
      jubility: number;
      jubilityYday: number;
      acvProg: number;
      acvWool: number;
      acvRouteProg: number[];
      acvPoint: number;
      tuneCount: number;
      saveCount: number;
      savedCount: number;
      fullcomboCount: number;
      fullcomboSeqCount: number;
      excellentCount: number;
      excellentSeqCount: number;
      matchCount: number;
      beatCount: number;
      tagCount: number;
      mynewsCount: number;
      conciergeSelectedCount: number;
    };
    last: {
      shopname: string;
      areaname: string;
      playTime: string;
      title: number;
      parts: number;
      theme: number;
      marker: number;
      showRank: number;
      showCombo: number;
      musicId: number;
      seqId: number;
      seqEditId: string;
      sort: number;
      filter: number;
      category: number;
      mselStat: number;
      conciergeSuggestId: number;
    };
    item: {
      secretList: number[];
      themeList: number;
      markerList: number[];
      titleList: number[];
    };
    item_new: {
      secretList: number[];
      themeList: number;
      markerList: number[];
      titleList: number[];
    },
    collabo: {
      success: boolean;
      completed: boolean;
    }
  };
}
