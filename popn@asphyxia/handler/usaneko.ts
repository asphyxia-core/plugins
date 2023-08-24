import { AchievementsUsaneko } from "../models/achievements";
import { ExtraData, Params, Phase } from "../models/common";
import * as utils from "./utils";

export const setRoutes = () => {
    R.Route(`info24.common`, getInfo);
    R.Route(`player24.new`, newPlayer);
    R.Route(`player24.read`, read);
    R.Route(`player24.start`, start);
    R.Route(`player24.buy`, buy);
    R.Route(`player24.read_score`, readScore);
    R.Route(`player24.write_music`, writeScore);
    R.Route(`player24.write`, write);
    R.Route(`player24.friend`, friend);
}

/**
 * Return current state of the game (phase, good prices, etc...)
 */
const getInfoCommon = (req: EamuseInfo) => {
    const result: any = {
        phase: [],
        choco: [],
        goods: [],
        area: [],
    };

    // Phase
    const version = getVersion(req);
    const phaseData = getPhase(version);

    for (const phase of phaseData) {
        result.phase.push({
            event_id: K.ITEM('s16', phase.id),
            phase: K.ITEM('s16', phase.p),
        });
    }

    // Choco
    for (let i = 1; i <= 5; ++i) {
        result.choco.push({
            choco_id: K.ITEM('s16', i),
            param: K.ITEM('s32', -1),
        });
    }

    // Goods
    for (let i = 1; i <= 98; ++i) {
        let price = 200;
        if (i < 15) {
            price = 30;
        } else if (i < 30) {
            price = 40;
        } else if (i < 45) {
            price = 60;
        } else if (i < 60) {
            price = 80;
        }

        result.goods.push({
            item_id: K.ITEM('s32', i),
            item_type: K.ITEM('s16', 3),
            price: K.ITEM('s32', price),
            goods_type: K.ITEM('s16', 0),
        });
    }

    // Area
    for (let i = 1; i <= 16; ++i) {
        result.area.push({
            area_id: K.ITEM('s16', i),
            end_date: K.ITEM('u64', BigInt(0)),
            medal_id: K.ITEM('s16', i),
            is_limit: K.ITEM('bool', 0),
        });
    }

    // TODO : Course ranking
    // TODO : Most popular characters
    // TODO : Most popular music

    return result;
}

const getInfo = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    return send.object(getInfoCommon(req));
}

const start = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const result = {
        play_id: K.ITEM('s32', 1),
        ...getInfoCommon(req),
    };
    await send.object(result);
};

/**
 * Handler for new profile
 */
const newPlayer = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const name = $(data).str('name');

    send.object(await getProfile(refid, getVersion(req), name));
};

/**
 * Handler for existing profile
 */
const read = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    send.object(await getProfile(refid, getVersion(req)));
};

/**
 * Handler fo buying goods with lumina
 */
const buy = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const type = $(data).number('type', -1);
    const id = $(data).number('id', -1);
    const param = $(data).number('param', 0);
    const price = $(data).number('price', 0);
    const lumina = $(data).number('lumina', 0);

    if (type < 0 || id < 0) {
        return send.deny();
    }

    if (lumina >= price) {
        const version = getVersion(req);

        const params = await utils.readParams(refid, version);
        params.params.player_point = lumina - price;
        await utils.writeParams(refid, version, params);

        const achievements = <AchievementsUsaneko>await utils.readAchievements(refid, version, { ...defaultAchievements, version });
        achievements.items[`${type}:${id}`] = param;
        await utils.writeAchievements(refid, version, achievements);
    }
    send.success();
};

/**
 * Handler for getting the user scores
 */
const readScore = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    const version = getVersion(req);
    if (!refid) return send.deny();

    send.object({ music: await getScores(refid, version) });
};

/**
 * Read the user scores and format them (profile/friend)
 * @param refid ID of the user
 * @param forFriend If true, format the output for friend request.
 */
