export enum CommonOffset {
  AREA = 1,
  SEQ_HEX = 1,
  WEIGHT_DISPLAY = 3,
  CHARACTER,
  EXTRA_CHARGE,
  TOTAL_PLAYS = 9,
  SINGLE_PLAYS = 11,
  DOUBLE_PLAYS,
  WEIGHT = 17,
  NAME = 25,
  SEQ
}

export enum OptionOffset {
  SPEED = 1,
  BOOST,
  APPEARANCE,
  TURN,
  STEP_ZONE,
  SCROLL,
  ARROW_COLOR,
  CUT,
  FREEZE,
  JUMP,
  ARROW_SKIN,
  FILTER,
  GUIDELINE,
  GAUGE,
  COMBO_POSITION,
  FAST_SLOW
}

export enum LastOffset {
  SONG = 3,
  CALORIES = 10
}

export enum RivalOffset {
  RIVAL_1_ACTIVE = 1,
  RIVAL_2_ACTIVE,
  RIVAL_3_ACTIVE,
  RIVAL_1_DDRCODE = 9,
  RIVAL_2_DDRCODE,
  RIVAL_3_DDRCODE,
}

export interface Profile {
  collection: "profile";

  ddrCode: number;
  shopArea: string;

  singleGrade?: number;
  doubleGrade?: number;

  events?: {};

  usergamedata?: {
    COMMON?: {
      strdata?: string;
      bindata?: string;
    };
    OPTION?: {
      strdata?: string;
      bindata?: string;
    };
    LAST?: {
      strdata?: string;
      bindata?: string;
    };
    RIVAL?: {
      strdata?: string;
      bindata?: string;
    };
  };
}
