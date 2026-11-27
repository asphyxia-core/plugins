# Jubeat Plugin

Jubeat Plugin for Asphyxia Core

# Supported Versions

- Festo
- prop (model dates 2015022000 - 2016032999; profile, scores, course mode, league, shop info)
- Qubell (tested with L44:J:B:A:2017062001; prop and clan are routed to the same handlers but untested)

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
    - Add jubeat prop support via version-split handlers in `prop/`
        - Profile load/save in the prop layout (career, league class, jbox, items, navi, events)
        - Score list (`gametop.get_mdata`, split over its 3 requests) and score saving with ghosts
        - Course mode (`gametop.get_course`) with the Saucer Fulfill base courses and the 5th KAC prop courses
        - Weekly league (`gametop.get_league`): 3 songs per week, top 30% promoted and bottom 30% demoted, absent players demoted every 2 weeks
        - Daily FC challenge songs and a hit chart from local plays
    - prop data is stored in its own collections (`prop_profile`, `prop_score`, `prop_course`, `prop_league`); a card that already has a Qubell or festo profile gets a new prop profile with the same name
    - All secret songs are unlocked
    - The WebUI profile pages still only show festo data

# TODO

- [ ] Customized Turn Run. (Currently can't cuz Jubeat courses limit is 60, need someone to find how to patch it.)

# Credits

- Thanks [asesidaa](https://github.com/asesidaa?tab=repositories) for help!
- And also the other open-soured Jubeat lovers!
