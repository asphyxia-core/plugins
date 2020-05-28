// Version specific data (e.g. skills level)
export interface VersionData {
  collection: 'version';

  version: number;
  skill: {
    level: number;
    base: number;
    name: number;
  };
  items: {
    [key: string]: number;
  };
  params: {
    [key: string]: number[];
  };
}