const getScores = async (refid: string, version: string, forFriend: boolean = false) => {
    const scoresData = await utils.readScores(refid, version);
    const result = [];

    for (const key in scoresData.scores) {
        const keyData = key.split(':');
        const score = scoresData.scores[key];
        const music = parseInt(keyData[0], 10);
        const sheet = parseInt(keyData[1], 10);
        const clearType = {
            100: 1,
            200: 2,
            300: 3,
            400: 4,
            500: 5,
            600: 6,
            700: 7,
            800: 8,
            900: 9,
            1000: 10,
            1100: 11,
        }[score.clear_type] || 0;

        if (!isOmni && (music > GAME_MAX_MUSIC_ID[version])) {
            continue;
        }
        if ([0, 1, 2, 3].indexOf(sheet) == -1) {
            continue;
        }

        if (forFriend) {
            result.push(K.ATTR({
                music_num: music.toString(),
                sheet_num: sheet.toString(),
                score: score.score.toString(),
                cleartype: clearType.toString(),
                clearrank: getRank(score.score).toString()
            }));
        } else {
            result.push({
                music_num: K.ITEM('s16', music),
                sheet_num: K.ITEM('u8', sheet),
                score: K.ITEM('s32', score.score),
                clear_type: K.ITEM('u8', clearType),
                clear_rank: K.ITEM('u8', getRank(score.score)),
                cnt: K.ITEM('s16', score.cnt),
            });
        }
    }

    return result;
};

/**
 * Return the rank based on the given score
 */
const getRank = (score: number): number => {
    if (score < 50000) {
        return 1
    } else if (score < 62000) {
        return 2
    } else if (score < 72000) {
        return 3
    } else if (score < 82000) {
        return 4
    } else if (score < 90000) {
        return 5
    } else if (score < 95000) {
        return 6
    } else if (score < 98000) {
        return 7
    }
    return 8
}

/**
 * Handler for saving the scores
 */
const writeScore = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const version = getVersion(req);
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const music = $(data).number('music_num');
    const sheet = $(data).number('sheet_num');
    const clear_type = {
        1: 100,
        2: 200,
        3: 300,
        4: 400,
        5: 500,
        6: 600,
        7: 700,
        8: 800,
        9: 900,
        10: 1000,
        11: 1100,
    }[$(data).number('clear_type')];
    const score = $(data).number('score');

    const key = `${music}:${sheet}`;

    const scoresData = await utils.readScores(refid, version, true);
    if (!scoresData.scores[key]) {
        scoresData.scores[key] = {
            score,
            cnt: 1,
            clear_type
        };
    } else {
        scoresData.scores[key] = {
            score: Math.max(score, scoresData.scores[key].score),
            cnt: scoresData.scores[key].cnt + 1,
            clear_type: Math.max(clear_type, scoresData.scores[key].clear_type || 0)
        };
    }

    utils.writeScores(refid, version, scoresData);

    send.success();
};

/**
 * Get/create the profile based on refid
 * @param refid the profile refid
 * @param name if defined, create/update the profile with the given name
 */
