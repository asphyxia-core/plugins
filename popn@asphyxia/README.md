# Pop'n Music

Plugin Version: **v2.0.0**

## Supported Versions
- pop'n music 19 Tune Street
- pop'n music 20 fantasia
- pop'n music Sunny Park
- pop'n music Lapistoria
- pop'n music éclale
- pop'n music Usagi to Neko to Shōnen no Yume
- pop'n music peace

## Changelog

### 2.0.0
* Big rewrite/reorganization of the code
* Add support for Tune Street, fantasia, Sunny Park, Lapistoria
* Add automatic convertion from plugin v1.x data to v2.x
* Enable/disable score sharing between versions
* Various fixes

#### 1.2.0
* You can change your profile name
* You can enable/disable the pop'n 25 event archive event
* Net Taisen disabled on 24/25 (code not implemented)

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

## Known limitations
* Tune Street : It will not report your profile name in-game
* Tune Street : No Town Mode
* No rival support implemented
* Some stats are not implemented (like daily stats, most played music)