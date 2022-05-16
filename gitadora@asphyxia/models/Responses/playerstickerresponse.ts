export interface PlayerStickerResponse {
    id: KITEM<'s32'>,
    pos_x: KITEM<'float'> ,
    pos_y: KITEM<'float'>,
    scale_x: KITEM<'float'> ,
    scale_y: KITEM<'float'>,
    rotate: KITEM<'float'>
}

export function getPlayerStickerResponse(playerCard : any[]) : PlayerStickerResponse[] {
    let stickers : PlayerStickerResponse[] = []
    if (!_.isArray(playerCard)) {
        return stickers
    }

    for (const item of playerCard) {
    const id = _.get(item, 'id');
    const posX = _.get(item, 'position.0');
    const posY = _.get(item, 'position.1');
    const scaleX = _.get(item, 'scale.0');
    const scaleY = _.get(item, 'scale.1');
    const rotation = _.get(item, 'rotation');

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
        id: K.ITEM('s32', id),
        pos_x: K.ITEM('float', posX),
        pos_y: K.ITEM('float', posY),
        scale_x: K.ITEM('float', scaleX),
        scale_y: K.ITEM('float', scaleY),
        rotate: K.ITEM('float', rotation),
    });
    }
    
    return stickers
  }