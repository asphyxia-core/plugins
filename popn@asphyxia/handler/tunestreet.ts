import { AchievementsTuneStreet } from "../models/achievements";
import { Params, Profile } from "../models/common";
import * as utils from "./utils";

/**
 * Handler for getting the current state of the game (phase, good prices, etc...)
 */
export const getInfo = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const result = K.ATTR({
        game_phase: "2",
        ir_phase: "14", // None at 0/7/14
        event_phase: "15", // Town Mode (max value 17 / Town Max = 15)
        netvs_phase: "18", // Max 18
        card_phase: "3",
        gfdm_phase: "2",
        jubeat_phase: "2",
        local_matching_enable: "0",
        matching_sec: "120",
        boss_diff: "100,100,100,100,100,100,100,100,100,100",
        boss_battle_point: "1",
    });

    return send.object(result);
};

/**
 * Handler for new profile
 */
export const newPlayer = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const name = $(data).attr()['name'];

    send.object(await getProfile(refid, name));
};

/**
 * Handler for existing profile
 */
export const read = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    send.object(await getProfile(refid));
};

/**
 * Get/create the profile and scores based on refid
 * @param refid the profile refid
 * @param name if defined, create/update the profile with the given name
 */
export const getProfile = async (refid: string, name?: string) => {
    const profile = await utils.readProfile(refid);
    //const rivals = await utils.readRivals(refid);

    if (name && name.length > 0) {
        profile.name = name;
        await utils.writeProfile(refid, profile);
    }

    const params = await utils.readParams(refid, version);

    let binary_profile = Array(2892).fill(0);
    let name_binary = U.EncodeString(profile.name, 'shift_jis');
    for (let i = 0; i < name_binary.length || i < 12; i++) {
        binary_profile[i] = name_binary[i];
    }

    binary_profile[13] = {
        0: 0,
        1: 0,
        2: 1,
        3: 1,
        4: 5,
        5: 2,
        6: 4,
        7: 4,
        8: 4,
        9: 4,
        10: 1,
        11: 5,
        12: 4,
        13: 6,
        14: 6,
        15: 6,
    }[_.get(params, `params.play_mode`, 0)] & 0xFF; // mode_num
    binary_profile[14] = {
        0: 1,
        1: 0,
        2: 1,
        3: 0,
        4: -1,
        5: -1,
        6: -1,
        7: -1,
        8: -1,
        9: -1,
        10: 0,
        11: -1,
        12: -1,
        13: -1,
        14: -1,
        15: -1,
    }[_.get(params, `params.play_mode`, 0)] & 0xFF; //botton_num
    binary_profile[15] = _.get(params, `params.last_play_flag`, 0) & 0xFF;
    binary_profile[16] = _.get(params, `params.medal_and_friend`, 0) & 0xFF;

    let friendId = profile.friendId;
    if (friendId == undefined || friendId == null) {
        let check = null;
        do {
            friendId = "";
            for (let i = 0; i < 12; i++) {
                friendId += Math.floor(Math.random() * 10);
            }
            profile.friendId = friendId;
            let check = await DB.FindOne<Profile>(null, { collection: 'profile', friendId });
        } while(check != undefined && check != null);
        await utils.writeProfile(refid, profile);
    }
    let friendIdBinary = U.EncodeString(profile.friendId, 'shift_jis');
    for (let i = 0; i < friendIdBinary.length || i < 12; i++) {
        binary_profile[17 + i] = friendIdBinary[i];
    }

    // binary_profile[30] = customize_available
    // binary_profile[31] = customize_level_min
    // binary_profile[32] = customize_level_max
    // binary_profile[33] = customize_medal_min
    // binary_profile[34] = customize_medal_max
    // binary_profile[35] = customize_friend_no
    // binary_profile[36] = customize_friend_winlose
    // binary_profile[37] = read_news_no_max
    binary_profile[38] = _.get(params, `params.skin_tex_note`, 0) & 0xFF;
    binary_profile[39] = _.get(params, `params.skin_tex_cmn`, 0) & 0xFF;
    binary_profile[40] = _.get(params, `params.skin_sd_bgm`, 0) & 0xFF;
    binary_profile[41] = _.get(params, `params.skin_sd_se`, 0) & 0xFF;
    binary_profile[44] = _.get(params, `params.option`, 0) & 0xFF;
    binary_profile[45] = (_.get(params, `params.option`, 0) >> 8) & 0xFF;
    binary_profile[46] = (_.get(params, `params.option`, 0) >> 16) & 0xFF;
    binary_profile[47] = (_.get(params, `params.option`, 0) >> 24) & 0xFF;
    // binary_profile[48] = jubeatcollabo
    // binary_profile[52] = color_3p_flag
    binary_profile[60] = _.get(params, `params.chara`, 0) & 0xFF;
    binary_profile[61] = (_.get(params, `params.chara`, 0) >> 8) & 0xFF;
    binary_profile[62] = _.get(params, `params.music`, 0) & 0xFF;
    binary_profile[63] = (_.get(params, `params.music`, 0) >> 8) & 0xFF;
    binary_profile[64] = _.get(params, `params.sheet`, 0) & 0xFF;
    binary_profile[65] = _.get(params, `params.category`, 0) & 0xFF;
    // binary_profile[66] = norma_point
    // binary_profile[67] = rivals.rivals.length; // TODO: implements rivals
    // binary_profile[2208 -> 2351] = ir
    // binary_profile[2352 -> 2892] = netvs

    // Get Score
    let hiscore_array = Array(Math.floor((((GAME_MAX_MUSIC_ID * 7) * 17) + 7) / 8)).fill(0);

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
        if (sheet == 0) {
            continue;
        }

        //flag
        const flags = __format_flags_for_score(sheet, score.clear_type);
        const flags_index = music * 2;
        binary_profile[108 + flags_index] = binary_profile[108 + flags_index] | (flags & 0xFF);
        binary_profile[109 + flags_index] = binary_profile[109 + flags_index] | ((flags >> 8) & 0xFF);

        if (sheet == 7 || sheet == 8) {
            continue;
        }

        const hiscore_index = (music * 7) + {
            9: 0,
            4: 1,
            5: 2,
            6: 3,
            1: 4,
            2: 5,
            3: 6,
        }[sheet];
        const hiscore_byte_pos = Math.floor((hiscore_index * 17) / 8);
        const hiscore_bit_pos = ((hiscore_index * 17) % 8);
        const hiscore_value = score.score << hiscore_bit_pos;
        hiscore_array[hiscore_byte_pos] = hiscore_array[hiscore_byte_pos] | (hiscore_value & 0xFF);
        hiscore_array[hiscore_byte_pos + 1] = hiscore_array[hiscore_byte_pos + 1] | ((hiscore_value >> 8) & 0xFF);
        hiscore_array[hiscore_byte_pos + 2] = hiscore_array[hiscore_byte_pos + 2] | ((hiscore_value >> 16) & 0xFF);

        playCount.set(music, (playCount.get(music) || 0) + score.cnt);
    }

    let myBest = Array(20).fill(-1);
    const sortedPlayCount = new Map([...playCount.entries()].sort((a, b) => b[1] - a[1]));
    let i = 0;
    for (const value of sortedPlayCount.keys()) {
        if (i >= 20) {
            break;
        }
        myBest[i] = value;
        i++;
    }

    let profile_pos = 68
    for (const musicid of myBest) {
        binary_profile[profile_pos] = musicid & 0xFF
        binary_profile[profile_pos + 1] = (musicid >> 8) & 0xFF
        profile_pos = profile_pos + 2
    }

    const achievements = <AchievementsTuneStreet>await utils.readAchievements(refid, version, defaultAchievements);

    // Town mode
    let town = Array(272).fill(0);
    const tp = _.get(params, `params.tp`, 100);
    town[0] = tp & 0xFF
    town[1] = (tp >> 8) & 0xFF
    town[2] = (tp >> 16) & 0xFF
    town[3] = (tp >> 24) & 0xFF

    for (let i = 0; i < 3; i++) {
        const value = achievements.bought_flg[i] || 0;
        town[(i * 4) + 4] = value & 0xFF
        town[(i * 4) + 4 + 1] = (value >> 8) & 0xFF
        town[(i * 4) + 4 + 2] = (value >> 16) & 0xFF
        town[(i * 4) + 4 + 3] = (value >> 24) & 0xFF
    }
    for (let i = 0; i < 8; i++) {
        const value = achievements.build_flg[i] || 0;
        town[(i * 4) + 16] = value & 0xFF
        town[(i * 4) + 16 + 1] = (value >> 8) & 0xFF
        town[(i * 4) + 16 + 2] = (value >> 16) & 0xFF
        town[(i * 4) + 16 + 3] = (value >> 24) & 0xFF
    }
    for (let i = 0; i < 19; i++) {
        const value = achievements.chara_flg[i] || 0;
        town[(i * 4) + 48] = value & 0xFF
        town[(i * 4) + 48 + 1] = (value >> 8) & 0xFF
        town[(i * 4) + 48 + 2] = (value >> 16) & 0xFF
        town[(i * 4) + 48 + 3] = (value >> 24) & 0xFF
    }
    for (let i = 0; i < 4; i++) {
        const value = achievements.event_flg[i] || 0;
        town[(i * 4) + 124] = value & 0xFF
        town[(i * 4) + 124 + 1] = (value >> 8) & 0xFF
        town[(i * 4) + 124 + 2] = (value >> 16) & 0xFF
        town[(i * 4) + 124 + 3] = (value >> 24) & 0xFF
    }
    town[140] = achievements.play_type & 0xFF

    for (let applyIdx = 0; applyIdx < achievements.apply.length; applyIdx++) {
        let apply_name = U.EncodeString(achievements.apply[applyIdx], 'shift_jis');
        for (let i = 0; i < apply_name.length || i < 12; i++) {
            const index = applyIdx * 13 + i + 141;
            town[index] = apply_name[i];
        }
    }

    const player = {
        b: K.ITEM('bin', Buffer.from(binary_profile)),
        hiscore: K.ITEM('bin', Buffer.from(hiscore_array)),
        town: K.ITEM('bin', Buffer.from(town)),
    }

    return player;
}