const getProfile = async (refid: string, version: string, name?: string) => {
    const profile = await utils.readProfile(refid);
    const rivals = await utils.readRivals(refid);

    if (name && name.length > 0) {
        profile.name = name;
        await utils.writeProfile(refid, profile);
    }

    let myBest = Array(10).fill(-1);
    const scores = await utils.readScores(refid, version, true);
    if (Object.entries(scores.scores).length > 0) {
        const playCount = new Map();
        for (const key in scores.scores) {
            const keyData = key.split(':');
            const music = parseInt(keyData[0], 10);
            playCount.set(music, (playCount.get(music) || 0) + scores.scores[key].cnt);
        }

        const sortedPlayCount = new Map([...playCount.entries()].sort((a, b) => b[1] - a[1]));
        let i = 0;
        for (const value of sortedPlayCount.keys()) {
            if (i >= 10) {
                break;
            }
            myBest[i] = value;
            i++;
        }
    }

    let player: any = {
        result: K.ITEM('s8', 0),
        account: {
            name: K.ITEM('str', profile.name),
            g_pm_id: K.ITEM('str', profile.friendId),
            staff: K.ITEM('s8', 0),
            item_type: K.ITEM('s16', 0),
            item_id: K.ITEM('s16', 0),
            is_conv: K.ITEM('s8', 0),
            license_data: K.ARRAY('s16', Array(20).fill(-1)),
            my_best: K.ARRAY('s16', myBest),
            active_fr_num: K.ITEM('u8', rivals.rivals.length),

            // TODO: replace with real data
            total_play_cnt: K.ITEM('s16', 100),
            today_play_cnt: K.ITEM('s16', 50),
            consecutive_days: K.ITEM('s16', 365),
            total_days: K.ITEM('s16', 366),
            interval_day: K.ITEM('s16', 1),
            latest_music: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
        },
        netvs: {
            record: K.ARRAY('s16', [0, 0, 0, 0, 0, 0]),
            dialog: [
                K.ITEM('str', 'dialog'),
                K.ITEM('str', 'dialog'),
                K.ITEM('str', 'dialog'),
                K.ITEM('str', 'dialog'),
                K.ITEM('str', 'dialog'),
                K.ITEM('str', 'dialog'),
            ],
            ojama_condition: K.ARRAY('s8', Array(74).fill(0)),
            set_ojama: K.ARRAY('s8', [0, 0, 0]),
            set_recommend: K.ARRAY('s8', [0, 0, 0]),
            netvs_play_cnt: K.ITEM('u32', 0),
        },
        eaappli: {
            relation: K.ITEM('s8', -1),
        },
        custom_cate: {
            valid: K.ITEM('s8', 0),
            lv_min: K.ITEM('s8', -1),
            lv_max: K.ITEM('s8', -1),
            medal_min: K.ITEM('s8', -1),
            medal_max: K.ITEM('s8', -1),
            friend_no: K.ITEM('s8', -1),
            score_flg: K.ITEM('s8', -1),
        },
        // TODO: Navi data ??
        navi_data: {
            raisePoint: K.ARRAY('s32', [-1, -1, -1, -1, -1]),
            navi_param: {
                navi_id: K.ITEM('u16', 0),
                friendship: K.ITEM('s32', 0),
            },
        },
        music: await getScores(refid, version),
        mission: [],
        area: [],
        course_data: [],
        fes: [],
        item: [],
        chara_param: [],
        stamp: [],
    };

    // Add version specific datas
    let params = await utils.readParams(refid, version);
    utils.addExtraData(player, params, EXTRA_DATA);

    const achievements = <AchievementsUsaneko>await utils.readAchievements(refid, version, { ...defaultAchievements, version });

    const profileCharas = achievements.charas || {};
    for (const chara_id in profileCharas) {
        player.chara_param.push({
            chara_id: K.ITEM('u16', parseInt(chara_id, 10)),
            friendship: K.ITEM('u16', profileCharas[chara_id]),
        });
    }

    let profileStamps = achievements.stamps;
    if (Object.entries(profileStamps).length == 0) {
        profileStamps = { "0": 0 };
    }
    for (const stamp_id in profileStamps) {
        player.stamp.push({
            stamp_id: K.ITEM('s16', parseInt(stamp_id, 10)),
            cnt: K.ITEM('s16', profileStamps[stamp_id]),
        });
    }

    const profileAreas = achievements.areas || {};
    for (const area_id in profileAreas) {
        const area = profileAreas[area_id];
        player.area.push({
            area_id: K.ITEM('u32', parseInt(area_id, 10)),
            chapter_index: K.ITEM('u8', area.chapter_index),
            gauge_point: K.ITEM('u16', area.gauge_point),
            is_cleared: K.ITEM('bool', area.is_cleared),
            diary: K.ITEM('u32', area.diary),
        });
    }

    const profileCourses = achievements.courses || {};
    for (const course_id in profileCourses) {
        const course = profileCourses[course_id];
        player.course_data.push({
            course_id: K.ITEM('s16', parseInt(course_id, 10)),
            clear_type: K.ITEM('u8', course.clear_type),
            clear_rank: K.ITEM('u8', course.clear_rank),
            total_score: K.ITEM('s32', course.total_score),
            update_count: K.ITEM('s32', course.update_count),
            sheet_num: K.ITEM('u8', course.sheet_num),
        });
    }

    const profileFes = achievements.fes || {};
    for (const fes_id in profileFes) {
        const fesElt = profileFes[fes_id];
        player.fes.push({
            fes_id: K.ITEM('u32', parseInt(fes_id, 10)),
            chapter_index: K.ITEM('u8', fesElt.chapter_index),
            gauge_point: K.ITEM('u16', fesElt.gauge_point),
            is_cleared: K.ITEM('bool', fesElt.is_cleared),
        });
    }

    const profileItems = achievements.items || {};
    for (const key in profileItems) {
        const keyData = key.split(':');
        const type = parseInt(keyData[0], 10);
        const id = parseInt(keyData[1], 10);

        player.item.push({
            type: K.ITEM('u8', type),
            id: K.ITEM('u16', id),
            param: K.ITEM('u16', profileItems[key]),
            is_new: K.ITEM('bool', 0),
            get_time: K.ITEM('u64', BigInt(0)),
        });
    }

    // Usaneko events
    if (version == 'v24') {        
        const date = new Date();
        const currentDate = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();

        if (!params.params.mission_date) {
            params.params.mission_date = currentDate;
        }

        // Daily missions
        const missions = achievements.missions || { 1: {}, 2: {}, 3: {} };
        let maxId = parseInt(_.max(Object.keys(missions)), 10);

        for (const id in missions) {
            const mission = missions[id];

            if (currentDate != params.params.mission_date) {
                // New day => Check completion
                if(mission.mission_comp == 1) {
                    // Mission completed => New mission
                    _.max(Object.keys(missions)) + 1
                    player.mission.push({
                        mission_id: K.ITEM('u32', ++maxId),
                        gauge_point: K.ITEM('u32', 0),
                        mission_comp: K.ITEM('u32', 0),
                    });
                } else {
                    // Mission not completed => Reset counter
                    player.mission.push({
                        mission_id: K.ITEM('u32', parseInt(id, 10)),
                        gauge_point: K.ITEM('u32', 0),
                        mission_comp: K.ITEM('u32', 0),
                    });
                }
            } else {
                player.mission.push({
                    mission_id: K.ITEM('u32', parseInt(id, 10)),
                    gauge_point: K.ITEM('u32', mission.gauge_point || 0),
                    mission_comp: K.ITEM('u32', mission.mission_comp || 0),
                });
            }
        }
    }

    // Kaimei events
    if (version == 'v26') {
        // Kaimei! MN tanteisha
        player.riddles_data = {
            sp_riddles: [],
            sh_riddles: []
        }
        player.riddles_data.sp_riddles = [];

        const riddles = achievements.riddles || {};

        let i = 0;
        while (riddles[i] != undefined) {
            const riddle = riddles[i];
            player.riddles_data.sp_riddles.push({
                kaimei_gauge: K.ITEM('u16', riddle.kaimei_gauge || 0),
                is_cleared: K.ITEM('bool', riddle.is_cleared || false),
                riddles_cleared: K.ITEM('bool', riddle.riddles_cleared || false),
                select_count: K.ITEM('u8', riddle.select_count || 0),
                other_count: K.ITEM('u32', riddle.other_count || 0),
            });
            i++;
        };

        // riddle id : 1 to 20
        let randomRiddles = [];
        for (let i = 0; i < 3; i++) {
            let riddle = 0;
            do {
                riddle = Math.floor(Math.random() * 20) + 1;
            } while (randomRiddles.indexOf(riddle) >= 0);

            player.riddles_data.sh_riddles.push({ sh_riddles_id: K.ITEM('u32', riddle) });
        }
    }

    return player;
}

