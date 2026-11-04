# xif@asphyxia — Polaris Chord (XIF) Server Plugin

[简体中文](README.zh-CN.md)

An [Asphyxia CORE](https://github.com/asphyxia-core/asphyxia-core) plugin for `XIF:J:A:A:2025070800` (ポラリスコード / Polaris Chord), allowing the arcade game to run offline without official servers.

> **By [花散kasan](https://github.com/kasan)**

## Before you install: this plugin is not self-contained

The plugin only implements the **server** side. Two prerequisites must be met first —
without them the game either black-screens or never gets past the card reader. This is the
#1 reason a fresh setup "does not work at all".

### 1. CORE must be run from source, with three small patches

`cardmng.*` and `pcbevent.put` are **built-in** CORE routes, and CORE always dispatches
built-in routes before plugin routes:

```ts
// src/eamuse/EamuseRootRouter.ts
if (await this.core.run(moduleName, method, info, data, send)) return;   // built-in wins
// src/eamuse/EamuseRouteContainer.ts
await handler(info, data, send);
return true;            // ← always true once the route exists
```

So `R.Route()` in a plugin is never called for them. That means the prebuilt
`asphyxia-core-x64.exe` **cannot** be used — there is nothing editable inside the binary.
Run CORE from source and apply the patches shipped in [`core-patches/`](core-patches/README.md):

```
py core-patches/apply.py --check     # report status, change nothing
py core-patches/apply.py             # apply (idempotent)
py core-patches/apply.py --revert    # undo
```

| CORE patch | Without it |
|---|---|
| numeric RefID (`src/utils/EamuseIO.ts`) | PIN is accepted, then the game jumps back to the title (`RefID contains invalid character`) |
| `cardmng.inquire` reply shape (`src/eamuse/Core/CardManager.ts`) | "mixed connection" (回線混雑) dialog while reading the card |
| `pcbevent.put` Body (`src/eamuse/Core/index.ts`) | after a song: "mixed connection", and **nothing is ever saved** |

### 1b. The CORE source tree also needs `build-env/assets`

That folder holds CORE's own pug templates and static files. Without it **every WebUI page
returns 500**, including this plugin's console page — the plugin itself is fine, CORE just
cannot render any view. It is part of a normal CORE source checkout; if you copied only
`src/` + `node_modules/`, copy `build-env/assets` as well. `py setup.py --check` reports it.

### 2. The game itself needs three client patches

These edit `game/svm_Data/managed/*.dll` on the player's machine, so they cannot be part
of a plugin. See [`client-patches/README.md`](client-patches/README.md).

```
py client-patches/patch_all.py --check
py client-patches/patch_all.py
```

| Client patch | Without it |
|---|---|
| updater exception bypass | **black screen on boot** |
| full chart unlock | song list caps at ~100 tracks |
| shared audio mode | no audio on some sound cards / headsets |

If a script cannot locate your game folder, pass `--game <path>` or set `GAME_ROOT`.
Two of the three client patches parse .NET metadata and need extra packages:
`pip install dnfile dncil`.

### One entry point

`py setup.py` (plugin root) runs every check and every patch in one go:

```
py setup.py --check     # report only
py setup.py             # apply everything
```

It also detects the prebuilt `asphyxia-core-x64.exe` and tells you what to do instead.

### Symptom → missing piece

| What you see | Missing |
|---|---|
| black screen right after launch | updater exception bypass |
| PIN accepted, back to title | numeric RefID patch |
| "mixed connection" while reading the card | `cardmng.inquire` patch |
| can play, but "mixed connection" after a song and nothing persists | `pcbevent.put` patch |
| song list caps at ~100 tracks | full chart unlock |
| no audio | shared audio mode |

## Installation

1. Clone or download this repository into the CORE plugins directory, keeping the folder name `xif@asphyxia`:

   ```
   <AsphyxiaCORE>/plugins/xif@asphyxia/
   ```

2. Apply the prerequisites above (1 × CORE patches, 2 × client patches);
3. Start CORE from source. The first card-in creates a profile automatically.

## Repository layout

```
xif@asphyxia/           ← repository root = plugin folder
├─ index.ts              registration only: GameCode / Contributor / Config / WebUIEvent / Route / Unhandled
├─ handlers/             request handlers per protocol module (EPR)
│  ├─ common.ts          constants, logging, config, XRPC node helpers, route wrapper
│  ├─ store.ts           profile persistence, option building, persistent item table
│  ├─ playerdata.ts      GetPlayDataResponse body (shared by usr.get and gacha)
│  ├─ music.ts          song list / chart unlocking / mst_patch
│  ├─ character.ts       characters and character card instances
│  ├─ mst.ts             mst.get_common
│  ├─ usr.ts             usr.* (login, save, scores)
│  ├─ gacha.ts           gacha.* (three-step lottery)
│  ├─ pcb.ts             pcb.* / local.* / message.get
│  └─ webui.ts           WebUI console events
├─ webui/                custom plugin WebUI page (xif.pug + js)
├─ data/                 data files, regenerable by external scripts
├─ core-patches/         REQUIRED CORE source patches (apply.py + files/CardManager.ts)
├─ client-patches/       game-side patches (optional; touch game files, not part of the plugin runtime)
├─ docs/                 protocol reverse-engineering notes
└─ README.md             this file (also shown in the CORE WebUI)
```

> `cardmng.*` (card read) is handled by **CORE itself** (`src/eamuse/Core/CardManager.ts`).
> Registering it in a plugin has no effect — see [core-patches/](core-patches/README.md)
> for the change CORE itself needs.

## Features

| Module | What it does |
|---|---|
| **Login / player data** | `usr.get` sends every node (profile, play info, options, items, cards, titles, counters, login bonuses, PA skills) |
| **Master data** | `mst.get_common` serves the real local song list (tracks + charts), events, shop; all charts unlocked |
| **Story** | All seven stories readable; progress driven by `Story.CharacterStoryId` markers in `usr_count` |
| **Shop** | Item list + purchase; purchases persist via `usr_item_change_log` in `usr.save` |
| **Hunt (gacha)** | Three-step protocol `begin_gacha` / `draw_gacha` / `end_gacha`; **drawn items and character cards are persisted immediately** and the returned `player_data` is identical in shape to `usr.get` |
| **Scores** | `usr.save_musicscore` stores best rate / score per chart; replayed on login |
| **Save data** | `usr.save` persists everything the game reports — profile, options, item change log (uuid-deduplicated), owned titles, character card instances, character closeness, login-bonus progress, decks (incl. equipped pose / frame / costume), nametag, privacy, sort & filter settings, music missions, PA skills, action counts — and merges it back on next login (static baseline ∪ save data, save data wins) |
| **Card list filter** | `usr_sort_setting`'s `*_filter` fields are sent as `0x1FFFFFF` (`CardFilterType.DEFAULT`) instead of `0`. With `0` (= `NONE`) the game hides every card that is not already in a deck, which looks like "the card list only has 4~5 cards" |
| **Master patch** | `mst_patch` can ship a CSV patch (`mode = "csv"`) that writes rows into the game's in-memory master tables *after* the game's own import — used to rescue the 2 `CharacterCardMaster` rows that `FilterDatabase` deletes |

> The list of persisted nodes is derived from what the game actually reports in `usr.save`.
> **Storing and replaying must be kept in pairs**: a node listed only in `REPLAY_KEYS` but missing
> from `RAW_KEYS` means "we always mean to replay it, but never stored it" — that is exactly the
> bug that made titles and login bonuses vanish for three rounds of debugging.

## IMPORTANT: saves only happen at "Continue"

The game issues its save request (`usr.save`) **only when you finish a song and reach the Continue
scene** (and when you leave the cabinet) — `SavePlayDataStepRunner` in `game.scene.continue`, which
runs before the Continue UI even appears.

> **Alt+F4 / closing the window on the results screen = everything earned that round is lost.**
> To save, always proceed to the Continue screen (or exit the cabinet normally).

## Configuration (WebUI → plugin settings)

| Key | Type | Default | Description |
|---|---|---|---|
| `debug_trace` | boolean | `true` | write every XRPC request/response to `xrpc.log` for protocol debugging |
| `ticket_count` | integer | `999` | amount of `ticket.event.*` granted each login (shop currency), 999 ≈ unlimited |
| `log_limit_kb` | integer | `1024` | `xrpc.log` size cap in KB, 0 = unlimited; requires CORE restart |

## Data files (`data/`)

| File | Purpose |
|---|---|
| `musics.json` | song database (generated from local chart assets) |
| `music.json` | song list switch `{ "enabled": bool, "limit": n }` |
| `unlock.json` | chart unlock range; `limit > 0` grants only the first N charts |
| `patch.json` | `mst_patch` form. Default `{"mode":"csv"}` (ships `mst_patch.csv`); set `"omit"` to send no patch at all |
| `mst_patch.csv` | master data patch: 113 `CharacterCardMaster` rows with `Version` clamped to 37 (generated offline from the game's own master CSV) |
| `gacha.json` | gacha events and card pools |
| `characters.json` | characters and **baseline** card instances (merged with save data, save data wins) |
| `login_bonus.json` | **baseline** login bonus progress (used only when there is no saved progress) |
| `name_titles.json` | **baseline** owned title list (unioned with the saved list) |

## Known limitations

1. **Two cards are missing (fixed, `mst_patch` is enabled)**
   All 113 rows of `CharacterCardMaster` *are* imported — the old "only 1 row gets imported"
   conclusion came from a broken probe. What is actually missing is `00080001` / `00080004`:
   their `Version=9999999` exceeds `assetVersion=37`, so `ContentsRepository.FilterDatabase`
   deletes them with `DELETE FROM 'CharacterCardMaster' WHERE Version > 37`. The client then
   silently drops those two card instances and their items, and drawing them pops 301.
   **Fix**: `mst_patch` runs *before* `FilterDatabase`, so clamping those rows' `Version` to 37
   keeps them alive (the shipped `mst_patch.csv` already has them clamped).

2. **Gacha almost always draws duplicates**
   `data/characters.json` is a static baseline that grants all 113 cards up front, and the
   `gacha.json` pool is the same 113 cards — so every draw is a card you already own (it still
   adds a new card instance to the save, shown as a duplicate). For a real collection loop, trim
   `characters.json`'s `cards` down to a starter set — but **keep at least 1 Contenter and 4
   SupportSnap**, otherwise the game's `RepairCharacterDeck` throws
   `ArgumentException: least 1 contenter required` and login fails.

3. **Default decks converge on rental cards**
   `RegisteredPlayerDataFetcher` concatenates rental cards *before* owned cards, and
   `RepairCharacterDeck` fills empty or invalid slots from `contenters[0]` / `supports[0..3]`.
   Pressing "default deck" therefore always ends up with the 5 rental cards, which are also
   drawn as N-rarity because `RarityEliminate` treats `IsRental` as rarity 0. Use your own cards
   by picking them manually in the deck editor; the plugin then replays that deck faithfully.
   Note that rental cards carry 12482 exp, so swapping them for fresh owned cards lowers stats.

4. **Contenter gacha may still pop 301**
   The result converter requires `CharacterModelMaster` data. Whether that table is missing rows
   too has not been verified yet — add `CharacterModelMaster` to `mst_patch.csv` if you want to
   test it.

5. **Ticket consumption is not applied**
   The persistent item table only replays positive amounts (`n > 0`), so spending
   `ticket.event.*` is ignored — effectively infinite tickets.

## Master patch (`mst_patch`)

On every boot the game does:

```
RestoreDatabase()          ← re-import the master tables from the bundled CSVs
ApplyPatch(csv)            ← CSV shipped in the server's mst_patch, applied row by row
FilterDatabase(37)         ← DELETE FROM '<table>' WHERE Version > 37   ← the catch
```

The patch is plain CSV:

```
<table name>       ← must equal the C# type name, e.g. CharacterCardMaster
<columns,...>      ← must be the table's ColumnName values (including the inherited Version)
<values,...>
<blank line>       ← end of this table
```

**`Version` in the patch must be <= 37**, otherwise the rows are written and then
immediately deleted by step 3 (that is exactly what happens to the two
【チアフルコード】 cards in `CharacterCardMaster`).
The shipped `mst_patch.csv` already has those rows clamped; if you regenerate it from your own
copy of the game's master CSV, clamp every row with `Version > 37` down to 37.

Enable with `data/patch.json` → `{ "mode": "csv", "version": "2025070800" }` (no CORE restart needed).
Check `game/dev/raw/log/output_log.txt` in the game folder for
`PATCH: Update CharacterCardMaster …Version=37`; a failure only logs an exception and leaves things exactly as
they are now — switch back to `omit` to disable.

## Client patches (`client-patches/`)

The game binary itself has several defects that require client-side patches. **These cannot be
integrated into the plugin**:

- Asphyxia CORE is a server and may run on a different machine than the game (one server serving
  multiple cabinets is a common setup). A plugin architecturally cannot touch game files on the
  player's PC.
- The official plugin contract (`R.Route` / `R.Config` / WebUI / `IO`) exposes no way to modify
  anything outside the plugin folder.

| Patch | Without it | Necessity |
|---|---|---|
| Updater exception bypass | **black screen on boot** (broken local master imports → content updaters always partially fail → vanilla logic throws) | strongly recommended |
| Full chart unlock | 227 Private / limited charts missing from the song list | recommended |
| Shared audio mode | no sound on some sound cards / Bluetooth headsets | hardware dependent |

Usage (on the **game machine** — see [`client-patches/README.md`](client-patches/README.md)):

```
pip install dnfile dncil
py client-patches/patch_all.py          # idempotent, safe to re-run
py client-patches/patch_all.py --check  # show status
py client-patches/patch_all.py --revert # restore (writes .orig backups)
```

## Protocol notes

Element names and types come from the game binaries
(`game/svm_data/managed/game.common.infra.dll`, `System.Xml.Serialization` attributes and the
`XrpcInt` / `XrpcString` field declarations):

| Type tag | Meaning |
| --- | --- |
| `s32` / `s16` / `s64` / `u64` | integer |
| `str` | string |
| `bool` | boolean |

**Warning**: `XmlSerializer` is case-sensitive and node names follow the game's `[XmlElement]`
attributes (e.g. `UsrCharacterCard` fields are `index` / `item_id` / `created_at`, not PascalCase).
A wrong case never raises an error — the data is **silently dropped**.

## Troubleshooting

- `xrpc.log`: every request as JSON / XML (controlled by `debug_trace`)
- `log.txt` in the game folder: Unity logs captured by spice2x — **only Warning level is written** (`W:UNITY`)
- `game/dev/raw/log/output_log.txt`: full Unity log, including the `PATCH: Update …` lines emitted
  while `mst_patch` is applied. This is the place to check whether the master patch landed.
- Deep dives in [`docs/`](docs/) — see [`docs/README.md`](docs/README.md) for an English index:
  - [`docs/gacha-protocol.md`](docs/gacha-protocol.md) — Hunt three-step protocol, result
    animation, error-code table, all practical pitfalls
  - [`docs/save-data-investigation.md`](docs/save-data-investigation.md) — save chain, trigger
    timing, the "stored but never replayed" class of bugs, the `FilterDatabase` row filter and
    the `CardFilterType` bitmask behind "the card list only shows 4~5 cards"