/**
 * Handler for getting town mode maps data
 */
export const map = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    let refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const friendId = $(data).attr()['gpm_id'];
    let isRandom = parseInt($(data).attr()['is_random'], 10);
    let friends = await DB.Find<AchievementsTuneStreet>(null, { collection: 'achievements', version: 'v19' });

    if (friendId != undefined && friendId != null) {
        // Check if friend exists
        let friend = await DB.FindOne<Profile>(null, { collection: 'profile', friendId });
        if(friend != undefined && friend != null) {
            // Check if friend has tunestreet town mode data
            const achievements = await DB.Find<AchievementsTuneStreet>(null, { collection: 'achievements', version: 'v19' });
            if(achievements != undefined && achievements != null) {
                refid = friend.__refid;
                isRandom == 0;
            }
        }
    }
    if (isRandom == 1) {
        // Pick a random refid from players having tunestreet data
        refid = friends[Math.floor(Math.random() * friends.length)].__refid
    }

    const player = {
        residence: K.ATTR({ id: "0" }),
        map: []
    }

    // player map
    player.map.push(K.ITEM("bin", Buffer.from(await formatMap(refid)), { residence: "0" }));
    
    // Friends map (max 9)
    const usedFriends = [refid];
    let i = 1;
    while(i < 10 && i < friends.length) {
        const friendRefid = friends[Math.floor(Math.random() * friends.length)].__refid;
        if(usedFriends.indexOf(friendRefid) == -1) {
            usedFriends.push(friendRefid);
            player.map.push(K.ITEM("bin", Buffer.from(await formatMap(friendRefid)), { residence: `${i}` }));
            i++;
        }
    }

    send.object(player);
}

