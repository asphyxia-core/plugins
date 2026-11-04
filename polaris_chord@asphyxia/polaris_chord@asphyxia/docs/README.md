# Reverse-engineering notes

These documents are the development log behind this plugin. They explain *why* the
implementation looks the way it does, including every dead end and every wrong conclusion
that was later corrected — that context is often more useful than the final code.

> **Language**: the notes are kept in Simplified Chinese. They were written as working
> notes during reverse engineering, not as user documentation, and re-translating ~60 KB of
> protocol analysis would risk losing detail. The user-facing documentation
> (installation, features, configuration, limitations) is fully in English in
> [`../README.md`](../README.md).

| File | Contents |
|---|---|
| [`gacha-protocol.md`](gacha-protocol.md) | The Hunt (gacha) three-step protocol `begin_gacha` / `draw_gacha` / `end_gacha`: call chain, XRPC models, the `items` / `item_counts` / `item_params` contract, the result animation, the full error-code table, and the pitfalls that make the client hang forever. |
| [`save-data-investigation.md`](save-data-investigation.md) | Why save data appeared to vanish. Covers the `usr.get` / `usr.save` contract, the exact trigger timing of `usr.save`, the difference between "stored" and "replayed", the `Version > assetVersion` row filter, the `CardFilterType` bitmask that hid most of the card list, and the verification method (an offline `buildPlayerBody()` harness plus a byte-for-byte response diff). |

## Scope

Both documents target game build `XIF:J:A:A:2025070800` (asset version 37) and were
verified against Asphyxia CORE v1.70b. Line numbers and file offsets refer to the
decompiled assemblies of that specific build and may not match other versions.
