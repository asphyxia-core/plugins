# beatmaniaIIDX

Plugin Version: **v0.1.18a**

---

Supported Versions
  - beatmaniaIIDX 9th Style (JAH)
  - beatmaniaIIDX 10th Style (JAE)
  - beatmaniaIIDX 11 IIDXRED (JAB)
  - beatmaniaIIDX 12 HAPPY SKY (JAC)
  - beatmaniaIIDX 13 DistorteD (JAC)
  - beatmaniaIIDX 14 GOLD (2007072301)
  - beatmaniaIIDX 15 DJ TROOPERS (2008031100)
  - beatmaniaIIDX 16 EMPRESS (2009072200)
  - beatmaniaIIDX 17 SIRIUS (2010071200)
  - beatmaniaIIDX 18 Resort Anthem (2011071200)
  - beatmaniaIIDX 19 Lincle (2012090300)
  - beatmaniaIIDX 20 tricoro (2013090900)
  - beatmaniaIIDX 21 SPADA (2014071600)
  - beatmaniaIIDX 22 PENDUAL (2015080500)
  - beatmaniaIIDX 23 copula (2016083100)
  - beatmaniaIIDX 24 SINOBUZ (2017082800)
  - beatmaniaIIDX 25 CANNON BALLERS (2018091900)
  - beatmaniaIIDX 26 Rootage (2019090200)
  - beatmaniaIIDX 27 HEROIC VERSE (2020092900)
  - beatmaniaIIDX 28 BISTROVER (2021091500)
  - beatmaniaIIDX 29 CastHour (2022082400)
  - beatmaniaIIDX 30 RESIDENT (2023090500)
  - beatmaniaIIDX 31 EPOLIS (2024082600)
  - beatmaniaIIDX 32 Pinky Crush (2025082500)
  - beatmaniaIIDX 33 Sparkle Shower (2026081900)

---

Features
  - STEP UP (Partial)
  - SKILL ANALYZER
  - EVENT (Partial)
  - ARENA (LOCAL only)
  - RANDOME LANE TICKET
  - FAVORITE/SONG SELECTION NOTES
  - ORIGINAL FILTER

---