/**
 * Handler for saving the profile
 */
const write = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const version = getVersion(req);

    const params = await utils.readParams(refid, version);
    const achievements = <AchievementsUsaneko>await utils.readAchievements(refid, version, { ...defaultAchievements, version });

    utils.getExtraData(data, params, EXTRA_DATA);

    // areas
    let areas = _.get(data, 'area', []);
    if (!achievements.areas) {
        achievements.areas = {};
    }

    if (!_.isArray(areas)) {
        areas = [areas];
    }

    for (const area of areas) {
        const id = $(area).number('area_id');
        const chapter_index = $(area).number('chapter_index');
        const gauge_point = $(area).number('gauge_point');
        const is_cleared = $(area).bool('is_cleared');
        const diary = $(area).number('diary');

        achievements.areas[id] = {
            chapter_index,
            gauge_point,
            is_cleared,
            diary,
        };
    }

    // courses
    let courses = _.get(data, 'course_data', []);
    if (!achievements.courses) {
        achievements.courses = {};
    }

    if (!_.isArray(courses)) {
        courses = [courses];
    }

    for (const course of courses) {
        const id = $(course).number('course_id');
        const clear_type = $(course).number('clear_type');
        const clear_rank = $(course).number('clear_rank');
        const total_score = $(course).number('total_score');
        const update_count = $(course).number('update_count');
        const sheet_num = $(course).number('sheet_num');

        achievements.courses[id] = {
            clear_type,
            clear_rank,
            total_score,
            update_count,
            sheet_num,
        };
    }

    // fes
    let fes = _.get(data, 'fes', []);
    if (!achievements.fes) {
        achievements.fes = {};
    }

    if (!_.isArray(fes)) {
        fes = [fes];
    }

    for (const fesElt of fes) {
        const id = $(fesElt).number('fes_id');
        const chapter_index = $(fesElt).number('chapter_index');
        const gauge_point = $(fesElt).number('gauge_point');
        const is_cleared = $(fesElt).bool('is_cleared');

        achievements.fes[id] = {
            chapter_index,
            gauge_point,
            is_cleared,
        };
    }

    // items
    let items = _.get(data, 'item', []);
    if (!achievements.items) {
        achievements.items = {};
    }

    if (!_.isArray(items)) {
        items = [items];
    }

    for (const item of items) {
        const type = $(item).number('type');
        const id = $(item).number('id');
        const param = $(item).number('param');

        const key = `${type}:${id}`;

        achievements.items[key] = param;
    }

    // charas
    let charas = _.get(data, 'chara_param', []);
    if (!achievements.charas) {
        achievements.charas = {};
    }

    if (!_.isArray(charas)) {
        charas = [charas];
    }

    for (const chara of charas) {
        const id = $(chara).number('chara_id');
        const param = $(chara).number('friendship');

        achievements.charas[id] = param;
    }

    // stamps
    let stamps = _.get(data, 'stamp', []);
    if (!achievements.stamps) {
        achievements.stamps = { '0': 0 };
    }

    if (!_.isArray(stamps)) {
        stamps = [stamps];
    }

    for (const stamp of stamps) {
        const id = $(stamp).number('stamp_id');
        const cnt = $(stamp).number('cnt');

        achievements.stamps[id] = cnt;
    }

    // usaneko (v24)
    if (version == 'v24') {
        // Daily missions
        const date = new Date();
        params.params.mission_date = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();

        let missions = _.get(data, 'mission', []);
        achievements.missions = {};

        if (!_.isArray(missions)) {
            missions = [missions];
        }

        for (const mission of missions) {
            const id = $(mission).number('mission_id');
            const gauge_point = $(mission).number('gauge_point');
            const mission_comp = $(mission).number('mission_comp');

            achievements.missions[id] = {
                gauge_point,
                mission_comp,
            };
        }
    }

    // riddles (v26)
    if (version == 'v26') {
        const playedRiddle = <number>params.params.sp_riddles_id;
        let riddlesData = _.get(data, 'riddles_data', []);
        let riddles = _.get(riddlesData, 'sp_riddles', []);
        if (!achievements.riddles) {
            achievements.riddles = {};
        }

        if (!_.isArray(riddles)) {
            riddles = [riddles];
        }

        let i = 0;
        for (const riddle of riddles) {
            const kaimei_gauge = $(riddle).number('kaimei_gauge', 0);
            const is_cleared = $(riddle).bool('is_cleared');
            const riddles_cleared = $(riddle).bool('riddles_cleared');
            let select_count = $(riddle).number('select_count', 0);
            const other_count = $(riddle).number('other_count', 0);

            if (riddles_cleared || select_count >= 3) {
                // Show all hint if riddle cleared.
                select_count = 3
            } else if (playedRiddle == i) {
                // Add a hint if riddle is select. 
                select_count++;
            }

            achievements.riddles[i] = {
                kaimei_gauge,
                is_cleared,
                riddles_cleared,
                select_count,
                other_count,
            };
            i++;
        }
    }

    await utils.writeParams(refid, version, params);
    await utils.writeAchievements(refid, version, achievements);

    send.success();
};