const formatMap = async (refid: string) => {
    const profile = await utils.readProfile(refid);
    const params = await utils.readParams(refid, version);
    const achievements = <AchievementsTuneStreet>await utils.readAchievements(refid, version, defaultAchievements);

    let map = Array(180);
    map[0] = _.get(params, `params.chara`, 0) & 0xFF
    map[1] = (_.get(params, `params.chara`, 0) >> 8) & 0xFF

    // Building data
    for (let i = 0; i <= 7; i++) {
        if (achievements.building[i]) {
            let idx = 0;
            for (let j = 0; j <= 7; j++) {
                map[(8 * i) + 42 + idx] = achievements.building[i][j] || 0;
                idx++;
            }
        }
    }
    // Friend ID
    for (let i = 0; i < profile.friendId.length || i < 12; i++) {
        map[106 + i] = profile.friendId[i];
    }

    // Player Name
    let name_binary = U.EncodeString(profile.name, 'shift_jis');
    for (let i = 0; i < name_binary.length || i < 12; i++) {
        map[i + 119] = name_binary[i];
    }
    // map[132] = message

    // Base state
    for (let i = 0; i < 4; i++) {
        map[i + 173] = achievements.base[i];
    }

    // Player most played songs
    const scoresData = await utils.readScores(refid, version);
    const playCount = new Map();
    for (const key in scoresData.scores) {
        const keyData = key.split(':');
        const score = scoresData.scores[key];
        const music = parseInt(keyData[0], 10);
        const sheet = parseInt(keyData[1], 10);

        if (music > GAME_MAX_MUSIC_ID || sheet == 0 || sheet == 7 || sheet == 8) {
            continue;
        }

        playCount.set(music, (playCount.get(music) || 0) + score.cnt);
    }

    let myBest = Array(20).fill(-1);
    const sortedPlayCount = new Map([...playCount.entries()].sort((a, b) => b[1] - a[1]));
    let i = 0;
    for (const value of sortedPlayCount.keys()) {
        if (i >= 20) {
            break;
        }
        myBest[i] = value;
        i++;
    }

    let mybest_pos = 2
    for (let i = 0; i < myBest.length; i++) {
        map[mybest_pos] = myBest[i] & 0xFF
        map[mybest_pos + 1] = (myBest[i] >> 8) & 0xFF
        mybest_pos = mybest_pos + 2
    }

    return map;
}

