"""Stop the content updater from throwing just because 'some updater did not update' (the root cause of the black screen).

Background
----------
The check in `ContentsRepository.UpdateContentsUpdaterAsync` is:

    if (updateCount != 0) {
        if (contentsUpdaters.All(x => updated.Contains(x))) { /* OK */ }
        else {
            var notUpdated = contentsUpdaters.Except(updated);
            if (notUpdated.Any())
                throw new NotUpdateContentsUpdaterException(notUpdated.ToArray());
        }
    }

If 'any single updater did not update', it throws → `NotUpdateContentsUpdaterException`
→ `ContentsRepository.FetchAsync` aborts → the scene cannot load → black screen.

We (the asphyxia plugin) can only supply chart data; the other kinds of content updater
are permanently 'not updated', so the moment mst_music is served the game black-screens —
this has nothing to do with the chart content itself.

Fix
----
Force the result of `notUpdated.Any()` to the constant false, so the throw branch never runs:

    old:  ldloc.1          (0x11)          ; notUpdated
          call Any         (0x28 + token)  ; -> bool
          brfalse.s ...

    new:  ldc.i4.0         (0x16)          ; push false on the stack
          nop × 5          (0x00)

Both forms are 6 bytes long in total, so the IL layout and the branch targets stay exactly
as they were.

Usage
----
    py tools\\patch_updater_exception.py            # apply the patch
    py tools\\patch_updater_exception.py --check    # show status only
    py tools\\patch_updater_exception.py --revert   # restore (uses the .dll.orig in the same folder)
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

NEW = bytes([0x16, 0x00, 0x00, 0x00, 0x00, 0x00])   # ldc.i4.0 + nop*5


def find_body(pe, type_name, method_name):
    mt = pe.net.mdtables
    for t in mt.TypeDef.rows:
        if str(t.TypeName) != type_name:
            continue
        for m in t.MethodList:
            row = m.row
            if str(row.Name) != method_name:
                continue
            if row.Rva == 0:
                return None
            off = pe.get_offset_from_rva(row.Rva)
            header = pe.__data__[off]
            if header & 0x3 == 0x2:      # tiny
                return off, 1
            if header & 0x3 == 0x3:      # fat
                size_flags = int.from_bytes(pe.__data__[off:off + 2], 'little')
                header_size = ((size_flags >> 12) & 0x0F) * 4
                return off, header_size
            return None
    return None


def resolve(pe, token):
    mt = pe.net.mdtables
    tag, rid = token & 0xFF000000, token & 0xFFFFFF
    try:
        if tag == 0x0A000000:
            return str(mt.MemberRef.rows[rid - 1].Name)
        if tag == 0x06000000:
            return str(mt.MethodDef.rows[rid - 1].Name)
        if tag == 0x2B000000:                       # MethodSpec (LINQ generic calls land here)
            row = mt.MethodSpec.rows[rid - 1]
            inner = getattr(row.Method, 'row_index', None)
            table = row.Method.table.__class__.__name__
            if table == 'MethodDef':
                return str(mt.MethodDef.rows[inner - 1].Name)
            if table == 'MemberRef':
                return str(mt.MemberRef.rows[inner - 1].Name)
    except Exception:
        pass
    return ''


def locate(pe):
    """Search the whole file for `ldloc.1; call Any; brfalse.s`, and require a throw region
    (newobj 0x73) right behind it.

    No method-body offset arithmetic here (converting a fat header goes out of alignment
    easily, and we have been bitten by that before); this matches the byte pattern directly
    and verifies it by resolving the token.
    """
    mt = pe.net.mdtables
    data = pe.__data__

    def name(tok):
        tag, rid = tok & 0xFF000000, tok & 0xFFFFFF
        try:
            if tag == 0x0A000000:
                return str(mt.MemberRef.rows[rid - 1].Name)
            if tag == 0x2B000000:
                row = mt.MethodSpec.rows[rid - 1]
                inner = getattr(row.Method, 'row_index', None)
                table = row.Method.table.__class__.__name__
                if table == 'MemberRef':
                    return str(mt.MemberRef.rows[inner - 1].Name)
                if table == 'MethodDef':
                    return str(mt.MethodDef.rows[inner - 1].Name)
        except Exception:
            pass
        return ''

    cands = []
    for o in range(len(data) - 7):
        if data[o] != 0x07 or data[o + 1] != 0x28:      # ldloc.1 ; call
            continue
        if name(int.from_bytes(data[o + 2:o + 6], 'little')) != 'Any':
            continue
        if data[o + 6] != 0x2C:                          # brfalse.s
            continue
        # the following 24 bytes should hold newobj(0x73) — i.e. throw new NotUpdate...
        tail = data[o + 7:o + 31]
        cands.append((o, 0x73 in tail))
    hits = [c for c in cands if c[1]]
    if len(hits) == 1:
        return hits[0][0]
    if len(cands) == 1:
        return cands[0][0]
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
    # Once patched the original instruction sequence is gone, so the position can no longer
    # be recovered from the current DLL — always locate against the original .orig file
    # (that is what makes the patch idempotent).
    ld_off = None
    for src in (BAK, DLL):
        if src.exists():
            ld_off = locate(dnfile.dnPE(str(src)))
            if ld_off is not None:
                break
    if ld_off is None:
        print('target instruction sequence not found (the game version probably changed), nothing changed')
        return 1
    data = DLL.read_bytes()
    patched = data[ld_off:ld_off + 6] == NEW

    if mode == '--check':
        print('ldloc.1 @0x%x -> %s' % (ld_off,
              'PATCHED' if patched else 'ORIGINAL'))
        return 0
    if mode == '--revert':
        if not BAK.exists():
            print('no backup, cannot restore')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        print('restored the original DLL')
        return 0
    if patched:
        print('already in the patched state')
        return 0
    if not BAK.exists():
        BAK.write_bytes(data)
        print('backed up ->', BAK.name)
    with open(DLL, 'r+b') as f:
        f.seek(ld_off)
        f.write(NEW)
    print('suppressed the NotUpdateContentsUpdaterException throw (restart the game to apply)')
    return 0


_utf8_console()


if __name__ == '__main__':
    sys.exit(main())
