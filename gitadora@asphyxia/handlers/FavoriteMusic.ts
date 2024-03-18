import { Extra } from "../models/extra";
import { FavoriteMusic } from "../models/favoritemusic";
import { isSharedFavoriteMusicEnabled } from "../utils/index";
import Logger from "../utils/logger";

const logger = new Logger("FavoriteMusic");

/**
 * Extracts favorite music data from the given extra data container, and saves it to the database as shared favorite music data for the player with the given refid.
 * This function has no effect if the 'Shared favorite music' option is not enabled.
 * Note that shared favorite music is shared across both Guitar Freaks and Drummania, as well as all supported versions of the game.
 * @param refid The refid of the player.
 * @param extra The extra data container of the player, containing the favorite music lists to be saved.
 * @returns {boolean} - whether the favorite music data was successfully saved.
 */
export async function saveSharedFavoriteMusicFromExtra(refid: string, extra: Extra) : Promise<boolean>
{
    if (!isSharedFavoriteMusicEnabled()) {
        return false
    }

    let result : FavoriteMusic = {
        collection: 'favoritemusic',
        pluginVer: 1,
        list_1: extra.list_1,
        list_2: extra.list_2,
        list_3: extra.list_3,
        recommend_musicid_list: extra.recommend_musicid_list,
    }

    try
    {
        await saveFavoriteMusic(refid, result)
        logger.debugInfo(`Saved shared favorite music for profile ${refid} successfully.`);
        return true
    }
    catch (e)
    {
        logger.error(`Failed to save shared favorite music for profile ${refid}.`);
        logger.error(e);
        return false
    }
}

/**
 * Retrieves shared favorite music data from the database for the player with the given refid, and applies the data to the provided extra data container.
 * This function has no effect if the 'Shared favorite music' option is not enabled.
 * Note that shared favorite music is shared across both Guitar Freaks and Drummania, as well as all supported versions of the game.
 * @param refid - The refid of the player.
 * @param extra - The destination object where favorite music data should be applied.
 */
export async function applySharedFavoriteMusicToExtra(refid : string, extra : Extra) : Promise<void>
{
    if (!isSharedFavoriteMusicEnabled()) {
        return
    }

    try
    {  
        let favoriteMusic = await loadFavoriteMusic(refid)

        if (favoriteMusic == null) {
            logger.debugInfo(`No shared favourite music available for profile ${refid}. Using game specific favorites. Favorites will be saved as shared favorites at the end of the game session.`);
            return
        }

        extra.list_1 = favoriteMusic.list_1
        extra.list_2 = favoriteMusic.list_2
        extra.list_3 = favoriteMusic.list_3
        extra.recommend_musicid_list = favoriteMusic.recommend_musicid_list
        logger.debugInfo(`Loaded shared favorite music for profile ${refid} successfully.`);
    }
    catch (e) 
    {
        logger.error(`Failed to load shared favorite music for profile ${refid}.`);
        logger.error(e);
    }
}

export async function saveFavoriteMusic(refid: string, data : FavoriteMusic) : Promise<any> 
{
    return await DB.Upsert<FavoriteMusic>(refid, {
        collection: 'favoritemusic',
      }, data)
}

export async function loadFavoriteMusic(refid : string) : Promise<FavoriteMusic>
{
    return await DB.FindOne<FavoriteMusic>(refid, {
        collection: 'favoritemusic'
    })
}

