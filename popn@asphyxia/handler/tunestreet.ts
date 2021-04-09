import * as utils from "./utils";

export const getInfo = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const result = K.ATTR({ game_phase: "2", psp_phase: "2" });

    return send.object(result);
};

/**
 * Create a new profile and send it.
 */
export const newPlayer = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const name = $(data).attr()['name'];

    send.object(await getProfile(refid, name));
};

/**
 * Read a profile and send it.
 */
export const read = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    send.object(await getProfile(refid));
};

/**
 * Get/create the profile based on refid
 * @param refid the profile refid
 * @param name if defined, create/update the profile with the given name
 * @returns 
 */
export const getProfile = async (refid: string, name?: string) => {
    const profile = await utils.readProfile(refid);

    if (name && name.length > 0) {
        profile.name = name;
        await utils.writeProfile(refid, profile);
    }

    const params = await utils.readParams(refid, version);

    let binary_profile = Array(2200).fill(0);
    let name_binary = profile.name.substr(0, 12);
    for (let i = 0; i < name_binary.length; i++) {
        binary_profile[i] = name_binary.charAt(i);
    }

    binary_profile[13] = {
        0: 0,
        1: 0,
        2: 1,
        3: 1,
        4: 4,
        5: 2,
    }[_.get(params, `params.play_mode`, 0)]

    binary_profile[16] = _.get(params, `params.last_play_flag`, 0) & 0xFF
    binary_profile[44] = _.get(params, `params.option`, 0) & 0xFF
    binary_profile[45] = (_.get(params, `params.option`, 0) >> 8) & 0xFF
    binary_profile[46] = (_.get(params, `params.option`, 0) >> 16) & 0xFF
    binary_profile[47] = (_.get(params, `params.option`, 0) >> 24) & 0xFF
    binary_profile[60] = _.get(params, `params.chara`, 0) & 0xFF
    binary_profile[61] = (_.get(params, `params.chara`, 0) >> 8) & 0xFF
    binary_profile[62] = _.get(params, `params.music`, 0) & 0xFF
    binary_profile[63] = (_.get(params, `params.music`, 0) >> 8) & 0xFF
    binary_profile[64] = _.get(params, `params.sheet`, 0) & 0xFF
    binary_profile[65] = _.get(params, `params.category`, 0) & 0xFF
    binary_profile[67] = _.get(params, `params.medal_and_friend`, 0) & 0xFF

    // Get Score
    let hiscore_array = Array(Math.floor((((GAME_MAX_MUSIC_ID * 7) * 17) + 7) / 8)).fill(0);

    const scoresData = await utils.readScores(refid, version);
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
        const flags_index = music * 2
        binary_profile[108 + flags_index] = binary_profile[108 + flags_index] | (flags & 0xFF)
        binary_profile[109 + flags_index] = binary_profile[109 + flags_index] | ((flags >> 8) & 0xFF)

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
    }

    const player = {
        b: K.ITEM('bin', Buffer.from(binary_profile)),
        hiscore: K.ITEM('bin', Buffer.from(hiscore_array)),
        town: K.ITEM('bin', Buffer.alloc(0)),
    }

    return player;
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

export const write = async (req: EamuseInfo, data: any, send: EamuseSend): Promise<any> => {
    const refid = $(data).attr()['ref_id'];
    if (!refid) return send.deny();

    const params = await utils.readParams(refid, version);
    
    params.params['play_mode'] = parseInt($(data).attr()['play_mode']);
    params.params['chara'] = parseInt($(data).attr()['chara_num']);
    params.params['option'] = parseInt($(data).attr()['option']);
    params.params['last_play_flag'] = parseInt($(data).attr()['last_play_flag']);
    params.params['medal_and_friend'] = parseInt($(data).attr()['medal_and_friend']);
    params.params['music'] = parseInt($(data).attr()['music_num']);
    params.params['sheet'] = parseInt($(data).attr()['sheet_num']);
    params.params['category'] = parseInt($(data).attr()['category_num']);

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

        if(params.params['play_mode'] == 4) {
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

    const profile = await utils.readProfile(refid);

    const result = {
        pref: K.ITEM('s8', -1),
        name: K.ITEM('str', profile.name)
    }

    send.object(result);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const version: string = 'v19';
const GAME_MAX_MUSIC_ID = 1045;