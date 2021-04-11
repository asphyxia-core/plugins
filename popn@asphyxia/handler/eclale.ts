import { AchievementsEclale } from "../models/achievements";
import { ExtraData, Params, Phase } from "../models/common";
import * as utils from "./utils";

export const setRoutes = () => {
    R.Route(`info23.common`, getInfo);
    R.Route(`player23.new`, newPlayer);
    R.Route(`player23.read`, read);
    R.Route(`player23.start`, start);
    R.Route(`player23.buy`, buy);
    R.Route(`player23.read_score`, readScore);
    R.Route(`player23.write_music`, writeScore);
    R.Route(`player23.write`, write);
}

const getInfoCommon = (req: EamuseInfo) => {
    const result: any = {
        phase: [],
        area: [],
        goods: [],
    };

    // Phase
    for (const elt of phase) {
        result.phase.push({
            event_id: K.ITEM('s16', elt.id),
            phase: K.ITEM('s16', elt.p),
        });
    }

    // Area
    for (let i = 1; i <= 100; ++i) {
        result.area.push({
            area_id: K.ITEM('s16', i),
            end_date: K.ITEM('u64', BigInt(0)),
            medal_id: K.ITEM('s16', i),
            is_limit: K.ITEM('bool', 0),
        });
    }

    // Goods
    for (let i = 1; i <= 420; ++i) {
        let price = 150;

        if (i <= 80) {
            price = 60;
        } else if (i <= 120) {
            price = 250;
        } else if (i <= 142) {
            price = 500;
        } else if (i <= 300) {
            price = 100;
        }

        result.goods.push({
            goods_id: K.ITEM('s16', i),
            price: K.ITEM('s32', price),
            goods_type: K.ITEM('s16', 0),
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
 * Create a new profile and send it.
 */
const newPlayer = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const name = $(data).str('name');

    send.object(await getProfile(refid, name));
};

/**
 * Read a profile and send it.
 */
const read = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    send.object(await getProfile(refid));
};

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
        const params = await utils.readParams(refid, version);
        params.params.player_point = lumina - price;
        await utils.writeParams(refid, version, params);

        const achievements = <AchievementsEclale>await utils.readAchievements(refid, version, defaultAchievements);
        achievements.items[`${type}:${id}`] = param;
        await utils.writeAchievements(refid, version, achievements);
    }
    send.success();
};

const readScore = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const scoresData = await utils.readScores(refid, version);
    const result: any = {
        music: [],
    };

    for (const key in scoresData.scores) {
        const keyData = key.split(':');
        const score = scoresData.scores[key];
        const music = parseInt(keyData[0], 10);
        const sheet = parseInt(keyData[1], 10);

        if (music > GAME_MAX_MUSIC_ID) {
            continue;
        }
        if ([0, 1, 2, 3].indexOf(sheet) == -1) {
            continue;
        }

        result.music.push({
            music_num: K.ITEM('s16', music),
            sheet_num: K.ITEM('u8', sheet),
            score: K.ITEM('s32', score.score),
            clear_type: K.ITEM('u8', {
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
            }[score.clear_type]),
            cnt: K.ITEM('s16', score.cnt),
        });
    }

    send.object(result);
};

const writeScore = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
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
    }[$(data).number('clearmedal')];
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
 * @returns 
 */
