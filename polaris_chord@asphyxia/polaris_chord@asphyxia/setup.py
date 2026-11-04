

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""One entry point for everything this plugin needs outside of `plugins/`.

Polaris Chord needs **six** things that a plugin cannot provide, and a fresh install
misses all of them. This script detects and applies them in one go:

  CORE source patches (3)   -> delegates to core-patches/apply.py
  game client patches (3)   -> delegates to client-patches/patch_all.py

Usage
-----
    py setup.py                     # detect + apply everything
    py setup.py --check             # report only, change nothing
    py setup.py --core "D:\\AsphyxiaCORE"
    py setup.py --game "D:\\PolarisChord"

Why CORE must be a source build
-------------------------------
`cardmng.*` and `pcbevent.put` are built-in CORE routes, and CORE always dispatches
built-in routes first, returning "handled" as soon as a handler exists:

    if (await this.core.run(...)) return;      // EamuseRootRouter
    await handler(info, data, send); return true;   // EamuseRouteContainer

So a plugin can never override them, and the three CORE changes are mandatory. The
prebuilt `asphyxia-core-x64.exe` is a packaged binary: there is nothing editable inside
it. This script detects that case and tells you exactly what to do instead of failing
mysteriously.
"""
import argparse
import subprocess
import io
import os
import sys
from pathlib import Path

def _utf8_console():
    """Force UTF-8 std streams so non-ASCII output cannot crash on a GBK console."""
    for name in ('stdout', 'stderr'):
        stream = getattr(sys, name, None)
        if stream is None:
            continue
        enc = (getattr(stream, 'encoding', '') or '').lower().replace('-', '')
        if enc == 'utf8':
            continue
        try:
            setattr(sys, name,
                    io.TextIOWrapper(stream.buffer, encoding='utf-8',
                                     errors='replace', line_buffering=True))
        except Exception:
            pass


_utf8_console()


HERE = Path(__file__).resolve().parent

CORE_PATCHER = HERE / 'core-patches' / 'apply.py'
CLIENT_PATCHER = HERE / 'client-patches' / 'patch_all.py'


def _missing_python_deps():
    """dnfile + dncil are needed by two of the three client patches."""
    missing = []
    try:
        import dnfile  # noqa: F401
    except ImportError:
        missing.append('dnfile')
    try:
        import dncil  # noqa: F401
    except ImportError:
        missing.append('dncil')
    return missing


def run(script: Path, extra):
    cmd = [sys.executable, str(script)] + list(extra)
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8',
                       errors='replace', env=env)
    out = ((p.stdout or '') + (p.stderr or '')).strip()
    return p.returncode, out


def detect_core_kind(core: Path) -> str:
    """'source' | 'exe' | 'unknown'"""
    if (core / 'src' / 'utils' / 'EamuseIO.ts').is_file():
        return 'source'
    if list(core.glob('asphyxia-core*.exe')):
        return 'exe'
    if (core / 'build' / 'index.js').is_file() and (core / 'package.json').is_file():
        # a compiled-but-not-exe tree: patching src/ would have no effect on build/index.js
        return 'compiled'
    return 'unknown'


def main() -> int:
    ap = argparse.ArgumentParser(description='check / apply everything Polaris Chord needs')
    ap.add_argument('--check', action='store_true', help='report only')
    ap.add_argument('--core', default='', help='path to the AsphyxiaCORE folder')
    ap.add_argument('--game', default='', help='path to the game folder (contains svm_Data)')
    args = ap.parse_args()

    core = Path(args.core).expanduser().resolve() if args.core else HERE.parents[1]
    kind = detect_core_kind(core)

    print('=' * 68)
    print('  CORE folder : %s' % core)
    print('  detected    : %s' % kind)
    print('  mode        : %s' % ('check' if args.check else 'apply'))
    print('=' * 68)
    print()

    failed = 0

    # ---------------- CORE side ----------------
    print('[1/2] CORE source patches')
    if kind == 'source':
        rc, out = run(CORE_PATCHER, ['--core', str(core)] + (['--check'] if args.check else []))
        print(out)
        if rc != 0 and not args.check:
            failed += 1
        elif rc != 0 and args.check:
            failed += 1
    elif kind == 'exe':
        print('  !! This is the pre-built asphyxia-core-x64.exe.')
        print('  !! It CANNOT be patched: the three required changes live in TypeScript')
        print('  !! sources that were bundled into the binary.')
        print()
        print('  You need the CORE *source* build instead. On a clean machine:')
        print()
        print('    git clone https://github.com/asphyxia-core/asphyxia-core')
        print('    cd asphyxia-core')
        print('    npm install')
        print('    # copy this plugin folder into plugins/')
        print('    py plugins/xif@asphyxia/setup.py')
        print('    node node_modules/ts-node/dist/bin.js --transpile-only src/AsphyxiaCore.ts')
        print()
        print('  (the exe ships no build script, so a patched exe cannot be produced here)')
        failed += 1
    elif kind == 'compiled':
        print('  !! This CORE tree contains build/index.js but no src/*.ts.')
        print('  !! Patching sources would not affect the compiled output — use the source tree.')
        failed += 1
    else:
        print('  !! Cannot tell what this folder is. Pass --core <path to AsphyxiaCORE>.')
        failed += 1

    print()
    print('[WebUI] view templates')
    views = core / 'build-env' / 'assets' / 'views'
    if (views / 'index.pug').is_file():
        print('  OK   %s' % views)
    else:
        print('  !! %s is missing.' % views)
        print("  !! The CORE WebUI would return 500 for every page, including this plugin's console.")
        print('  !! Copy the assets folder from a working CORE source tree:')
        print('  !!   xcopy /E /I "<some-working-CORE>\\build-env\\assets" "%s"'
              % (core / 'build-env' / 'assets'))
        failed += 1

    print()
    print('[2/2] Game client patches')
    missing = _missing_python_deps()
    if missing:
        print('  !! missing Python package(s): %s' % ', '.join(missing))
        print('  !! two of the three client patches parse .NET metadata, they need:')
        print('  !!     pip install dnfile dncil')
        print('  !! (patch_audio.py works without them)')
        failed += 1
        missing_deps = True
    else:
        missing_deps = False
    rc, out = (1, '') if missing_deps else run(CLIENT_PATCHER, ['--check'] if args.check else [])
    if args.game and not missing_deps:
        # patch_all.py does not forward --game; call the three scripts directly
        rc, out = (0, '')
        for script in ('patch_audio.py', 'patch_updater_exception.py', 'patch_music_open.py'):
            r, o = run(HERE / 'client-patches' / script,
                       ['--game', args.game] + (['--check'] if args.check else []))
            out += '\n  %-28s %s' % (script, o.splitlines()[-1] if o else '')
            if r != 0:
                rc = r
    print(out if out else '  (no output)')
    if rc != 0:
        failed += 1

    print()
    print('=' * 68)
    if failed == 0 and not args.check:
        print('  All set. Start CORE from source:')
        print('    node node_modules/ts-node/dist/bin.js --transpile-only src/AsphyxiaCore.ts')
    elif failed == 0:
        print('  Everything this plugin depends on is in place.')
    else:
        print('  %d step(s) need attention — see the messages above.' % failed)
    print('=' * 68)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
