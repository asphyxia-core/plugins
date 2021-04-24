export function getVersion({ model }: EamuseInfo) {
  const dateCode = model.split(':')[4];

  if (model.startsWith("J44")) return 3;
  return 0;
}
