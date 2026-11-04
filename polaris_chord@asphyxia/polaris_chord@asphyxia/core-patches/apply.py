

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Apply the three Asphyxia CORE source patches that Polaris Chord requires.

The plugin alone is **not enough**. CORE dispatches built-in routes before plugin
routes, and it treats "a handler exists" as "the request is handled":

    // src/eamuse/EamuseRootRouter.ts
    if (await this.core.run(moduleName, method, info, data, send)) return;   // built-in wins
    if (this.pluginMap[gameCode] && (await this.pluginMap[gameCode].run(...))) return;

    // src/eamuse/EamuseRouteContainer.ts
    await handler(info, data, send);
    return true;            // <-- always true once the route exists

So `cardmng.*` and `pcbevent.put` can never be overridden from a plugin, no matter what
`R.Route` registers. Three small CORE changes are mandatory for XIF:

  1. src/utils/EamuseIO.ts
     CreateProfile(): CORE hands out `'A' + base36` refids by default. The game's
     EA3CardService.ThrowIfInvalidRefId only accepts exactly 16 ASCII digits, so the
     card is rejected right after the PIN and the game bounces back to the title.
     -> for gameCode == 'XIF', generate a 16-digit numeric refid instead.

  2. src/eamuse/Core/CardManager.ts
     cardmng.inquire replies with 7 attributes; the client parses 10 and fails with
     the "mixed connection" dialog. Also, binary/kencoded replies cannot
     carry attributes, so the reply has to be plain XML.
     -> replaced wholesale by files/CardManager.ts.

  3. src/eamuse/Core/index.ts  (pcbevent.put)
     After a song, the game enters the Continue scene and checks whether the
     `pcbevent.put` response has a non-null Body. A plain `send.success()` has none,
     so `IsSucceededSavePlayData` becomes false and the "mixed connection" dialog pops
     up again -> usr.save never happens and nothing is persisted.
     -> return a Body containing now_date.

Usage
-----
    py core-patches/apply.py --check     # report status only, change nothing
    py core-patches/apply.py             # apply (idempotent)
    py core-patches/apply.py --revert    # restore the original files
    py core-patches/apply.py --core "D:\\AsphyxiaCORE"

The CORE folder is auto-detected as the parent of the folder holding this plugin
(`.../plugins/<plugin>/core-patches/apply.py` -> `.../`), or can be given with --core.

