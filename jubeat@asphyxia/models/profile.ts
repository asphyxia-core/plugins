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
      theme: number;
      marker: number;
      showRank: number;
      showCombo: number;
      musicId: number;
      seqId: number;
      sort: number;
      filter: number;
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

  copious?: {
    info: {
      jubility: number;
      jubilityYday: number;
      acvPoint: number;
      acvState: number;
      acvThrow: number[];
      acvOwn: number;
      tuneCount: number;
      saveCount: number;
      savedCount: number;
      fullComboCount: number;
      fullComboSeqCount: number;
      excellentCount: number;
      excellentSeqCount: number;
      matchCount: number;
      beatCount: number;
      mynewsCount: number;
      totalBestScore: number;
    },
    last: {
      playTime: string;
      shopname: string;
      areaname: string;
      title: number;
      parts: number;
      theme: number;
      marker: number;
      showRank: number;
      showCombo: number;
      musicId: number;
      seqId: number;
      sort: number;
      category: number;
      mselStat: number;
    },
    item: {
      secretList: number[];
      themeList: number;
      markerList: number[];
      titleList: number[];
      partsList: number[];
    },
    item_new: {
      secretList: number[];
      themeList: number;
      markerList: number[];
      titleList: number[];
    },
    collabo: {
      dailyMusicId: number;
      served: number;
      wonderState: number;
      yellowState: number;
    }
  };
}
