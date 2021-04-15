export interface Achievements {
  collection: 'achievements',
  version: string,
}

export interface AchievementsLapistoria extends Achievements {
  version: 'v22',

  achievements: {
    [stamp_id: string]: number;
  };

  stories: {
    [id: string]: {
      chapter_id: number;
      gauge_point: number;
      is_cleared: boolean;
      clear_chapter: number;
    };
  };

  items: {
    [key: string]: number;
  };

  charas: {
    [chara_id: string]: number;
  };
}

export interface AchievementsEclale extends Achievements {
  version: 'v23',

  medals: {
    [id: string]: {
      level: number;
      exp: number;
      set_count: number;
      get_count: number;
    };
  };

  items: {
    [key: string]: number;
  };

  charas: {
    [chara_id: string]: number;
  };
}

export interface AchievementsUsaneko extends Achievements {
  version: 'v24' | 'v25',

  areas: {
    [id: string]: {
      chapter_index: number;
      gauge_point: number;
      is_cleared: boolean;
      diary: number;
    };
  };

  courses: {
    [id: string]: {
      clear_type: number;
      clear_rank: number;
      total_score: number;
      update_count: number;
      sheet_num: number;
    };
  };

  fes: {
    [id: string]: {
      chapter_index: number;
      gauge_point: number;
      is_cleared: boolean;
    };
  };

  items: {
    [key: string]: number;
  };

  charas: {
    [chara_id: string]: number;
  };

  stamps: {
    [stamp_id: string]: number;
  };
}