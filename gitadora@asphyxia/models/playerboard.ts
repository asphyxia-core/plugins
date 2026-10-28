import { PlayerInfo } from "./playerinfo";

/**
 * Fixed-grid playerboard layout, matching the official e-amusement customize page:
 * stickers snap to a 3x5 position grid and come in two sizes.
 *
 * The whole grid is confirmed on a real cabinet: [160, 235] is the center anchor (a
 * full-board background image lines up exactly with the board panel there), and each grid
 * step — in both the 3-wide column direction and the 5-tall row direction — is a uniform 96px
 * from the center.
 *
 * Size 1 is the 1.0x baseline. Size 2 was confirmed to change the sticker on a cabinet; 0.6x
 * (smaller) is the value that suits normal sticker use.
 *
 * Rotation is NOT verified yet: the unit sent in `rotate` (degrees assumed) and the step the
 * official page uses (ROTATE_STEP) are guesses. Change ROTATE_STEP here and in
 * webui/profile_player_info.pug together if a cabinet shows otherwise.
 */
export const CENTER_X = 160;
export const CENTER_Y = 235;
export const GRID_STEP = 96;
export const GRID_COLUMNS = 3;
export const GRID_ROWS = 5;
const COLUMN_OFFSETS = [CENTER_X - GRID_STEP, CENTER_X, CENTER_X + GRID_STEP];
const ROW_OFFSETS = [CENTER_Y - 2 * GRID_STEP, CENTER_Y - GRID_STEP, CENTER_Y, CENTER_Y + GRID_STEP, CENTER_Y + 2 * GRID_STEP];
const SIZE_SCALE: Record<number, number> = { 1: 1, 2: 0.6 };

export const MIN_POSITION = 1;
export const MAX_POSITION = GRID_COLUMNS * GRID_ROWS; // 15
export const DEFAULT_POSITION = 8; // center
export const MIN_SIZE = 1;
export const MAX_SIZE = 2;
export const DEFAULT_SIZE = 1;
export const MAX_STICKER_SLOTS = 10;
export const ROTATE_STEP = 45;

/** What the WebUI editor submits. */
export interface PickerBoard {
  sheet: number | null;
  stickers: PickerSticker[];
}

export interface PickerSticker {
  id: number;
  position: number; // 1-15, row-major from the top-left
  size: number; // 1-2
  rotate: number; // multiple of ROTATE_STEP, normalized to [0, 360)
  /**
   * 0-based UI slot index (0..MAX_STICKER_SLOTS-1). Stored alongside the sticker so that
   * leaving an earlier slot empty doesn't shift later stickers forward on the next load.
   */
  slot: number;
}

type StoredBoard = NonNullable<PlayerInfo['playerboard']>;
type StoredSticker = StoredBoard['sticker'][number];

export function positionToOffset(position: number): [number, number] {
  const clamped = Math.min(MAX_POSITION, Math.max(MIN_POSITION, Math.round(position)));
  const row = Math.floor((clamped - 1) / GRID_COLUMNS);
  const col = (clamped - 1) % GRID_COLUMNS;
  return [COLUMN_OFFSETS[col], ROW_OFFSETS[row]];
}

export function sizeToScale(size: number): number {
  return SIZE_SCALE[size] ?? SIZE_SCALE[DEFAULT_SIZE];
}

export function normalizeRotate(rotate: number): number {
  const snapped = Math.round(rotate / ROTATE_STEP) * ROTATE_STEP;
  return ((snapped % 360) + 360) % 360;
}

function isIntegerInRange(value: any, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/** Strict validation of the WebUI payload; anything off-grid is rejected rather than guessed. */
export function isValidPickerBoard(value: any): value is PickerBoard {
  if (value == null || typeof value !== 'object') return false;
  if (value.sheet !== null && !Number.isInteger(value.sheet)) return false;
  if (!Array.isArray(value.stickers) || value.stickers.length > MAX_STICKER_SLOTS) return false;

  const slots = new Set<number>();
  for (const item of value.stickers) {
    if (
      item == null ||
      !Number.isInteger(item.id) || item.id < 0 ||
      !isIntegerInRange(item.position, MIN_POSITION, MAX_POSITION) ||
      !isIntegerInRange(item.size, MIN_SIZE, MAX_SIZE) ||
      !Number.isFinite(item.rotate) ||
      !isIntegerInRange(item.slot, 0, MAX_STICKER_SLOTS - 1) ||
      slots.has(item.slot)
    ) {
      return false;
    }
    slots.add(item.slot);
  }
  return true;
}

/** Converts the editor's grid/size presets into the stored, wire-shaped playerboard. */
export function pickerToPlayerBoard(picker: PickerBoard): StoredBoard {
  const sticker: StoredSticker[] = [...picker.stickers]
    .sort((a, b) => a.slot - b.slot)
    .map(item => {
      const [x, y] = positionToOffset(item.position);
      const scale = sizeToScale(item.size);
      return {
        id: item.id,
        pos_x: x,
        pos_y: y,
        scale_x: scale,
        scale_y: scale,
        rotate: normalizeRotate(item.rotate),
        slot: item.slot,
      };
    });

  return {
    index: 1,
    is_active: picker.sheet != null || sticker.length > 0,
    sheet: picker.sheet,
    sticker,
  };
}

/**
 * The wire protocol has no separate field for the background — it is just another sticker.
 * Confirmed on a real cabinet: a Sheet-kind item placed at the center anchor with scale 1
 * fills the whole board. It is sent first so stickers layer on top of it.
 */
export function sheetToSticker(sheetId: number): StoredSticker {
  return {
    id: sheetId,
    pos_x: CENTER_X,
    pos_y: CENTER_Y,
    scale_x: 1,
    scale_y: 1,
    rotate: 0,
  };
}

/**
 * Resolves every stored shape into the ordered sticker list sent to the game:
 * - current editor: `playerboard.sheet` + grid stickers
 * - older free-placement editor: `playerboard.sticker` as-is (sticker[0] is the background)
 * - legacy documents: `sheet` + `card`
 */
export function getBoardStickers(playerInfo: Partial<PlayerInfo> | null | undefined): {
  stickers: any[];
  isActive: boolean;
} {
  const board = playerInfo?.playerboard;
  if (board && Array.isArray(board.sticker)) {
    const stickers = board.sheet != null ? [sheetToSticker(board.sheet), ...board.sticker] : board.sticker;
    const isActive = board.is_active === undefined ? stickers.length > 0 : Boolean(board.is_active);
    return { stickers, isActive };
  }

  const legacyCard = Array.isArray(playerInfo?.card) ? playerInfo.card : [];
  const stickers = [
    ...(playerInfo?.sheet != null ? [sheetToSticker(playerInfo.sheet)] : []),
    ...legacyCard,
  ];
  return { stickers, isActive: stickers.length > 0 };
}
