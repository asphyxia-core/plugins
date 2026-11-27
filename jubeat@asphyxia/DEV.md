# Jubeat Plugin: Development Notes

## Code layout

Each supported version is a module under `versions/` that owns its routes. All versions call the same
method names, so `versions/index.ts` picks the version from the date in the model string
(`L44:J:A:A:2015100000`) and calls that version's handler.

- `versions/prop/`, `qubell/`, `clan/`, `festo/`
  - `index.ts` the version's route table and model date range
  - the rest: that version's info node, profile format and features (prop: `course.ts`, `league.ts`)
- `handlers/` shared building blocks the versions wire up
  - `player.ts` the shared profile (jubeat ID, name), and the move of V2.1.0 Qubell saves
  - `scores.ts` the shared score records, single-play saving, and the pre-festo `mdata_list`
  - `version_data.ts` per-version fields, course results and league results, keyed by version id
  - `common.ts`, `lobby.ts` replies several versions share
- `models/` stored documents; `data/` per-version tables

## Versions and stored data

Version ids are the game's number in the series (7 prop, 8 Qubell, 9 clan, 10 festo), which are also
the first digits of the music ids each version added; a version is only sent songs up to its own.

| Version | Model dates               | Version id |
| ------- | ------------------------- | ---------- |
| prop    | 2015022000 - 2016032999   | 7          |
| Qubell  | 2016033000 - 2017062599   | 8          |
| clan    | 2017062600 - 2018089999   | 9          |
| festo   | 2018090000 and later      | 10         |

A model string without a date is answered as festo; builds older than prop are refused.

- `profile`: the shared profile. `jubeatId` and `name` are used by every version; the other fields are festo's.
- `score`: one record per chart, shared by every version. `clear` holds the game's clear flags, which every
  version numbers the same way. Versions before festo only read and write normal-mode records (`isHardMode: false`).
- `version_data`, `version_course`, `version_league`: fields and results of versions before festo, keyed by
  version id, so other versions never receive them.
- `qubell_profile` / `qubell_score`: V2.1.0 Qubell saves, moved to the above on the card's first login and
  kept, marked `migrated`.

## Adding a version

Copy the closest module, change what differs, and list it in `versions/index.ts`.
