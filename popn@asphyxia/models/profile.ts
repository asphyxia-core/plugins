export interface Profile {
  collection: 'profile',

  name: string;

  stamps: {
    [ver: string]: {
      [stamp_id: string]: number;
    };
  };

  medals: {
    [ver: string]: {
      [id: string]: {
        level: number;
        exp: number;
        set_count: number;
        get_count: number;
      };
    };
  };

  items: {
    [ver: string]: {
      [key: string]: number;
    };
  };

  charas: {
    [ver: string]: {
      [chara_id: string]: number;
    };
  };

  extras: {
    [ver: string]: {
      [key: string]: any;
    };
  };
}