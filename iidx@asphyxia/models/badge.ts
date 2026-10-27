export const badgeBaseMap: Record<string, number> = {
  djLevel: 0,
  clear: 1,
  grade: 2,
  step_up: 3,
  visitor: 6,
  notes_radar: 7,
};

export const badgeVersionMap: Record<number | "default", Record<string, number | null>> = {
  30: {
    step_up: null,
    visitor: 6,
    world_tourism: 8,
    event1: 9,
  },
  31: {
    visitor: 7,
    notes_radar: 8,
    world_tourism: 12,
    event1: 13,
    event2: 16,
  },
  32: {
    visitor: 7,
    notes_radar: 8,
    world_tourism: 12,
    event1: 13,
    event2: 15,
  },
  33: {
    event1: 3301,
  },
  "default": {}
};

export interface badge {
  collection: "badge";
  version: number;

  category_name: string;
  flg_id: number;
  flg: number;
}

