"""Check / apply every local patch in one shot (idempotent, safe to run repeatedly).

The three patches
-----------------
1. patch_audio.py               game.common.foundation.dll
   exclusive WASAPI + custom format -> shared mode + device default format (fixes no sound)

2. patch_updater_exception.py   game.common.contents.dll
   suppress NotUpdateContentsUpdaterException (fixes the black screen)

3. patch_music_open.py          game.common.contents.dll
   drop the 'skip non-Open charts' check so Private charts reach the song list

Usage
----
    py client-patches/patch_all.py            # apply (skips anything already patched)
    py client-patches/patch_all.py --check    # show status only, change no files
    py client-patches/patch_all.py --revert   # restore every original DLL

    # when the game folder is not in its default location, pass it explicitly (forwarded to each child script)
    py client-patches/patch_all.py --check --game "D:\\PolarisChord\\game"

Note: reverting either contents patch also reverts the other one (they share the same .orig).
"""
import io
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

STEPS = [
    ('audio (shared mode)', 'patch_audio.py'),
    ('updater exception bypass', 'patch_updater_exception.py'),
    ('full chart unlock', 'patch_music_open.py'),
]


def _utf8_console():
    """Force UTF-8 std streams so Chinese output cannot crash on a GBK console."""
    for name in ('stdout', 'stderr'):
        stream = getattr(sys, name, None)
        if stream is None:
            continue
        enc = (getattr(stream, 'encoding', '') or '').lower().replace('-', '')
        if enc == 'utf8':
            continue
        try:
            setattr(
                sys,
                name,
                io.TextIOWrapper(stream.buffer, encoding='utf-8', errors='replace', line_buffering=True),
            )
        except Exception:
            pass


def _child_env():
    """Make children write UTF-8, otherwise their GBK bytes get mangled here."""
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    return env


def _arg_value(argv, name):
    for i, a in enumerate(argv):
        if a == name and i + 1 < len(argv):
            return argv[i + 1]
        if a.startswith(name + '='):
            return a.split('=', 1)[1]
    return None


def run(script, mode, game):
    cmd = [sys.executable, str(HERE / script)]
    if mode:
        cmd.append(mode)
    if game:
        cmd += ['--game', game]
    p = subprocess.run(
        cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', env=_child_env()
    )
    out = (p.stdout or '').strip() or (p.stderr or '').strip()
    return p.returncode, ' | '.join(x.strip() for x in out.splitlines() if x.strip())


def main():
    argv = sys.argv[1:]
    mode = ''
    for a in argv:
        if a in ('--check', '--revert'):
            mode = a
    game = _arg_value(argv, '--game')

    tag = {'': '[patch]', '--check': '[check]', '--revert': '[revert]'}[mode]
    bad = 0
    for label, script in STEPS:
        rc, out = run(script, mode, game)
        mark = 'OK ' if rc == 0 else 'FAIL'
        if rc != 0:
            bad += 1
        print('%s %s %-14s %s' % (tag, mark, label, out))
    return 1 if bad else 0


_utf8_console()

if __name__ == '__main__':
    sys.exit(main())
