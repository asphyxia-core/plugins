// Version specific data (e.g. skills level)
export interface VersionData {
  version: number;
  skillLevel: number;
  skillBaseID: number;
  skillNameID: number;
  items: {
    [key: string]: number;
  };
  params: {
    [key: string]: number[];
  };
}