Known Issues
  - Clear Lamps may display invalid lamps due to missing conversion code
  - DJ LEVEL folders are broken before EMPRESS due to missing rank\_id
  - LEGGENDARIA play records before HEROIC VERSE may not display on higher version due to missing conversion code
  - SUPER FUTURE 2323 play records doesn't display on other version due to missing conversion code
  - ONE MORE EXTRA STAGE progress won't save (can't test this due to skill issue)
  - DOUBLE PLAY or two persons play may not work properly (can't test this due to skill issue)
  - New card cannot be registered before DistorteD (this is due to those games uses magnetic card)
  - Some of licensed songs are locked behind (kinda solved with music\_open but needs to be verified)
  - Some of badges aren't saving in RESIDENT and above (needs to figure out name to id)
  - Some of records may have invalid MISS COUNT

---

Changelogs

**v0.1.0**
  - Added Initial support for Lincle

**v0.1.1**
  - Added Initial support for HEROIC VERSE
  - Expanded score array to adapting newer difficulty (SPN ~ DPA [6] -> SPB ~ DPL [10])
    - This borked previous score datas recorded with v0.1.0
    - All score data now shared with all version
      - as it doesn't have music\_id conversion, it will display incorrect data on certain versions
  - Added Initial customize support (no webui)

**v0.1.2**
  - Added Initial support for BISTROVER
  - Added Initial Rival support (partial webui)

**v0.1.3**
  - Added Initial support for CastHour

**v0.1.4**
  - Added Initial support for RESIDENT

**v0.1.5**
  - Added Initial support for Resort Anthem
    -  LEAGUE, STORY does not work yet
  - Fixed where s\_hispeed/d\_hispeed doesn't save correctly
 
**v0.1.6**
  - Added Initial support for tricoro
    - Some of event savings are broken
  - Added movie\_upload url setting on plugin setting (BISTROVER ~)
    - This uses JSON instead of XML and this requires additional setup (can't test or implement this as I don't own NVIDIA GPU)

**v0.1.7**
  - Added Initial support for SPADA
    - Some of event savings are broken
  - Fixed where rtype didn't save correctly (BISTROVER ~)

**v0.1.8**
  - Added RIVAL pacemaker support
  - Added Initial support for PENDUAL
    - Some of event savings are broken
  - Fixed where old\_linkage\_secret\_flg is missing on pc.get response (RESIDENT)
  - Fixed where game could crash due to invalid rival qprodata
  - Fixed where lift isn't saving (SPADA)

**v0.1.9**
  - Added Initial support for copula
    - Some of event savings are broken
  - Added shop.getconvention/shop.setconvention/shop.getname/shop.savename response

**v0.1.10**
  - Added Initial support for SINOBUZ ~ Rootage
    - Converted from asphyxia\_route\_public

**v0.1.11**
  - Added Shop Ranking support
  - Changed pc.common/gameSystem.systemInfo response not to use pugFile
    - IIDX\_CPUS on models/arena.ts came from asphyxia\_route\_public

**v0.1.12**
  - Exposed some of pc.common attributes to plugin settings (WIP)
  - Added Experimental WebUI (WIP)
  - Added music.crate/music.breg response
    - CLEAR RATE and BEGINNER clear lamp may not work on certain versions
  - Added Initial support for SIRIUS
  - Fixed where Venue Top didn't save correctly (BISTROVER ~)
  - Fixed where music.appoint send empty response even rival has score data but player doesn't have score data
  - Fixed where FAVORITE may work only on specific version
  - Fixed where shop name always displayed as "CORE" instead of saved one
  - Fixed where rlist STEP UP achieve value was fixed value instead of saved one
  - Fixed where fcombo isn't saving (Resort Anthem)
  - Removed shop.savename as not working as intented

**v0.1.13**
  - Added Initial support for DJ TROOPERS
  - Added Initial support for EMPRESS
  - Fixed where EXPERT result does not display total cleared users and ranking position

**v0.1.14**
  - Added Experimental OMEGA-Attack event saving support on tricoro
  - Reworked on SINOBUZ ~ Rootage responses
  - Fixed where Base64toBuffer returns invalid value sometimes
  - Fixed where timing display option isn't saving on certain versions

**v0.1.15**
  - Added Initial support for GOLD
  - Added Disable Beginner Option
  - Added Experimental Badge saving support
  - Added Experimental score import/export
  - Fixed where plugin may fail to register due to missing types in dev mode (invalid setup for dev, just enough to get around)
  - Fixed where unable to login after first-play (SPADA, SINOBUZ, Rootage)
  - Fixed where pacemaker isn't working as intended due to malformed ghost data on music.appoint response (~ DJ TROOPERS)
  - Fixed where pacemaker isn't working as intented due to wrong condition check (HEROIC VERSE ~)
  - Fixed where pacemaker sub-type isn't load correctly (HEROIC VERSE ~)
  - Fixed where QPRO data doesn't get saved in WebUI

**v0.1.16**
  - Added Initial support for EPOLIS
  - Added music\_open on gameSystem.systemInfo response
  - Added EXTRA FAVORITE support
  - Fixed where lightning settings doesn't get saved on logout
  - Fixed where Disable Music Preview, Disable HCN Color, VEFX Lock settings doesn't reflect
  - Fixed where MISS COUNT has 0 as default (including score import)
  - Fixed where MISS COUNT doesn't get updated when exscore is same
  - Fixed where lightning model settings saved incorrectly
  - Fixed where unable to import score if user has DP scores
  - Fixed where unable to achieve dan if you failed once
  - Fixed where unable to login (tricoro, CastHour, Rootage)
  - Fixed where unable to specify rival in WebUI
  - Fixed where music.arenaCPU isn't working as intended due to change of type (EPOLIS ~)
  - Fixed where qpro head equip request handle as hand equip (@anzuwork)
  - Added error message for invalid score database entries
  - Reverted `v0.1.15` dev mode related code changes (now requires proper dev setup, refer parent README.md)
  - WebUI is now display values of corresponding version

**v0.1.17**
  - Added Initial support for Pinky Crush
  - Fixed where note\_size, lift\_cover, note\_beam\_size doesn't get saved in WebUI (EPOLIS ~)
  - Fixed STEP UP related issues
    - Unable to use STEP UP ticket
    - HARD / EX HARD folder display low level charts regardless player skill
  - Fixed HEROIC VERSE issues
    - Unable to complete registration 
    - Crash after Event room choose
  - Fixed where unable to complete registration or login (tricoro)

**v0.1.18**
  - Added Initial support for Sparkle Shower
  - Added Initial support for DistorteD, HAPPY SKY, IIDXRED, 10th Style, 9th Style
    - Requires updated version of asphyxia-core otherwise plugin won't register [v1.70b]
    - Migration from (previous version) menu will not work
      - Existing card with no current version user data will treat as new card on registration but it will use existing profile data
    - New card cannot be registered (~ HAPPY SKY)
      - Need to invoke new card registration to core.
    - 9th Style will use seperate user data database as its using raw blob
  - Added ALL/STORE/RIVAL TOP pacemaker support
  - Added basic save support of STORY mode (Resort Anthem)
  - Fixed where tricoro does not work after Asphyxia Core update
  - Fixed where unable to login after playing a while on old versions
  - Improved WebUI customization settings with descriptive dropdown menus (@COLV9)
  - Improved WebUI score viewer with song title mapping, detailed difficulty breakdown and sorting (@COLV9)

**v0.1.18a**
  - Fixed where unable to login (9th Style)
  - Fixed where CYBER LOADER event data get saved incorrectly (Sparkle Shower)
  - Fixed where Entry background brightness option doesn't get saved (Sparkle Shower)
  - Fixed where classic\_hispeed option doesn't get saved on WebUI
