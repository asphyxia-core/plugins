# CORE source patches (required)

**The plugin alone cannot make Polaris Chord work.** Three small changes to Asphyxia
CORE itself are mandatory, and this folder ships them.

## Why a plugin cannot do this

CORE dispatches built-in routes before plugin routes, and it treats "a handler exists"
as "the request is handled":

```ts
// src/eamuse/EamuseRootRouter.ts
if (await this.core.run(moduleName, method, info, data, send)) return;   // built-in wins
if (this.pluginMap[gameCode] && (await this.pluginMap[gameCode].run(...))) return;

// src/eamuse/EamuseRouteContainer.ts
await handler(info, data, send);
return true;            // ← always true once the route exists
```

`cardmng.*` and `pcbevent.put` are registered by CORE itself, so `R.Route()` in a plugin
is never called for them. That is why these three fixes have to live in CORE's source.

## The three patches

| # | File | Symptom without it | What it changes |
|---|---|---|---|
| 1 | `src/utils/EamuseIO.ts` | After entering the PIN the game bounces back to the title; CORE log shows `RefID contains invalid character` | `CreateProfile()` gives XIF a **16-digit numeric** refid instead of the default `'A' + base36` one, because `EA3CardService.ThrowIfInvalidRefId` only accepts `[0-9]{16}` |
| 2 | `src/eamuse/Core/CardManager.ts` | The "mixed connection" (回線混雑) dialog while reading the card; card never accepted | `cardmng.inquire` replies with all 10 attributes the client parses (`pcode`, `useridflag`, `extidflag`, `quickec`, …) and forces a **plain XML** reply (a kencoded/binary reply cannot carry attributes) |
| 3 | `src/eamuse/Core/index.ts` | After a song, pressing Continue pops "mixed connection" and **nothing is saved** | `pcbevent.put` returns a Body containing `now_date`. The game checks that Body in the Continue scene (`SavePlayDataStepRunner.UploadPlayerDataWithPcbEventAsync`); a null Body makes `IsSucceededSavePlayData` false, so `usr.save` never happens |

Patch 2 is applied by replacing `CardManager.ts` with the version in `files/`.
Patches 1 and 3 are small text substitutions done by the script.

## Usage

The script auto-detects the CORE folder as the parent of the folder containing this
plugin (`.../plugins/<plugin>/core-patches/` → `.../`). Use `--core` to point elsewhere.

```bash
py core-patches/apply.py --check     # report status, change nothing
py core-patches/apply.py             # apply (idempotent)
py core-patches/apply.py --revert    # restore the original files
```

Originals are backed up next to the file as `<name>.orig-xif` before they are touched.

### This needs a source build of CORE

These are **TypeScript source** patches. The prebuilt `asphyxia-core-x64.exe` cannot be
patched — there is nothing editable inside the binary. Run CORE from source:

```bash
cd <AsphyxiaCORE>
npm install
node node_modules/ts-node/dist/bin.js --transpile-only src/AsphyxiaCore.ts
```

## If the script cannot find a pattern

`apply.py --check` prints `????` when a file exists but does not contain the expected
snippet — that means your CORE version differs. Apply the change by hand:

**1. `src/utils/EamuseIO.ts`, inside `CreateProfile()`** — replace

```ts
  const refid = 'A' + ID_GEN.encode(count * 16 + Math.floor(Math.random() * 16));
```

with

```ts
  const refid =
    gameCode === 'XIF'
      ? (
          1_000_000_000_000_000n +
          BigInt(count) * 1000n +
          BigInt(Math.floor(Math.random() * 1000))
        ).toString()
      : 'A' + ID_GEN.encode(count * 16 + Math.floor(Math.random() * 16));
```

**3. `src/eamuse/Core/index.ts`** — make `pcbevent.put` answer with a Body. It must
contain `now_date`, and `kitem` must be imported from `../../utils/KBinJSON`:

```ts
import { kitem } from '../../utils/KBinJSON';

core.add('pcbevent.put', async (info, data, send) => {
  send.object({
    now_date: kitem('str', new Date().toISOString().replace(/\.\d+Z$/, 'Z')),
  });
});
```

## Diagnosing "it does not work at all"

| What you see | Missing piece |
|---|---|
| Game black-screens right after launch | `client-patches/patch_updater_exception.py` |
| PIN accepted but the game returns to the title | patch 1 above |
| "Mixed connection" while reading the card | patch 2 above |
| Can play, but "mixed connection" after a song and nothing persists | patch 3 above |
| Song list caps at ~100 tracks | `client-patches/patch_music_open.py` |
| No audio at all | `client-patches/patch_audio.py` |

`py check_env.py` (in the plugin root) checks all of the above in one go.

## Debugging aid

The patched `CardManager.ts` can dump the raw `cardmng` payloads, which is how the reply
shape above was reverse-engineered. It is **off by default**; set the environment
variable before starting CORE:

```bash
set XIF_CARDMNG_DEBUG=1     # Windows cmd
$env:XIF_CARDMNG_DEBUG="1"  # PowerShell
```

Output goes to `cardmng-debug.log` in the CORE folder.
