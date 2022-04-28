GITADORA Plugin for Asphyxia-Core
=================================
![Version: v1.2.0](https://img.shields.io/badge/version-v1.2.0-blue)

This plugin is based on converted from public-exported Asphyxia's Routes.

Supported Versions
==================
 - Matixx
 - Exchain
 - NEX+AGE


When Plugin Doesn't work correctly / Startup Error on Plugin
------------------------------------------------------------
The folder structure between v1.0 and v1.1 is quite different. Do not overwrite plugin folder.
<br>If you encounter errors, Please try these steps:

1. Remove `gitadora@asphyxia` folder.
2. Ctrl-C and Ctrl-V the newest version of `gitadora@asphyxia`
3. (Custom MDB Users) Reupload MDB or move `data/custom_mdb.xml` to `data/mdb/custom.xml`


Known Issues
============
 * Information dialog keep showing as plugin doesn't store item data currently.
 * Special Premium Encore on Nextage
   - Bandage solution is implemented. Try it.

Release Notes
=============

v1.2.0
----------------
* Fixed server error when saving profiles for two Guitar Freaks players at the end of a session. Fixes Github issue #39.
* Fixed another server error when two players are present, but only one player is using a profile.
* Added support for the "ranking" field. Gitadora will now correctly display your server ranking (based on Skill) on the post-game screen.
* "Recommended to friends" songs are now saved and loaded correctly. Since you don't have any friends, this won't be terribly useful, but it does at least provide an extra five slots for saving your favourite songs.
* Fixed "Recommended to friends" song list being incorrectly initialized to "I think about you".
* misc: Added logging for profile loading/saving when Asphyxia is running in dev mode.
* misc: Added more logging to mdb (song database) loading.
* misc: Removed some unneeded duplicate code.
* misc: Latest getPlayer() and savePlayers() API requests and responses are now saved to file when Asphyxia is in dev mode. Useful for debugging.

v1.1.1
----------------
 * fix: Error when create new profile on exchain.
 * fix: last song doesn't work correctly.
 * misc: Add logger for tracking problem.

v1.1.0
------
 * NEX+AGE Support (Not full support.)
 * Restructure bit for maintaining.
 
v1.0.0
------
 * Initial release for public