export default interface Profile {
    collection: "profile";
    navi?: number,
    jubeatId: number;
    eventFlag: number;
    name: string;
    emo: number[];
    lastPlayTime?: number;
    lastShopname: string;
    lastAreaname: string;
    isFirstplay: boolean;
    musicId?: number;
    seqId?: number;
    seqEditId?: string;
    rankSort?: number;
    comboDisp?: number;

    jubility?: number;
    jubilityYday?: number;
    tuneCount?: number;
    clearCount?: number;
    saveCount?: number;
    savedCount?: number;
    fcCount?: number;
    exCount?: number;
    matchCount?: number;
    bonusPoints?: number;
    isBonusPlayed?: boolean;
    totalBestScore?: number;
    clearMaxLevel?: number;
    fcMaxLevel?: number;
    exMaxLevel?: number;

    emblem?: number[];
    marker?: number;
    theme?: number;
    title?: number;
    parts?: number;
    sort?: number;
    category?: number;
    expertOption?: number;
    matching?: number;
    hazard?: number;
    hard?: number;

    secretList?: number[];
    themeList?: number;
    markerList?: number[];
    titleList?: number[];
    commuList?: number[];
    partsList?: number[];

    secretListNew?: number[];
    themeListNew?: number[];
    markerListNew?: number[];
    titleListNew?: number[];
}