export const isGF = (info: EamuseInfo) => {
  return info.model.split(':')[2] == 'A';
};

export const isDM = (info: EamuseInfo) => {
  return info.model.split(':')[2] == 'B';
};

export const getVersion = (info: EamuseInfo) => {
  const moduleName: string = info.module;
  return moduleName.match(/([^_]*)_(.*)/)[1];
};
