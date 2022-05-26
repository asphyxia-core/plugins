export function getVersion({ model }: EamuseInfo): number {
  if (model.startsWith('H44')) return 1;
  if (model.startsWith('I44')) return 2;

  return 0;
}
