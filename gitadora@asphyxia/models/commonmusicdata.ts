export interface CommonMusicDataField {
    id: KITEM<"s32">;
    cont_gf: KITEM<"bool">;
    cont_dm: KITEM<"bool">;
    is_secret: KITEM<"bool">;
    is_hot: KITEM<"bool">;
    data_ver: KITEM<"s32">;
    diff: KARRAY<"u16">;
  }
  
  export interface CommonMusicData {
    music: CommonMusicDataField[]
  }