This requires a **source** build of CORE (ts-node / `npm run`). The prebuilt
`asphyxia-core-x64.exe` cannot be patched — there is nothing to edit inside it.
"""
import argparse
import re
import shutil
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
FILES = HERE / 'files'

MARKER = 'XIF patch'

# --------------------------------------------------------------------------- #
# patch definitions
# --------------------------------------------------------------------------- #

# 1) EamuseIO.ts — numeric refid for XIF
EAMUSEIO_ORIG = (
    "  const refid = 'A' + ID_GEN.encode(count * 16 + Math.floor(Math.random() * 16));"
)
EAMUSEIO_PATCHED = """  // XIF patch: Polaris Chord validates the RefID strictly as 16 ASCII digits
  // (EA3CardService.ThrowIfInvalidRefId), so the default 'A' + base36 id is rejected
  // right after the PIN and the game bounces back to the title.
  const refid =
    gameCode === 'XIF'
      ? (
          1_000_000_000_000_000n +
          BigInt(count) * 1000n +
          BigInt(Math.floor(Math.random() * 1000))
        ).toString()
      : 'A' + ID_GEN.encode(count * 16 + Math.floor(Math.random() * 16));"""

# 2) Core/index.ts — pcbevent.put must answer with a Body
PCBEVENT_RE = re.compile(
    r"(core\.add\('pcbevent\.put',\s*async\s*\(info,\s*data,\s*send\)\s*=>\s*\{)(.*?)(\n\}\);)",
    re.S,
)
PCBEVENT_BODY = """
  // XIF patch: the game checks this response's Body after a song (Continue scene,
  // SavePlayDataStepRunner.UploadPlayerDataWithPcbEventAsync). A null Body makes
  // IsSucceededSavePlayData false -> "mixed connection" dialog and no usr.save.
  send.object({
    // keep the same format as the other endpoints (no sub-second part) so the client's
    // DateTime parsing cannot trip over it
    now_date: kitem('str', new Date().toISOString().replace(/\\.\\d+Z$/, 'Z')),
  });"""

KITEM_IMPORT = "import { kitem } from '../../utils/KBinJSON';"


def resolve_core(explicit: str) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    # <CORE>/plugins/<plugin>/core-patches/apply.py -> <CORE>
    guess = HERE.parents[2]
    return guess


def state_eamuseio(core: Path) -> str:
    """'patched' | 'original' | 'unknown' | 'missing'"""
    p = core / 'src' / 'utils' / 'EamuseIO.ts'
    if not p.exists():
        return 'missing'
    text = p.read_text(encoding='utf-8')
    if "gameCode === 'XIF'" in text:
        return 'patched'
    if EAMUSEIO_ORIG in text:
        return 'original'
    return 'unknown'


def state_pcbevent(core: Path) -> str:
    p = core / 'src' / 'eamuse' / 'Core' / 'index.ts'
    if not p.exists():
        return 'missing'
    text = p.read_text(encoding='utf-8')
    m = PCBEVENT_RE.search(text)
    if not m:
        return 'unknown'
    body = m.group(2)
    if 'now_date' in body:
        return 'patched'
    if 'send.success()' in body or body.strip() == '':
        return 'original'
    return 'unknown'


def state_cardmanager(core: Path) -> str:
    p = core / 'src' / 'eamuse' / 'Core' / 'CardManager.ts'
    if not p.exists():
        return 'missing'
    text = p.read_text(encoding='utf-8')
    # the patched file carries the extra reply attributes and the plain-XML switch
    if 'useridflag' in text and 'readCardmngMode' in text:
        return 'patched'
    return 'original'


def apply_eamuseio(core: Path) -> str:
    p = core / 'src' / 'utils' / 'EamuseIO.ts'
    st = state_eamuseio(core)
    if st == 'patched':
        return 'already patched'
    if st != 'original':
        return 'SKIP: pattern not found — patch manually (see README)'
    backup(p)
    text = p.read_text(encoding='utf-8')
    p.write_text(text.replace(EAMUSEIO_ORIG, EAMUSEIO_PATCHED, 1), encoding='utf-8')
    return 'patched'


def apply_pcbevent(core: Path) -> str:
    p = core / 'src' / 'eamuse' / 'Core' / 'index.ts'
    st = state_pcbevent(core)
    if st == 'patched':
        return 'already patched'
    if st != 'original':
        return 'SKIP: pcbevent.put block not found — patch manually (see README)'
    backup(p)
    text = p.read_text(encoding='utf-8')
    text = PCBEVENT_RE.sub(lambda m: m.group(1) + PCBEVENT_BODY + m.group(3), text, count=1)
    if KITEM_IMPORT not in text:
        # the patched body uses kitem(); add the import if the original did not have it
        text = text.replace("import { cardmng } from './CardManager';",
                            "import { cardmng } from './CardManager';\n" + KITEM_IMPORT, 1)
    p.write_text(text, encoding='utf-8')
    return 'patched'


def apply_cardmanager(core: Path) -> str:
    p = core / 'src' / 'eamuse' / 'Core' / 'CardManager.ts'
    st = state_cardmanager(core)
    if st == 'patched':
        return 'already patched'
    if st == 'missing':
        return 'SKIP: file not found — is this a CORE source tree?'
    backup(p)
    shutil.copyfile(FILES / 'CardManager.ts', p)
    return 'replaced with files/CardManager.ts'


def backup(p: Path) -> None:
    b = p.with_suffix(p.suffix + '.orig-xif')
    if not b.exists():
        shutil.copyfile(p, b)


def revert_one(core: Path, rel: str) -> str:
    p = core / rel
    b = p.with_suffix(p.suffix + '.orig-xif')
    if not b.exists():
        return 'no backup (.orig-xif) — nothing to revert'
    shutil.copyfile(b, p)
    b.unlink()
    return 'restored from .orig-xif'


TARGETS = [
    ('EamuseIO.ts (numeric refid)', 'src/utils/EamuseIO.ts', state_eamuseio, apply_eamuseio),
    ('CardManager.ts (cardmng reply)', 'src/eamuse/Core/CardManager.ts', state_cardmanager, apply_cardmanager),
    ('Core/index.ts (pcbevent.put)', 'src/eamuse/Core/index.ts', state_pcbevent, apply_pcbevent),
]


def main() -> int:
    ap = argparse.ArgumentParser(description='apply the XIF CORE source patches')
    ap.add_argument('--core', default='', help='path to the AsphyxiaCORE source folder')
    ap.add_argument('--check', action='store_true', help='report status only')
    ap.add_argument('--revert', action='store_true', help='restore the original files')
    args = ap.parse_args()

    core: Path = resolve_core(args.core)
    print('CORE folder: %s' % core)

    if not (core / 'src').is_dir():
        print()
        print('!! %s does not look like an AsphyxiaCORE *source* tree (no src/ folder).' % core)
        print('!! The prebuilt asphyxia-core-x64.exe cannot be patched — you need the')
        print('!! source distribution (npm install + ts-node), see the README.')
        return 1

    mode = 'check' if args.check else ('revert' if args.revert else 'apply')
    print('mode: %s' % mode)

    bad = 0
    for label, rel, state_fn, apply_fn in TARGETS:
        if mode == 'check':
            st = state_fn(core)
            mark = {'patched': 'OK  ', 'original': 'MISS', 'unknown': '????', 'missing': 'MISS'}[st]
            print('  [%s] %-34s %s' % (mark, label, st))
            if st != 'patched':
                bad += 1
        elif mode == 'revert':
            print('  [revert] %-32s %s' % (label, revert_one(core, rel)))
        else:
            print('  [apply]  %-32s %s' % (label, apply_fn(core)))

    if mode == 'check':
        print()
        if bad == 0:
            print('All three CORE patches are applied.')
            return 0
        print('%d of %d CORE patches are missing — run without --check to apply them.' % (bad, len(TARGETS)))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
