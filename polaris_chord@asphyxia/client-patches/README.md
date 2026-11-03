# Game Client Patches (optional, but strongly recommended)

[简体中文](README.zh-CN.md)

> **These patches target the game binary itself — they are NOT part of the plugin.**
> Asphyxia CORE is a server. It can run on a different machine than the game
> (one server serving multiple cabinets is a common setup), so a plugin
> architecturally cannot — and should not — modify game files on the player's PC.
> This step must be done manually once, on every PC that runs the game.

## Requirements

```
pip install dnfile dncil
```

## Usage

Place this folder on the **game machine**, next to the `game/` directory (project root):

```
some-folder/
├─ game/            ← the game (next to spice64.exe)
└─ client-patches/  ← this folder
```

Then:

```
py patch_all.py            # apply all patches (idempotent, safe to re-run)
py patch_all.py --check    # show status only
py patch_all.py --revert   # restore everything (uses the .orig backups)
```

> The scripts locate `../game/svm_Data/managed/` relative to their own location —
> copy them wherever the game lives, and re-run after moving the game.
> Each patch creates a `.orig` backup of the original DLL on first run.

## What each patch fixes

### 1. Updater exception bypass (`patch_updater_exception.py`) — **strongly recommended**

- **File**: `game.common.contents.dll`
- **Without it**: the game black-screens on startup
  (`NotUpdateContentsUpdaterException`).
- **How it works**: at boot the game runs a series of "content updaters" whose vanilla
  rule is *throw if any single one did not update*. Several of this game's local master
  tables (character cards, stories, models — CSV-backed) are broken at import time
  (measured: `CharacterCardMaster` imports 1 row out of 113), so those updaters **fail
  under any server** and the vanilla game always black-screens. The patch turns the
  throw into an ignore so boot continues.
- **Why the plugin cannot replace this**: the broken data lives inside the game's own
  Addressables bundles; the server cannot repair it, and repacking the bundles trips the
  game's resource validation and black-screens it (verified twice).

### 2. Full chart unlock (`patch_music_open.py`) — recommended, otherwise part of the song list is missing

- **File**: `game.common.contents.dll`
- **Without it**: 227 Private / limited charts are skipped by the client and never
  appear in the song list.
- **How it works**: removes the "skip non-Open charts" check. The plugin already grants
  every chart via `usr_item` items, but the client filters again by per-chart open state.

### 3. Shared audio mode (`patch_audio.py`) — depends on your audio device

- **File**: `game.common.foundation.dll`
- **Without it**: no sound on some sound cards / Bluetooth headsets.
- **How it works**: WASAPI exclusive mode + custom format → shared mode + device default format.

## Relationship with the plugin

| Layer | Contents | Location |
|---|---|---|
| Server (the plugin) | protocol implementation, player data, song / shop / event / gacha data | CORE `plugins/` |
| Client (this folder) | fixes defects of the game binary itself (broken local master, audio exclusivity, chart filtering) | every game PC |

Both layers are needed: no matter how complete the server data is, the client-side
import damage still has to be papered over by the patch.
