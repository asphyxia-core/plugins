"""Let "not yet released (Private)" charts enter the song selection list too.

Background
----------
When `MusicDataQueryMasterUpdater.UpdateAsync` builds the in-memory chart table:

    bool isOpen = _catalogCache.TryGetValue(chart.chart_id, out var entry)
        ? entry.LimitationType == 2          // what the server gives us
        : chart.limitation_type == 2;        // the local master's (Private = 1)

    if (!isOpen) continue;                   // ← skipped right here
    music.Item2.Add(new ChartData(chart, entry));

227 entries in the local ChartDataMaster are `Private` (not yet released), and the
server catalog keys do not match either, so isOpen is always false: those charts never
make it into MusicData at all — the song selection list is forever only 100 tracks.

Fix
----
Turn the `brfalse.s` at IL787 into `nop; nop` (no more skipping), so `Add` runs whether
isOpen is true or false → all 323 tracks enter the list.

Together with the full set of chart items the plugin already delivers through `usr_item`,
`PlayerMusicChartAccessControl.GetAccessLevel` returns Playable(20) for these charts, so
they are not only displayed but actually playable.

Usage
----
    py tools\\patch_music_open.py            # apply the patch
    py tools\\patch_music_open.py --check
    py tools\\patch_music_open.py --revert   # restore (.orig is the original stock DLL)
"""
import io
import os
import sys
from pathlib import Path

import dnfile
from dncil.cil.body.reader import read_method_body_from_bytes

HERE = Path(__file__).resolve().parent


def _find_game_root():
    """Locate the game folder (the one that contains svm_Data/managed).

    These scripts used to live in <repo>/tools so a hard-coded parent.parent pointed at the
    repo root. Inside the plugin package the layout is <CORE>/plugins/<plugin>/client-patches/,
    which is nowhere near the game, so probe a few candidates and allow an override.
    """
    env = os.environ.get('GAME_ROOT')
    if env:
        return Path(env)
    candidates = []
    for base in [HERE, HERE.parent, HERE.parent.parent, HERE.parent.parent.parent]:
        candidates.append(base / 'game')
        candidates.append(base)
    candidates.append(HERE.parent.parent.parent.parent / 'game')
    for cand in candidates:
        if (cand / 'svm_Data' / 'managed').is_dir():
            return cand
    return None


def _arg_value(argv, name):
    for i, a in enumerate(argv):
        if a == name and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith(name + '='):
            return a.split('=', 1)[1]
    return None


def _utf8_console():
    """Force UTF-8 std streams so Chinese output cannot crash on a GBK console."""
    for _name in ('stdout', 'stderr'):
        _stream = getattr(sys, _name, None)
        if _stream is None:
            continue
        _enc = (getattr(_stream, 'encoding', '') or '').lower().replace('-', '')
        if _enc == 'utf8':
            continue
        try:
            setattr(sys, _name,
                    io.TextIOWrapper(_stream.buffer, encoding='utf-8',
                                     errors='replace', line_buffering=True))
        except Exception:
            pass


def _resolve_dll(rel_name, argv):
    root = _arg_value(argv, '--game')
    if root:
        return Path(root) / 'svm_Data' / 'managed' / rel_name
    root = _find_game_root()
    if root is None:
        return None
    return root / 'svm_Data' / 'managed' / rel_name

DLL = _resolve_dll('game.common.contents.dll', sys.argv)
BAK = DLL.with_name(DLL.name + '.orig') if DLL else None

NOP2 = b'\x00\x00'


def find_target(pe):
    """Find the brfalse.s after `ceq` inside MusicDataQueryMasterUpdater+<UpdateAsync>d__10.MoveNext."""
    mt = pe.net.mdtables
    owner = None
    for i, t in enumerate(mt.TypeDef.rows, 1):
        if str(t.TypeName) == 'MusicDataQueryMasterUpdater':
            owner = i
    if not owner:
        return None
    rid = None
    for nc in mt.NestedClass.rows:
        if nc.EnclosingClass.row_index == owner and str(nc.NestedClass.row.TypeName) == '<UpdateAsync>d__10':
            rid = nc.NestedClass.row_index
    if not rid:
        return None
    for m in mt.TypeDef.rows[rid - 1].MethodList:
        row = m.row
        if str(row.Name) != 'MoveNext' or row.Rva == 0:
            continue
        body_off = pe.get_offset_from_rva(row.Rva)
        body = read_method_body_from_bytes(pe.__data__[body_off:body_off + 8192])
        insns = list(body.instructions)
        for i, insn in enumerate(insns):
            if str(insn.opcode) != 'brfalse.s':
                continue
            prev = insns[i - 1] if i else None
            if prev is None or str(prev.opcode) != 'ceq':
                continue
            off = body_off + insn.offset
            if pe.__data__[off] != 0x2C:
                continue
            return off
    return None


def main():
    if DLL is None:
        print('!! cannot find the game folder (expects <game>/svm_Data/managed).')
        print('!! pass it explicitly:  py %s --game "D:\\path\\to\\game"' % os.path.basename(__file__))
        print('!! or set the GAME_ROOT environment variable.')
        return 2
    mode = sys.argv[1] if len(sys.argv) > 1 else '--patch'
    if not DLL.exists():
        print('cannot find', DLL)
        return 1
    data = DLL.read_bytes()
    if mode == '--revert':
        if not BAK.exists():
            print('no backup, cannot restore')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        print('restored the original DLL (this also undoes the updater exception patch, re-apply it)')
        return 0

    # Once patched the instruction is already nop, so the position can no longer be
    # recovered from the current DLL — always locate against the original .orig file
    # (that is what makes the patch idempotent).
    off = None
    for src in (BAK, DLL):
        if src.exists():
            off = find_target(dnfile.dnPE(str(src)))
            if off is not None:
                break
    if off is None:
        print('target brfalse.s not found (the game version probably changed)')
        return 1
    patched = data[off:off + 2] == NOP2
    if mode == '--check':
        print('brfalse.s @0x%x -> %s' % (off, 'PATCHED' if patched else 'ORIGINAL'))
        return 0
    if patched:
        print('already in the patched state')
        return 0
    with open(DLL, 'r+b') as f:
        f.seek(off)
        f.write(NOP2)
    print('removed the "skip non-Open charts" check (0x%x → nop nop)' % off)
    print('note: restart the game for this to take effect')
    return 0


_utf8_console()


if __name__ == '__main__':
    sys.exit(main())
