# Pop'n Music

Plugin Version: **v1.1.1**

## Supported Versions
- pop'n music 23 Eclale
- pop'n music 24 Usagi to Neko to Shōnen no Yume
- pop'n music 25 peace

## Changelog
#### 1.1.1
Fix when updating player song rank and medal the new result always overwrite the old record, even the record result is better.

#### 1.1.0
Update phase data : All versions are on latest phase.

#### 1.0.0
Initial Release.

## How to import data from non-core Asphyxia
To import data, you have to :
* Create your popn profile in Asphyxia-core. You just have to insert your card in the game and follow the process until coming to the select mode select screen. Once here, quit the game.
* Create a backup of your savedata.db file (in case something goes wrong).
* In the web UI of Asphyxia, go to POPN -> Profile and click detail on your profile
* Put the content of your non-core asphyxia popn music files in the text fields (pop.json and popn_scores.json) and click Import.
* Data is imported. Run the game, insert your card and your scores are available.
