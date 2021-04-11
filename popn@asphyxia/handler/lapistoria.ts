import { AchievementsLapistoria } from "../models/achievements";
import { ExtraData, Phase, Profile } from "../models/common";
import * as utils from "./utils";

export const setRoutes = () => {
    R.Route(`info22.common`, getInfo);
    R.Route(`player22.new`, newPlayer);
    R.Route(`player22.read`, read);
    R.Route(`player22.write_music`, writeScore);
    R.Route(`player22.write`, write);
}

/**
 * Return info22.common informations (phase, etc...)
 */
const getInfo = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const result: any = {
        phase: [],
        story: [],
    };

    for (const elt of phase) {
        result.phase.push({
            event_id: K.ITEM('s16', elt.id),
            phase: K.ITEM('s16', elt.p),
        });
    }

    for (let i = 0; i < 173; ++i) {
        result.story.push({
            story_id: K.ITEM('u32', i),
            is_limited: K.ITEM('bool', false),
            limit_date: K.ITEM('u64', BigInt(0)),
        });
    }

    return send.object(result);
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

    let player: any = {
        result: K.ITEM('s8', 0),
        account: {
            name: K.ITEM('str', profile.name),
            g_pm_id: K.ITEM('str', 'ASPHYXIAPLAY'),
            staff: K.ITEM('s8', 0),
            is_conv: K.ITEM('s8', 0),
            item_type: K.ITEM('s16', 0),
            item_id: K.ITEM('s16', 0),
            license_data: K.ARRAY('s16', [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1]),

            // TODO: replace with real data
            total_play_cnt: K.ITEM('s16', 100),
            today_play_cnt: K.ITEM('s16', 50),
            consecutive_days: K.ITEM('s16', 365),
            total_days: K.ITEM('s16', 366),
            interval_day: K.ITEM('s16', 1),
            latest_music: K.ARRAY('s16', [-1, -1, -1, -1, -1]),
            active_fr_num: K.ITEM('u8', 0),
        },
        netvs: {
            rank_point: K.ITEM('s32', 0),
            record: K.ARRAY('s16', [0, 0, 0, 0, 0, 0]),
            rank: K.ITEM('u8', 0),
            vs_rank_old: K.ITEM('u8', 0),
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

        music: [],
        item: [],
        achievement: [],
        chara_param: [],
        story: [],
    };

    // Add Score
    const scoresData = await utils.readScores(refid, version);
    const playCount = new Map();
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

        player.music.push({
            music_num: K.ITEM('s16', music),
            sheet_num: K.ITEM('u8', sheet),
            cnt: K.ITEM('s16', score.cnt),
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
            old_score: K.ITEM('s32', 0),
            old_clear_type: K.ITEM('u8', 0),
        });

        playCount.set(music, (playCount.get(music) || 0) + score.cnt);
    }

    let myBest = Array(10).fill(-1);
    const sortedPlayCount = new Map([...playCount.entries()].sort((a, b) => b[1] - a[1]));
    let i = 0;
    for (const value of sortedPlayCount.keys()) {
        if (i >= 10) {
            break;
        }
        myBest[i] = value;
        i++;
    }
    player.account.my_best = K.ARRAY('s16', myBest);

    // Add achievements
    const achievements = <AchievementsLapistoria>await utils.readAchievements(refid, version, defaultAchievements);

    const profileAchievements = achievements.achievements || { '0': 0 };
    for (const achievement in profileAchievements) {
        player.achievement.push({
            type: K.ITEM('u8', parseInt(achievement, 10)),
            count: K.ITEM('u32', profileAchievements[achievement]),
        });
    }

    const profileCharas = achievements.charas || {};
    for (const chara_id in profileCharas) {
        player.chara_param.push({
            chara_id: K.ITEM('u16', parseInt(chara_id, 10)),
            friendship: K.ITEM('u16', profileCharas[chara_id]),
        });
    }

    const profileStories = achievements.stories || {};
    for (const story_id in profileStories) {
        const story = profileStories[story_id];
        player.story.push({
            story_id: K.ITEM('u32', parseInt(story_id, 10)),
            chapter_id: K.ITEM('u32', story.chapter_id),
            gauge_point: K.ITEM('u16', story.gauge_point),
            is_cleared: K.ITEM('bool', story.is_cleared),
            clear_chapter: K.ITEM('u32', story.clear_chapter),
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
    const achievements = <AchievementsLapistoria>await utils.readAchievements(refid, version, defaultAchievements);

    utils.getExtraData(data, params, extraData);

    // achievements
    let achievement = _.get(data, 'achievement', []);
    if (!achievements.achievements) {
        achievements.achievements = { '0': 0 };
    }

    if (!_.isArray(achievement)) {
        achievement = [achievement];
    }

    for (const elt of achievement) {
        const id = $(elt).number('type');
        const cnt = $(elt).number('count');

        achievements.achievements[id] = cnt;
    }

    // medals
    let stories = _.get(data, 'story', []);
    if (!achievements.stories) {
        achievements.stories = {};
    }

    if (!_.isArray(stories)) {
        stories = [stories];
    }

    for (const story of stories) {
        const id = $(story).number('story_id');
        const chapter_id = $(story).number('chapter_id');
        const gauge_point = $(story).number('gauge_point');
        const is_cleared = $(story).bool('is_cleared');
        const clear_chapter = $(story).number('clear_chapter');

        achievements.stories[id] = {
            chapter_id,
            gauge_point,
            is_cleared,
            clear_chapter,
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

const version: string = 'v22';
const GAME_MAX_MUSIC_ID = 1422;

const defaultAchievements: AchievementsLapistoria = {
    collection: 'achievements',
    version: 'v22',
    achievements: {},
    stories: {},
    items: {},
    charas: {},
}

const phase: Phase[] = [
    { id: 0, p: 16 },
    { id: 1, p: 11 },
    { id: 2, p: 11 },
    { id: 3, p: 24 },
    { id: 4, p: 2 },
    { id: 5, p: 2 },
    { id: 6, p: 1 },
    { id: 7, p: 1 },
    { id: 8, p: 2 },
    { id: 9, p: 11 },
    { id: 10, p: 2 },
    { id: 11, p: 3 },
    { id: 12, p: 1 },
    { id: 13, p: 2 },
    { id: 14, p: 4 },
    { id: 15, p: 2 },
    { id: 16, p: 2 },
    { id: 17, p: 12 },
    { id: 18, p: 2 },
    { id: 19, p: 7 },
];

const extraData: ExtraData = {
    tutorial: { type: 's8', path: 'account', default: 0 },
    read_news: { type: 's16', path: 'account', default: 0 },

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

    ep: { type: 'u16', path: 'info', default: 0 },
    ap: { type: 'u16', path: 'info', default: 0 },

    effect: { type: 'u16', path: 'customize', default: 0 },
    hukidashi: { type: 'u16', path: 'customize', default: 0 },
    font: { type: 'u16', path: 'customize', default: 0 },
    comment_1: { type: 'u16', path: 'customize', default: 0 },
    comment_2: { type: 'u16', path: 'customize', default: 0 },

    mode: { type: 'u8', path: 'config', default: 0 },
    chara: { type: 's16', path: 'config', default: -1 },
    music: { type: 's16', path: 'config', default: -1 },
    sheet: { type: 'u8', path: 'config', default: 0 },
    category: { type: 's8', path: 'config', default: 1 },
    sub_category: { type: 's8', path: 'config', default: -1 },
    chara_category: { type: 's8', path: 'config', default: -1 },
    story_id: { type: 's16', path: 'config', default: -1 },
    course_id: { type: 's16', path: 'config', default: -1 },
    course_folder: { type: 's8', path: 'config', default: -1 },
    story_folder: { type: 's8', path: 'config', default: -1 },
    ms_banner_disp: { type: 's8', path: 'config', default: 0 },
    ms_down_info: { type: 's8', path: 'config', default: 0 },
    ms_side_info: { type: 's8', path: 'config', default: 0 },
    ms_raise_type: { type: 's8', path: 'config', default: 0 },
    ms_rnd_type: { type: 's8', path: 'config', default: 0 },
}