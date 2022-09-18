# Pop'n Music

Plugin Version: **v3.0.0**

## Supported Versions
- pop'n music 19 Tune Street
- pop'n music 20 fantasia
- pop'n music Sunny Park
- pop'n music Lapistoria
- pop'n music éclale
- pop'n music Usagi to Neko to Shōnen no Yume
- pop'n music peace
- pop'n music Kaimei riddles

Important : require minimum Asphyxia Core **v1.31**

## Changelog

### 3.0.0
* Kaimei riddles: Support added
* Usaneko: Add Daily Missions support
* Usaneko/Peace/Kaimei: Remove game id check for Omnimix

### 2.2.3
* All: Send 0 if clear_type is not existing.

### 2.2.2
* Usaneko/Peace: Add Omnimix support (songs with id >= 3000).

### 2.2.1
* Tune Street: User customization is now saved
* Fix 1.x to 2.x conversion code when there are multiple profiles

### 2.2.0
* Tune Street: Add Town Mode + enable Net Taisen (only CPU will works)
* Some fixes

### 2.1.0
* Add rivals support (except for Tune Street)
* Some fixes

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
* No rival support for Tune Street
* Some stats are not implemented