const __format_flags_for_score = (sheet: number, clear_type: number) => {
    const playedflag = {
        9: 0x2000,
        4: 0x0800,
        5: 0x1000,
        6: 0x4000,
        1: 0x0800,
        2: 0x1000,
        3: 0x4000,
        7: 0,
        8: 0,
    }[sheet]
    const shift = {
        9: 4,
        4: 0,
        5: 2,
        6: 6,
        1: 0,
        2: 2,
        3: 6,
        7: 9,
        8: 8,
    }[sheet]
    const flags = {
        100: 0,
        200: 0,
        300: 0,
        400: 1,
        500: 1,
        600: 1,
        700: 1,
        800: 2,
        900: 2,
        1000: 2,
        1100: 3,
    }[clear_type]
    return (flags << shift) | playedflag
}

/**
 * Handler for saving profile and scores
 */
export const write = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const params = await utils.readParams(refid, version);

    params.params['tp'] = parseInt($(data).attr()['tp']);
    params.params['play_mode'] = parseInt($(data).attr()['play_mode']);
    params.params['chara'] = parseInt($(data).attr()['chara_num']);
    params.params['option'] = parseInt($(data).attr()['option']);
    params.params['last_play_flag'] = parseInt($(data).attr()['last_play_flag']);
    params.params['medal_and_friend'] = parseInt($(data).attr()['medal_and_friend']);
    params.params['music'] = parseInt($(data).attr()['music_num']);
    params.params['sheet'] = parseInt($(data).attr()['sheet_num']);
    params.params['category'] = parseInt($(data).attr()['category_num']);
    params.params['skin_sd_bgm'] = parseInt($(data).attr()['skin_sd_bgm']);
    params.params['skin_sd_se'] = parseInt($(data).attr()['skin_sd_se']);
    params.params['skin_tex_cmn'] = parseInt($(data).attr()['skin_tex_cmn']);
    params.params['skin_tex_note'] = parseInt($(data).attr()['skin_tex_note']);

    await utils.writeParams(refid, version, params);

    const scoresData = await utils.readScores(refid, version, true);

    for (const scoreData of $(data).elements('music')) {
        const music = parseInt(scoreData.attr()['music_num']);
        let sheet = parseInt(scoreData.attr()['sheet_num']);
        const score = parseInt(scoreData.attr()['score']);
        const data = parseInt(scoreData.attr()['data']);

        if (sheet == 4 || sheet == 5) {
            continue;
        }

        if (params.params['play_mode'] == 4) {
            if ([2, 6, 7].indexOf(sheet) != -1) {
                continue;
            }
            sheet = {
                0: 1,
                1: 2,
                3: 3,
            }[sheet]
        } else {
            sheet = {
                0: 4,
                1: 5,
                2: 9,
                3: 6,
                6: 7,
                7: 8,
            }[sheet]
        }

        const shift = {
            9: 4,
            4: 0,
            5: 2,
            6: 6,
            1: 0,
            2: 2,
            3: 6,
            7: 9,
            8: 8,
        }[sheet]

        let mask = 0x3;
        if (sheet == 7 || sheet == 8) {
            mask = 0x1;
        }

        const flags = (data >> shift) & mask;
        const clear_type = {
            0: 100,
            1: 500,
            2: 800,
            3: 1100,
        }[flags]

        const key = `${music}:${sheet}`;

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
    }

    utils.writeScores(refid, version, scoresData);

    // Town mode save
    const town = $(data).element('town');
    if (town != undefined && town != null) {
        const achievements = <AchievementsTuneStreet>await utils.readAchievements(refid, version, defaultAchievements);
        for (let i = 0; i <= 5; i++) {
            achievements.apply[i] = town.attr()[`apply_gpmid_${i}`];
        }
        for (let i = 0; i <= 7; i++) {
            achievements.building[i] = town.attr()[`building_${i}`].split(',').map(Number);
        }
        achievements.bought_flg = town.attr()[`bought_flg`].split(',').map(Number);
        achievements.build_flg = town.attr()[`build_flg`].split(',').map(Number);
        achievements.chara_flg = town.attr()[`chara_flg`].split(',').map(Number);
        achievements.event_flg = town.attr()[`event_flg`].split(',').map(Number);
        achievements.base = town.attr()[`base`].split(',').map(Number);
        achievements.play_type = parseInt(town.attr()['play_type'], 10);
        await utils.writeAchievements(refid, version, achievements);
    }

    const profile = await utils.readProfile(refid);

    const result = {
        pref: K.ITEM('s8', -1),
        name: K.ITEM('str', profile.name)
    }

    send.object(result);
};

export const friend = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    // TODO: rival support (see e-amuemu C# code)
    send.deny();
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const version: string = 'v19';
const GAME_MAX_MUSIC_ID = 1047;

const defaultAchievements: AchievementsTuneStreet = {
    collection: 'achievements',
    version: 'v19',
    apply: Array(6),
    bought_flg: Array(3),
    build_flg: Array(8),
    chara_flg: Array(19),
    event_flg: Array(4),
    base: Array(4),
    building: {
        0: Array(8),
        1: Array(8),
        2: Array(8),
        3: Array(8),
        4: Array(8),
        5: Array(8),
        6: Array(8),
        7: Array(8),
    },
    play_type: 0
}