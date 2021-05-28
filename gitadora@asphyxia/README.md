GITADORA Plugin for Asphyxia-Core
=================================
![Version: v1.1.1](https://img.shields.io/badge/version-v1.1.1-blue)

This plugin is based on converted from public-exported Asphyxia's Routes.

Supported Versions
==================
 - Matixx
 - Exchain
 - NEX+AGE


When Plugin Doesn't work correctly / Startup Error on Plugin
------------------------------------------------------------
The folder structure between v1.0 and v1.1 is quite different. Do not overwrite plugin folder.
<br>If encounter error, Please try these step:

1. Remove `gitadora@asphyxia` folder.
2. C-C and C-V the newest version of `gitadora@asphyxia`
3. (Custom MDB Users) Reupload MDB or move `data/custom_mdb.xml` to `data/mdb/custom.xml`


Known Issues
============
 * Information dialog keep showing as plugin doesn't store item data currently.
 * Special Premium Encore on Nextage
   - Bandage solution is implemented. Try it.

Release Notes
=============
v1.1.1 (Current)
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