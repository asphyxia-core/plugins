# otoca d'or

Plugin Version: **v0.3.0**

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
    - Scanning a card sends `game.getCardInfo` with that id and gets the player, the latest doll in the
      coord printed on that card, the closet and that card's kira bonus back. An unknown card answers
      status 1, and the game then plays offline.
    - The key card (`game.bindKeyUser`) is a second printed card tied to the player. Once a key is bound,
      scanning a card asks for the key card (`game.checkKeyUser`) and the closet holds 999 items instead of 50.
  - `game.getVersion` and getCardInfo both send episode 5 / phase 11, the newest the game knows.
  - Without a camera, printed card images can be scanned with a hook that feeds an image to the game's
    camera library (libcamera.dll) in place of the camera frame.

Settings
  - Version marker: unlocks hair/eye colours in the salon and the mode-select tips (the game checks 1 to 8).
  - Salon trial ticket: one free hair/eye colour change for each player (on by default, as in the arcade).
  - Limited-time enemy: shows the one limited-time enemy the data has (episode 3).
  - Double stamps: two stamps per play.
  - Free star kira: star kira cards need no star powder.

Server-side rules (from the arcade as documented by the fan wiki and the official site)
  - Kira cards give +1 to 1-3 random stats.
  - Accessories vary per piece: stats 60-80% (N), 70-90% (R), 80-100% (SR) of the base, skills likewise.
  - One stamp per play; a full card of 10 gives one star powder. New players start with one powder
    and the first rival card ticket. The first key card comes with the Pink March Ribbon.
  - "New doll" unlocks once any doll reaches level 5.
  - All 8 letters from Nyandora give a wallpaper (which one is inferred from the data).
  - No questionnaires, and old campaign gift cards answer "expired". The game's own offline card
    (printed when setCardInfo fails) gives its apology gift and a stamp once.

Not done yet
  - No WebUI.

---

Changelog
  - 0.3.0: rules checked against the fan wiki and the official site: kira +1 to 1-3 stats, accessory
    variance per grade, each card keeps its printed coord, first-key ribbon, offline-card stamp,
    letter wallpaper, salon trial ticket.
  - 0.2.0: every response rebuilt from a full analysis of game.dll (starting equipment, doll seed range,
    key card binding, per-card kira, stamp card of 10, missions, closet rules for accessories, selling
    and discarding).
  - 0.1.0: first version.
