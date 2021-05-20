export function getVersion({ model }: EamuseInfo) {
  const dateCode = parseInt(model.split(':')[4]);

  if (model.startsWith('J44')) return 3;
  if (model.startsWith('K44')) return 4;
  if (model.startsWith('L44')) {
    if (dateCode >= 2014030303 && dateCode <= 2014121802) return 6;
    return 0;
  }
  return 0;
}

export function VersionRange(version: number, start: number, end: number = -1) {
  if (end === -1) return version >= start;
  return version >= start && version <= end;
}