/**
 * Handler for sending rivals
 */
const friend = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    const no = parseInt($(data).attr()['no'], 10);
    const version = getVersion(req);

    const rivals = await utils.readRivals(refid);

    if (no < 0 || no >= rivals.rivals.length) {
        send.object({ result: K.ITEM('s8', 2) });
        return;
    }

    const profile = await utils.readProfile(rivals.rivals[no]);
    const params = await utils.readParams(rivals.rivals[no], version);

    const friend = {
        friend: {
            no: K.ITEM('s16', no),
            g_pm_id: K.ITEM('str', profile.friendId),
            name: K.ITEM('str', profile.name),
            chara: K.ITEM('s16', params.params.chara || -1),
            is_open: K.ITEM('s8', 1),
            music: await getScores(rivals.rivals[no], version, true),
        }
    }

    send.object(friend);
}

const getPhase = (version: String): Phase[] => {
    let phase = [];
    switch(version) {
        case 'v26':
            phase = PHASE['v26'];
        case 'v25':
            phase = _.unionBy(phase, PHASE['v25'], 'id');
        case 'v24':
            phase = _.unionBy(phase, PHASE['v24'], 'id');
    }
    return _.sortBy(phase, 'id');
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let isOmni = false;

const getVersion = (req: EamuseInfo): string => {
    if (req.model.indexOf('J:A:X') >= 0 || req.model.indexOf('J:B:X') >= 0 || req.model.indexOf('J:C:X') >= 0) {
        isOmni = true;
    }

    const date: number = parseInt(req.model.match(/:(\d*)$/)[1]);
    if (date > 2020120900) {
        return 'v26';
    } else if (date >= 2018101700 && date <= 2020120900) {
        return 'v25';
    } else {
        return 'v24';
    }
}

const GAME_MAX_MUSIC_ID = {
    v24: 1704,
    v25: 1877,
    v26: 2019
}

const defaultAchievements: AchievementsUsaneko = {
    collection: 'achievements',
    version: null,
    areas: {},
    courses: {},
    fes: {},
    items: {},
    charas: {},
    stamps: {},
    riddles: {},
    missions: {},
}

const PHASE = {
    v24: [
        { id: 0, p: 11 }, // Default song phase availability (0-11)
        { id: 1, p: 2 },
        { id: 2, p: 2 },
        { id: 3, p: 4 },
        { id: 4, p: 1 },
        { id: 5, p: 0 }, // Enable Net Taisen (0-1)
        { id: 6, p: 1 }, // Enable NAVI-kun shunkyoku toujou, allows song 1608 to be unlocked (0-1)
        { id: 7, p: 1 },
        { id: 8, p: 2 },
        { id: 9, p: 2 }, // Daily Mission (0-2)
        { id: 10, p: 15 }, // NAVI-kun Song phase availability (0-15)
        { id: 11, p: 1 },
        { id: 12, p: 2 },
        { id: 13, p: 1 }, // Enable Pop'n Peace preview song (0-1)
    ],
    v25: [
        { id: 0, p: 23 },
        { id: 1, p: 4 },
        { id: 10, p: 30 },
        // New params
        { id: 14, p: 39 },
        { id: 15, p: 2 },
        { id: 16, p: 3 },
        { id: 17, p: 8 },
        { id: 18, p: 1 },
        { id: 19, p: 1 },
        { id: 20, p: 13 },
        { id: 21, p: 20 }, // pop'n event archive
        { id: 22, p: 2 },
        { id: 23, p: 1 },
        { id: 24, p: 1 },
    ],
    v26: [
        // Music phase
        // Phase 24: Seize The Day, 知りたい
        // Phase 25: Triple Cross
        // Phase 26: GO²TOS, Jailbreaker
        // Phase 27: Aftermath
        // Phase 28: 「Sweet Love」
        // Phase 29: GET WILD (UPPER), シュガーソングとビターステップ (UPPER)
        // Phase 30 (MAX): 群像夏
        { id: 0, p: 30 },
        // New params
        { id: 25, p: 62 }, // M&N event (0: disable, 62: all characters)
        { id: 26, p: 3 }, // Unknown event (0-3)
        { id: 27, p: 2 }, // peace soundtrack hatsubai kinen SP (0: not started, 1: enabled, 2: ended)
        { id: 28, p: 2 }, // MZD no kimagure tanteisha joshu (0: not started, 1: enabled, 2: ended)
        { id: 29, p: 5 }, // Shutchou! pop'n quest Lively (0: not started, 1-4: step enabled, 5: ended)
        { id: 30, p: 6 }, // Shutchou! pop'n quest Lively II (0: not started, 1-5: step enabled, 6: ended)
    ]
}

const EXTRA_DATA: ExtraData = {

    play_id: { type: 's32', path: 'account', default: 0 },
    start_type: { type: 's8', path: 'account', default: 0 },
    tutorial: { type: 's16', path: 'account', default: -1 },
    area_id: { type: 's16', path: 'account', default: 51 },
    read_news: { type: 's16', path: 'account', default: 0 },
    nice: { type: 's16', path: 'account', default: Array(30).fill(-1), isArray: true },
    favorite_chara: { type: 's16', path: 'account', default: Array(20).fill(-1), isArray: true },
    special_area: { type: 's16', path: 'account', default: Array(8).fill(-1), isArray: true },
    chocolate_charalist: { type: 's16', path: 'account', default: Array(5).fill(-1), isArray: true },
    chocolate_sp_chara: { type: 's32', path: 'account', default: 0 },
    chocolate_pass_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_hon_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_giri_cnt: { type: 's32', path: 'account', default: 0 },
    chocolate_kokyu_cnt: { type: 's32', path: 'account', default: 0 },
    teacher_setting: { type: 's16', path: 'account', default: Array(10).fill(-1), isArray: true },
    welcom_pack: { type: 'bool', path: 'account', default: 0 },
    use_navi: { type: 's16', path: 'account', default: 0 },
    ranking_node: { type: 's32', path: 'account', default: 0 },
    chara_ranking_kind_id: { type: 's32', path: 'account', default: 0 },
    navi_evolution_flg: { type: 's8', path: 'account', default: 0 },
    ranking_news_last_no: { type: 's32', path: 'account', default: 0 },
    power_point: { type: 's32', path: 'account', default: 0 },
    player_point: { type: 's32', path: 'account', default: 300 },
    power_point_list: { type: 's32', path: 'account', default: [0], isArray: true },

    //v26
    card_again_count: { type: 's16', path: 'account', default: 0 },
    sp_riddles_id: { type: 's16', path: 'account', default: -1 },
    point: { type: 'u32', path: 'event2021', default: 0 }, // for peace soundtrack hatsubai kinen SP
    step: { type: 'u8', path: 'event2021', default: 0 }, // for Shutchou! pop'n quest Lively
    quest_point: { type: 'u32', path: 'event2021', default: Array(8).fill(0), isArray: true }, // for Shutchou! pop'n quest Lively
    step_nos: { type: 'u8', path: 'event2021', default: 0 }, // for Shutchou! pop'n quest Lively II
    quest_point_nos: { type: 'u32', path: 'event2021', default: Array(13).fill(0), isArray: true }, // for Shutchou! pop'n quest Lively II

    mode: { type: 'u8', path: 'config', default: 0 },
    chara: { type: 's16', path: 'config', default: 0 },
    music: { type: 's16', path: 'config', default: 0 },
    sheet: { type: 'u8', path: 'config', default: 0 },
    category: { type: 's8', path: 'config', default: 0 },
    sub_category: { type: 's8', path: 'config', default: 0 },
    chara_category: { type: 's8', path: 'config', default: 0 },
    ms_banner_disp: { type: 's8', path: 'config', default: 0 },
    ms_down_info: { type: 's8', path: 'config', default: 0 },
    ms_side_info: { type: 's8', path: 'config', default: 0 },
    ms_raise_type: { type: 's8', path: 'config', default: 0 },
    ms_rnd_type: { type: 's8', path: 'config', default: 0 },
    banner_sort: { type: 's8', path: 'config', default: 0 },
    course_id: { type: 's16', path: 'config', default: 0 },
    course_folder: { type: 's8', path: 'config', default: 0 },

    hispeed: { type: 's16', path: 'option', default: 10 },
    popkun: { type: 'u8', path: 'option', default: 0 },
    hidden: { type: 'bool', path: 'option', default: 0 },
    hidden_rate: { type: 's16', path: 'option', default: -1 },
    sudden: { type: 'bool', path: 'option', default: 0 },
    sudden_rate: { type: 's16', path: 'option', default: -1 },
    randmir: { type: 's8', path: 'option', default: 0 },
    gauge_type: { type: 's8', path: 'option', default: 0 },
    ojama_0: { type: 'u8', path: 'option', default: 0 },
    ojama_1: { type: 'u8', path: 'option', default: 0 },
    forever_0: { type: 'bool', path: 'option', default: 0 },
    forever_1: { type: 'bool', path: 'option', default: 0 },
    full_setting: { type: 'bool', path: 'option', default: 0 },
    guide_se: { type: 's8', path: 'option', default: 0 },
    judge: { type: 'u8', path: 'option', default: 0 },

    ep: { type: 'u16', path: 'info', default: 0 },

    effect_left: { type: 'u16', path: 'customize', default: 0 },
    effect_center: { type: 'u16', path: 'customize', default: 0 },
    effect_right: { type: 'u16', path: 'customize', default: 0 },
    hukidashi: { type: 'u16', path: 'customize', default: 0 },
    comment_1: { type: 'u16', path: 'customize', default: 0 },
    comment_2: { type: 'u16', path: 'customize', default: 0 },
}
