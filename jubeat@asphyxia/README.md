# Jubeat Plugin

Jubeat Plugin for Asphyxia Core

# Supported Versions

- prop
- Qubell (tested with L44:J:B:A:2017062001)
- clan (answered with Qubell's handlers, untested)
- Festo

Scores are shared by every version (a version only sees the songs and charts it has). The jubeat ID and name
are shared; each version keeps its own settings, items and progress.

# Versions

- V1.0.0 (2021/12/16)
    - Only support normal mode score saving.

- V2.0.0 (2022/08/14)
    - Now Support Festo Final
    - Support hard mode score saving
    - Support Turn Run

- V2.1.0 (2026/09/14)
    - Add jubeat Qubell support (profile, score list, save, shop info) via version-split handlers in `qubell/`
    - Older builds (model date < 2018090000) use the Qubell handlers; festo behaviour is unchanged

- V2.2.0 (2026/11/27)
    - Add jubeat prop support
        - Profile load/save in the prop layout (career, league class, jbox, items, navi, events)
        - Score list (`gametop.get_mdata`, split over its 3 requests) and score saving with ghosts
        - Course mode (`gametop.get_course`) with the Saucer Fulfill base courses and the 5th KAC prop courses
        - Weekly league (`gametop.get_league`): 3 songs per week, top 30% promoted and bottom 30% demoted, absent players demoted every 2 weeks
        - Daily FC challenge songs
    - One jubeat ID and name per card in every version
    - Scores are shared by every version; prop, Qubell and clan only see normal-mode charts of the songs they have
    - Qubell saves from V2.1.0 are moved over on the card's first login
    - clan has its own entry (still answered with Qubell's handlers) and keeps its own data
    - Hit charts list the most played songs on the server
    - Builds older than prop are now refused instead of being answered as Qubell
    - All secret songs are unlocked on prop and Qubell
    - The WebUI profile pages still only show festo data

# TODO

- [ ] Customized Turn Run. (Currently can't cuz Jubeat courses limit is 60, need someone to find how to patch it.)

# Credits

- Thanks [asesidaa](https://github.com/asesidaa?tab=repositories) for help!
- And also the other open-soured Jubeat lovers!
