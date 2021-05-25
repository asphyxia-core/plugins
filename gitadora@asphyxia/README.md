GITADORA Plugin for Asphyxia-Core
=================================
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

Note about newer version of Asphyxia Core
-----------------------------------------
Since newer version of Core separate the save db per each plugin, Seems there was an error after the migration process. till it's fixed on Core side, you maybe need backup the old save and start from zero.


Known Issues
============
 * Information dialog keep showing as plugin doesn't store item data currently.
 * Special Premium Encore on Nextage
   - Bandage solution is implemented. Try it.

Release Notes
=============
v1.1.0
------------
 * NEX+AGE Support (Not full support.)
 * Restructure bit for maintaining.
 
v1.0.0
------
 * Initial release for public