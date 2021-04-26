export function getVersion({ model }: EamuseInfo) {
  const dateCode = model.split(':')[4];

  if (model.startsWith("J44")) return 3;
  if (model.startsWith("K44")) return 4;
  return 0;
}
