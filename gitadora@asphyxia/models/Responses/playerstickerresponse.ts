export interface PlayerStickerResponse {
    id: KITEM<'s32'>,
    pos_x: KITEM<'float'> ,
    pos_y: KITEM<'float'>,
    scale_x: KITEM<'float'> ,
    scale_y: KITEM<'float'>,
    rotate: KITEM<'float'>
}

export interface PlayerBoardConfig {
  index: KITEM<'s32'>;
  is_active: KITEM<'bool'>;
  sticker: PlayerStickerResponse[];
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/** Convert legacy card documents and WebUI playerboard JSON to wire values. */
export function getPlayerStickerResponse(playerCard : any[]) : PlayerStickerResponse[] {
    let stickers : PlayerStickerResponse[] = []
    if (!_.isArray(playerCard)) {
        return stickers
    }

    for (const item of playerCard.slice(0, 11)) {
    const id = _.get(item, 'id');
    // Accept both the historical card shape and the wire-shaped playerboard
    // shape used by the editor.
    const posX = _.get(item, 'pos_x', _.get(item, 'position.0'));
    const posY = _.get(item, 'pos_y', _.get(item, 'position.1'));
    const scaleX = _.get(item, 'scale_x', _.get(item, 'scale.0'));
    const scaleY = _.get(item, 'scale_y', _.get(item, 'scale.1'));
    const rotation = _.get(item, 'rotate', _.get(item, 'rotation'));

    if (
        !isFinite(id) ||
        !isFinite(posX) ||
        !isFinite(posY) ||
        !isFinite(scaleX) ||
        !isFinite(scaleY) ||
        !isFinite(rotation)
    ) {
        continue;
    }

    stickers.push({
      id: K.ITEM('s32', finiteNumber(id)),
      pos_x: K.ITEM('float', finiteNumber(posX)),
      pos_y: K.ITEM('float', finiteNumber(posY)),
      scale_x: K.ITEM('float', finiteNumber(scaleX)),
      scale_y: K.ITEM('float', finiteNumber(scaleY)),
      rotate: K.ITEM('float', finiteNumber(rotation)),
    });
    }
    
  return stickers
  }

/** Build the playerboard response, with a safe fallback for old playerinfo documents. */
export function getPlayerBoardResponse(playerInfo: any): PlayerBoardConfig {
  const configured = playerInfo?.playerboard;
  const legacyCard = playerInfo?.card;
  const stickers = getPlayerStickerResponse(
    _.isArray(configured?.sticker) ? configured.sticker : legacyCard
  );
  const index = finiteNumber(configured?.index, 0);
  const activeValue = configured?.is_active;
  const isActive = activeValue === undefined
    ? _.isArray(legacyCard)
    : Boolean(activeValue === true || activeValue === 1 || activeValue === '1' || activeValue === 'true');

  return {
    index: K.ITEM('s32', Math.trunc(index)),
    is_active: K.ITEM('bool', isActive ? 1 : 0),
    sticker: stickers,
  };
}

