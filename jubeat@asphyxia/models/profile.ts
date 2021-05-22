export default interface Profile {
  collection: "profile";

  jubeatId: number;
  name: string;

  lastPlayTime?: number;
  lastShopname: string;
  lastAreaname: string;

  musicId?: number;
  seqId?: number;
  rankSort?: number;
  comboDisp?: number;

  knit?: {
    jubility?: number;
    jubilityYday?: number;
    acvProg?: number;
    acvWool?: number;
    acvRouteProg?: number[];
    acvPoint?: number;
    tuneCount?: number;
    saveCount?: number;
    savedCount?: number;
    fcCount?: number;
    fcSeqCount?: number;
    exCount?: number;
    exSeqCount?: number;
    matchCount?: number;
    conSelCount?: number;

    marker?: number;
    theme?: number;
    title?: number;
    sort?: number;
    filter?: number;
    mselStat?: number;
    conSuggestId?: number;

    secretList?: number[];
    themeList?: number;
    markerList?: number[];
    titleList?: number[];

    secretListNew?: number[];
    themeListNew?: number;
    markerListNew?: number[];
    titleListNew?: number[];
  };

  copious?: {
    jubility?: number;
    jubilityYday?: number;
    acvPoint?: number;
    acvState?: number;
    acvThrow?: number[];
    acvOwn?: number;
    tuneCount?: number;
    saveCount?: number;
    savedCount?: number;
    fcCount?: number;
    fcSeqCount?: number;
    exCount?: number;
    exSeqCount?: number;
    matchCount?: number;
    totalBestScore?: number;

    marker?: number;
    theme?: number;
    title?: number;
    parts?: number;
    sort?: number;
    category?: number;
    mselStat?: number;

    secretList?: number[];
    themeList?: number;
    markerList?: number[];
    titleList?: number[];
    partsList?: number[];

    secretListNew?: number[];
    themeListNew?: number;
    markerListNew?: number[];
    titleListNew?: number[];
  };

  saucer?: {
    jubility?: number;
    jubilityYday?: number;
    tuneCount?: number;
    clearCount?: number;
    saveCount?: number;
    savedCount?: number;
    fcCount?: number;
    exCount?: number;
    matchCount?: number;
    totalBestScore?: number;

    marker?: number;
    theme?: number;
    title?: number;
    parts?: number;
    sort?: number;
    category?: number;

    secretList?: number[];
    themeList?: number;
    markerList?: number[];
    titleList?: number[];
    partsList?: number[];

    secretListNew?: number[];
    themeListNew?: number;
    markerListNew?: number[];
    titleListNew?: number[];

    bistro?: {
      carry_over?: number;
    }
  };
}
