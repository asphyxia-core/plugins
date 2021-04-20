import { Achievements } from "../models/achievements";
import { Profile, Scores, ExtraData, Params, Rivals } from "../models/common";

const CURRENT_DATA_VERSION = 2;

export const addExtraData = (player: any, params: Params, extraData: ExtraData) => {
    for (const field in extraData) {
        const fieldName = field.replace(/(__\d*)/, '');

        const fieldMetaData = extraData[field];
        if (fieldMetaData.isArray) {
            _.set(
                player,
                `${fieldMetaData.path}.${fieldName}`,
                K.ARRAY(
                    fieldMetaData.type as any,
                    _.get(params, `params.${field}`, fieldMetaData.default)
                )
            );
        } else {
            _.set(
                player,
                `${fieldMetaData.path}.${fieldName}`,
                K.ITEM(
                    fieldMetaData.type as any,
                    _.get(params, `params.${field}`, fieldMetaData.default)
                )
            );
        }
    }
}

export const getExtraData = (data: any, params: Params, extraData: ExtraData) => {
    for (const field in extraData) {
        const fieldName = field.replace(/(__\d*)/, '');
        const fieldMetaData = extraData[field];

        let path = fieldMetaData.path;
        if (fieldMetaData.pathSrc != undefined) {
            path = fieldMetaData.pathSrc;
        }
        if (path.length > 0) {
            path += '.';
        }

        let value = _.get(data, path + fieldName + '.@content');
        if (value == 'undefined' && value == null) {
            continue;
        }

        if (_.isArray(value) && value.length == 1) {
            value = value[0];
        }

        _.set(params, `params.${field}`, value);
    }
}

export const readProfile = async (refid: string): Promise<Profile> => {
    const profile = await DB.FindOne<Profile>(refid, { collection: 'profile' });
    if (profile !== undefined && profile !== null && profile.dataVersion !== CURRENT_DATA_VERSION) {
        return await doConvert(profile);
    }
    return profile || { collection: 'profile', name: 'ゲスト', dataVersion: CURRENT_DATA_VERSION };
}

export const writeProfile = async (refid: string, profile: Profile) => {
    await DB.Upsert<Profile>(refid, { collection: 'profile' }, profile);
}

export const readRivals = async (refid: string): Promise<Rivals> => {
    const rivals = await DB.FindOne<Rivals>(refid, { collection: 'rivals' });
    return rivals || { collection: 'rivals', rivals: [] };
}

export const readParams = async (refid: string, version: string): Promise<Params> => {
    const params = await DB.FindOne<Params>(refid, { collection: 'params', version });
    return params || { collection: 'params', version, params: {} };
}

export const writeParams = async (refid: string, version: string, params: Params) => {
    await DB.Upsert<Params>(refid, { collection: 'params', version }, params);
}

export const readScores = async (refid: string, version: string, forceVersion: boolean = false): Promise<Scores> => {
    if (forceVersion || !U.GetConfig("enable_score_sharing")) {
        const score = await DB.FindOne<Scores>(refid, { collection: 'scores', version });
        return score || { collection: 'scores', version, scores: {} };
    } else {
        let retScore = <Scores>{ collection: 'scores', version, scores: {} };
        const scores = await DB.Find<Scores>(refid, { collection: 'scores' });
        for (const score of scores) {
            _.mergeWith(retScore.scores, score.scores, (objValue, srcValue) => {
                if (objValue == undefined && srcValue != undefined) {
                    return srcValue;
                }
                return {
                    score: Math.max(objValue.score, srcValue.score),
                    cnt: objValue.cnt + srcValue.cnt,
                    clear_type: Math.max(objValue.clear_type, srcValue.clear_type)
                }
            });
        }
        return retScore;
    }
}

export const writeScores = async (refid: string, version: string, scores: Scores) => {
    await DB.Upsert<Scores>(refid, { collection: 'scores', version }, scores);
}

export const readAchievements = async (refid: string, version: string, defaultValue: Achievements): Promise<Achievements> => {
    const achievements = await DB.FindOne<Achievements>(refid, { collection: 'achievements', version });
    return achievements || defaultValue;
}

export const writeAchievements = async (refid: string, version: string, achievements: Achievements) => {
    await DB.Upsert<Achievements>(refid, { collection: 'achievements', version }, achievements);
}

const doConvert = async (profile: ProfileDoc<any>): Promise<ProfileDoc<Profile>> => {
    let achievements = [];

    // charas
    if (profile.charas !== undefined) {
        for (let version in profile.charas) {
            achievements[version] = { collection: 'achievements', version, charas: profile.charas[version] };
        }
    }

    // stamps
    if (profile.stamps !== undefined) {
        for (let version in profile.stamps) {
            if (achievements[version] === undefined) {
                achievements[version] = { collection: 'achievements', version, stamps: profile.stamps[version] };
            } else {
                achievements[version].stamps = profile.stamps[version]
            }
        }
    }

    // medals
    if (profile.medals !== undefined) {
        for (let version in profile.medals) {
            if (achievements[version] === undefined) {
                achievements[version] = { collection: 'achievements', version, medals: profile.medals[version] };
            } else {
                achievements[version].medals = profile.medals[version]
            }
        }
    }

    // items
    if (profile.items !== undefined) {
        for (let version in profile.items) {
            if (achievements[version] === undefined) {
                achievements[version] = { collection: 'achievements', version, items: profile.items[version] };
            } else {
                achievements[version].items = profile.items[version]
            }
        }
    }

    // Write achievements
    for (let version in achievements) {
        const nbAchievements = await DB.Count<Achievements>(profile.__refid, { collection: 'achievements', version });
        if (nbAchievements == 0) {
            await DB.Insert<Achievements>(profile.__refid, achievements[version]);
        }
    }

    // Write extras/params
    if (profile.extras !== undefined) {
        for (let version in profile.extras) {
            const nbParams = await DB.Count<Params>(profile.__refid, { collection: 'params', version });
            if (nbParams == 0) {
                let params: Params = { collection: 'params', version, params: profile.extras[version] };

                // stamps
                if (profile.stamps !== undefined && profile.stamps[version] !== undefined) {
                    const key = Object.keys(profile.stamps[version])[0];
                    params.params.stamp_id = key;
                    params.params.cnt = profile.stamps[version][key];
                }

                await DB.Insert<Params>(profile.__refid, params);
            }
        }
    }

    // Update profile
    const newProfile = await (await DB.Upsert<Profile>(profile.__refid, { collection: 'profile' }, { collection: 'profile', name: profile.name, dataVersion: 2 })).docs[0];

    // Update scores
    let scoresData: Scores = { collection: 'scores', version: 'v25', scores: {} };
    const oldScores = await DB.Find<any>(null, { collection: 'scores' });
    for (const oldScore of oldScores) {
        for (const key in oldScore.scores) {
            scoresData.scores[key] = {
                score: oldScore.scores[key].score,
                cnt: oldScore.scores[key].cnt,
                clear_type: {
                    0: 100,
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
                }[Math.max(oldScore.scores[key].clearmedal || 0, oldScore.scores[key].clear_type || 0)]
            };
        }
        await DB.Remove(oldScore.__refid, { collection: 'scores' });
        await DB.Insert(oldScore.__refid, scoresData);
    }

    return newProfile;
}