const getProfile = async (refid: string, name?: string) => {
    const profile = await utils.readProfile(refid);

    if (name && name.length > 0) {
        profile.name = name;
        await utils.writeProfile(refid, profile);
    }

    let myBest = Array(10).fill(-1);
    const scores = await utils.readScores(refid, version, true);
    if(Object.entries(scores.scores).length > 0) {
        const playCount = new Map();
        for(const key in scores.scores) {
            const keyData = key.split(':');
            const music = parseInt(keyData[0], 10);
            playCount.set(music, (playCount.get(music) || 0) + scores.scores[key].cnt);
        }

        const sortedPlayCount = new Map([...playCount.entries()].sort((a, b) => b[1] - a[1]));
        let i = 0;
        for (const value of sortedPlayCount.keys()) {
            if(i >= 10) {
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
            g_pm_id: K.ITEM('str', 'ASPHYXIAPLAY'),
            staff: K.ITEM('s8', 0),
            item_type: K.ITEM('s16', 0),
            item_id: K.ITEM('s16', 0),
            is_conv: K.ITEM('s8', 0),
            meteor_flg: K.ITEM('bool', true),
            license_data: K.ARRAY('s16', Array(20).fill(-1)),

            // TODO: replace with real data
            total_play_cnt: K.ITEM('s16', 100),
            today_play_cnt: K.ITEM('s16', 50),
            consecutive_days: K.ITEM('s16', 365),
            total_days: K.ITEM('s16', 366),
            interval_day: K.ITEM('s16', 1),
            my_best: K.ARRAY('s16', myBest),
            latest_music: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
            active_fr_num: K.ITEM('u8', 0),
        },
        netvs: {
            record: K.ARRAY('s16', [0, 0, 0, 0, 0, 0]),
            dialog: [
                K.ITEM('str', 'dialog#0'),
                K.ITEM('str', 'dialog#1'),
                K.ITEM('str', 'dialog#2'),
                K.ITEM('str', 'dialog#3'),
                K.ITEM('str', 'dialog#4'),
                K.ITEM('str', 'dialog#5'),
            ],
            ojama_condition: K.ARRAY('s8', Array(74).fill(0)),
            set_ojama: K.ARRAY('s8', [0, 0, 0]),
            set_recommend: K.ARRAY('s8', [0, 0, 0]),
            netvs_play_cnt: K.ITEM('u32', 0),
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

        item: [],
        chara_param: [],
        medal: [],
    };

    const achievements = <AchievementsEclale>await utils.readAchievements(refid, version, defaultAchievements);

    const profileCharas = achievements.charas || {};
    for (const chara_id in profileCharas) {
        player.chara_param.push({
            chara_id: K.ITEM('u16', parseInt(chara_id, 10)),
            friendship: K.ITEM('u16', profileCharas[chara_id]),
        });
    }

    const profileMedals = achievements.medals || {};
    for (const medal_id in profileMedals) {
        const medal = profileMedals[medal_id];
        player.medal.push({
            medal_id: K.ITEM('s16', parseInt(medal_id, 10)),
            level: K.ITEM('s16', medal.level),
            exp: K.ITEM('s32', medal.exp),
            set_count: K.ITEM('s32', medal.set_count),
            get_count: K.ITEM('s32', medal.get_count),
        });
    }

    const profileItems = achievements.items || {};
    for (const key in profileItems) {
        const keyData = key.split(':');
        const type = parseInt(keyData[0], 10);
        const id = parseInt(keyData[1], 10);

        const item: any = {
            type: K.ITEM('u8', type),
            id: K.ITEM('u16', id),
            param: K.ITEM('u16', profileItems[key]),
            is_new: K.ITEM('bool', 0),
        };

        player.item.push(item);
    }

    // Add version specific datas
    const params = await utils.readParams(refid, version);
    utils.addExtraData(player, params, extraData);

    return player;
}

const write = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).str('ref_id');
    if (!refid) return send.deny();

    const params = await utils.readParams(refid, version);
    const achievements = <AchievementsEclale>await utils.readAchievements(refid, version, defaultAchievements);

    utils.getExtraData(data, params, extraData);

    // medals
    let medals = _.get(data, 'medal', []);
    if (!achievements.medals) {
        achievements.medals = {};
    }

    if (!_.isArray(medals)) {
        medals = [medals];
    }

    for (const medal of medals) {
        const id = $(medal).number('medal_id');
        const level = $(medal).number('level');
        const exp = $(medal).number('exp');
        const set_count = $(medal).number('set_count');
        const get_count = $(medal).number('get_count');

        achievements.medals[id] = {
            level,
            exp,
            set_count,
            get_count,
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

    await utils.writeParams(refid, version, params);
    await utils.writeAchievements(refid, version, achievements);

    send.success();
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const version: string = 'v23';
const GAME_MAX_MUSIC_ID = 1550;

const defaultAchievements: AchievementsEclale = {
    collection: 'achievements',
    version: 'v23',
    medals: {},
    items: {},
    charas: {},
}

const phase: Phase[] = [
    { id: 0, p: 16 },
    { id: 1, p: 3 },
    { id: 2, p: 1 },
    { id: 3, p: 2 },
    { id: 4, p: 1 },
    { id: 5, p: 2 },
    { id: 6, p: 1 },
    { id: 7, p: 4 },
    { id: 8, p: 3 },
    { id: 9, p: 4 },
    { id: 10, p: 4 },
    { id: 11, p: 1 },
    { id: 12, p: 1 },
    { id: 13, p: 4 },
];
const extraData: ExtraData = {
    tutorial: { type: 's8', path: 'account', default: 0 },
    area_id: { type: 's16', path: 'account', default: 0 },
    lumina: { type: 's16', path: 'account', default: 300 },
    read_news: { type: 's16', path: 'account', default: 0 },
    welcom_pack: { type: 'bool', path: 'account', default: 1 },
    medal_set: { type: 's16', path: 'account', default: Array(4).fill(0), isArray: true },
    nice: { type: 's16', path: 'account', default: Array(30).fill(-1), isArray: true },
    favorite_chara: { type: 's16', path: 'account', default: Array(20).fill(-1), isArray: true },
    special_area: { type: 's16', path: 'account', default: Array(8).fill(0), isArray: true },
    chocolate_charalist: { type: 's16', path: 'account', default: Array(5).fill(-1), isArray: true },
    teacher_setting: { type: 's16', path: 'account', default: Array(10).fill(0), isArray: true },

    hispeed: { type: 's16', path: 'option', default: 0 },
    popkun: { type: 'u8', path: 'option', default: 0 },
    hidden: { type: 'bool', path: 'option', default: 0 },
    hidden_rate: { type: 's16', path: 'option', default: 0 },
    sudden: { type: 'bool', path: 'option', default: 0 },
    sudden_rate: { type: 's16', path: 'option', default: 0 },
    randmir: { type: 's8', path: 'option', default: 0 },
    gauge_type: { type: 's8', path: 'option', default: 0 },
    ojama_0: { type: 'u8', path: 'option', default: 0 },
    ojama_1: { type: 'u8', path: 'option', default: 0 },
    forever_0: { type: 'bool', path: 'option', default: 0 },
    forever_1: { type: 'bool', path: 'option', default: 0 },
    full_setting: { type: 'bool', path: 'option', default: 0 },
    judge: { type: 'u8', path: 'option', default: 0 },

    ep: { type: 'u16', path: 'info', default: 0 },

    effect_left: { type: 'u16', path: 'customize', default: 0 },
    effect_center: { type: 'u16', path: 'customize', default: 0 },
    effect_right: { type: 'u16', path: 'customize', default: 0 },
    hukidashi: { type: 'u16', path: 'customize', default: 0 },
    comment_1: { type: 'u16', path: 'customize', default: 0 },
    comment_2: { type: 'u16', path: 'customize', default: 0 },

    mode: { type: 'u8', path: 'config', default: 0 },
    chara: { type: 's16', path: 'config', default: -1 },
    music: { type: 's16', path: 'config', default: -1 },
    sheet: { type: 'u8', path: 'config', default: 0 },
    category: { type: 's8', path: 'config', default: -1 },
    sub_category: { type: 's8', path: 'config', default: -1 },
    chara_category: { type: 's8', path: 'config', default: -1 },
    course_id: { type: 's16', path: 'config', default: 0 },
    course_folder: { type: 's8', path: 'config', default: 0 },
    ms_banner_disp: { type: 's8', path: 'config', default: 0 },
    ms_down_info: { type: 's8', path: 'config', default: 0 },
    ms_side_info: { type: 's8', path: 'config', default: 0 },
    ms_raise_type: { type: 's8', path: 'config', default: 0 },
    ms_rnd_type: { type: 's8', path: 'config', default: 0 },

    enemy_medal: { type: 's16', path: 'event', default: 0 },
    hp: { type: 's16', path: 'event', default: 0 },

    stamp_id: { type: 's16', path: 'stamp', default: 0 },
    cnt: { type: 's16', path: 'stamp', default: 0 },
}