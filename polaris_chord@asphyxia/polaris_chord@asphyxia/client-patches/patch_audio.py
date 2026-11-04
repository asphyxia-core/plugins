"""Audio fix patch (zero-dependency version; can run silently on every launch).

Problem:
    The game's AudioManagerADX.SetExclusiveWASAPI() initializes CRI's WASAPI output with
    "exclusive mode + a custom 48kHz mono format". Ordinary sound cards / speakers cannot
    supply that exclusive format, so CRI initialization fails outright:

        [CRIWARE] Warning:W2024020600:[WASAPI_EXCLUSIVE] Failed to initialize AudioClient.
        (HRESULT = 0x88890008)        # AUDCLNT_E_UNSUPPORTED_FORMAT

    The result is a completely silent game (switching to any output device changes nothing,
    because a wrong device was never the problem).

Fix (two same-length IL rewrites; file size untouched, PE structure intact):
    1) SetAudioClientShareMode's operand ldc.i4.1(0x17) -> ldc.i4.0(0x16)   shared mode
    2) SetAudioClientFormat's call(0x28+token)          -> pop; nop*4        device default format

Usage:
    py tools\\patch_audio.py            # apply the patch (idempotent; returns at once if already applied)
    py tools\\patch_audio.py --check    # show status only
    py tools\\patch_audio.py --revert   # restore
    py tools\\patch_audio.py --quiet    # silent (for launch scripts; prints nothing on error)

Uninstall/rollback: --revert overwrites the DLL back from the *.dll.orig in the same folder.
If a game update reports a signature mismatch, re-locate with the dnfile-based
tools\\patch_audio_shared.py.
"""
import io
import os
import sys
from pathlib import Path

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

DLL = _resolve_dll('game.common.foundation.dll', sys.argv)
BAK = DLL.with_name(DLL.name + '.orig') if DLL else None

# Original signature: ldc.i4.1 ; call SetAudioClientShareMode ; ... ; call SetAudioClientFormat
#                     0x17       0x28 <token4>                    0x28 <token4>
SHARE_SIG = bytes([0x17, 0x28, 0xE6, 0x01, 0x00, 0x0A])
FMT_SIG = bytes([0x28, 0xE7, 0x01, 0x00, 0x0A])
SHARE_NEW = bytes([0x16, 0x28, 0xE6, 0x01, 0x00, 0x0A])
FMT_NEW = bytes([0x26, 0x00, 0x00, 0x00, 0x00])


def locate(data: bytes):
    """Return (share_off, fmt_off, patched); if nothing matches, (None, None, False)."""
    i = data.find(SHARE_SIG)
    if i >= 0:
        j = data.find(FMT_SIG, i)
        return i, (j if j > 0 else None), False
    i = data.find(SHARE_NEW)
    if i >= 0:
        j = data.find(FMT_NEW, i)
        return i, (j if j > 0 else None), True
    return None, None, False


def main():
    if DLL is None:
        print('!! cannot find the game folder (expects <game>/svm_Data/managed).')
        print('!! pass it explicitly:  py %s --game "D:\\path\\to\\game"' % os.path.basename(__file__))
        print('!! or set the GAME_ROOT environment variable.')
        return 2
    argv = [a.lower() for a in sys.argv[1:]]
    quiet = '--quiet' in argv
    say = (lambda *a: None) if quiet else print

    if not DLL.exists():
        say('cannot find the game DLL:', DLL)
        return 1

    data = DLL.read_bytes()
    share_off, fmt_off, patched = locate(data)

    if share_off is None or fmt_off is None:
        say('[audio] signature mismatch, nothing changed (the game version probably changed)')
        return 0

    def revert():
        if not BAK.exists():
            say('[audio] no backup file, cannot restore')
            return 1
        with open(DLL, 'r+b') as f:
            f.write(BAK.read_bytes())
        say('[audio] restored the original DLL')
        return 0

    if '--check' in argv:
        say('[audio]', 'PATCHED (shared mode)' if patched else 'ORIGINAL (exclusive mode, so the game is silent)')
        say('        share@0x%x  fmt@0x%x' % (share_off, fmt_off))
        return 0

    if '--revert' in argv:
        return revert()

    if patched:
        say('[audio] already fixed, skipping')
        return 0

    if not BAK.exists():
        BAK.write_bytes(data)
        say('[audio] backed up ->', BAK.name)

    with open(DLL, 'r+b') as f:
        f.seek(share_off)
        f.write(SHARE_NEW)
        f.seek(fmt_off)
        f.write(FMT_NEW)
    say('[audio] switched to shared mode + device default format (restart the game to apply)')
    return 0


_utf8_console()


if __name__ == '__main__':
    sys.exit(main())
