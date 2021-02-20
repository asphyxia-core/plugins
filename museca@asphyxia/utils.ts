export function IDToCode(id: number) {
  const padded = _.padStart(id.toString(), 8);
  return `${padded.slice(0, 4)}-${padded.slice(4)}`;
}

export function isRequiredVersion(major: number, minor: number) {
  // version value exposed since Core v1.19
  const core_major = typeof CORE_VERSION_MAJOR === "number" ? CORE_VERSION_MAJOR : 1
  const core_minor = typeof CORE_VERSION_MINOR === "number" ? CORE_VERSION_MINOR : 18   
  return core_major >= major && core_minor >= minor
}