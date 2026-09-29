# otoca d'or

Plugin Version: **v0.2.0**

---

Supported Versions
  - otoca d'or (NCG:J:A:A:2019012900)

---

How it works
  - The game's network code lives in `modules/ealocal.dll`. It sends XRPC module `game` on service `local`
    (the `local` URL comes from CORE's `services.get`). Every field name, node type and array limit here
    follows the psmap tables in that DLL, and every value follows how game.dll uses it.
  - Players are identified by the printed cards, not by an e-amusement pass:
    - `game.addUser` creates the player and the first doll (level 1, the doll's starting equipment).
    - `game.setCardInfo` prints a card. The server issues its `otocard_id` (8 characters of
      `0123456789ABCDEFGHJKLMNPRSTUWXYZ`), which the game packs into the card's QR code, and rolls the
      kira bonus printed on it.
    - Scanning a card sends `game.getCardInfo` with that id and gets the player, the doll, the closet and
      that card's kira bonus back. An unknown card answers status 1, and the game then plays offline.
    - The key card (`game.bindKeyUser`) is a second printed card tied to the player. Once a key is bound,
      scanning a card asks for the key card (`game.checkKeyUser`) and the closet holds 999 items instead of 50.
  - `game.getVersion` and getCardInfo both send episode 5 / phase 11, the newest the game knows.
  - Without a camera, printed card images can be scanned with a hook that feeds an image to the game's
    camera library (libcamera.dll) in place of the camera frame.

Settings
  - Version marker: unlocks hair/eye colours in the salon and the mode-select tips (the game checks 1 to 8).
  - Limited-time enemy: shows the one limited-time enemy the data has (episode 3).
  - Double stamps: two stamps per play.
  - Free star kira: star kira cards need no star powder.

Server policy (the game does not decide these)
  - Kira bonus: star kira gives +1-3 to two stats, gold kira +1-5 to all four.
  - Accessory stats: 80/90/100% of the base values for grade N/R/SR.
  - One stamp per play; a full card of 10 gives one star powder. New players start with one powder
    and the first rival card ticket.
  - "New doll" unlocks once any doll reaches level 5.
  - No questionnaires, and old campaign gift cards answer "expired". The game's own offline card
    (printed when setCardInfo fails) gives its apology gift once.

Not done yet
  - No WebUI.

---

Changelog
  - 0.2.0: every response rebuilt from a full analysis of game.dll (starting equipment, doll seed range,
    key card binding, per-card kira, stamp card of 10, missions, closet rules for accessories, selling
    and discarding).
  - 0.1.0: first version.
