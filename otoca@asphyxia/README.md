# otoca d'or

Plugin Version: **v0.1.0**

---

Supported Versions
  - otoca d'or (NCG:J:A:A:2019012900)

---

How it works
  - The game's network code lives in `modules/ealocal.dll`. It sends XRPC module `game` on service `local`
    (the `local` URL comes from CORE's `services.get`). Every field name, node type and array limit here
    follows the psmap tables in that DLL.
  - Players are identified by the printed cards, not by an e-amusement pass:
    - `game.addUser` creates the player and the first doll.
    - `game.setCardInfo` prints a card. The server issues its `otocard_id` (8 characters of
      `0123456789ABCDEFGHJKLMNPRSTUWXYZ`), which the game packs into the card's QR code.
    - Scanning a card sends `game.getCardInfo` with that id and gets the player, the doll and the closet back.
    - The key card (`game.bindKeyUser`) is a second printed card tied to the player; its id is issued the same way.
  - `game.getVersion` answers episode/phase 99, which the game clamps to the newest it has.

Settings
  - Version marker: unlock step sent in `game.getVersion` (the game checks 1 to 8).
  - Limited-time enemies: turns on all 8 limited-time enemy slots.

Not done yet
  - Checked only with recorded-style requests, not on a cabinet yet.
  - Gift codes (`receiveGift` / `receiveItem`) always answer "nothing".
  - Random bonuses (kira offsets, accessory offsets) are all 0.
  - Stamps, rival cards and item types other than equip/material
    are only logged.
  - No WebUI.

---

Changelog
  - 0.1.0: first version.
