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

export function isRequiredCoreVersion(major: number, minor: number) {
  // version value exposed since Core v1.19
  const core_major = typeof CORE_VERSION_MAJOR === "number" ? CORE_VERSION_MAJOR : 1
  const core_minor = typeof CORE_VERSION_MINOR === "number" ? CORE_VERSION_MINOR : 18   
  return core_major >= major && core_minor >= minor
};

export function isAsphyxiaDebugMode() {
  const argv = process.argv
  return argv.includes("--dev") || argv.includes("--console")
}