import * as path from "path"
import { processMdbData } from "../data/helper"
import { processData as processCommunityPlusData } from "../data/CommunityPlusMDB"
import { processData as processOnePlusHalfData } from "../data/OnePlusHalfMDB"


export const shop: EPR = async (info, data, send) => {
  // Ignore shop name setter.
  send.object({
    nxt_time: K.ITEM("u32", 1000 * 5 * 60)
  })
}

export const common: EPR = async (info, data, send) => {
  let { music } = U.GetConfig("enable_custom_mdb")
      ?  await processCustomData()
      :  (await processValidData(info))

  if (music.length === 0) {
    music = (await processValidData(info)).music
  }

  if (U.GetConfig("unlock_all_songs")) {
    music.forEach(element => {
      element.limited = K.ITEM("u8", 3)
    });
  }

  // Flags
  const event_list = [1, 83, 130, 194, 195, 98, 145, 146, 147, 148, 149, 56, 86, 105, 140, 211, 143]
  const event = {
    info: event_list.map((e) => {
      return {
          event_id: K.ITEM("u32", e)
      }
    })
  }

  send.object({
    music_limited: {
      info: music
    },
    event,
    // TODO: Skill course, Extended option.
    // skill_course,
    // extend
  })
}

// TODO: Implement this.
export const hiscore: EPR = async (info, data, send) => {
  send.success()
}

export const frozen: EPR = async (info, data, send) => {
  send.object({
    result: K.ITEM("u8", 0)
  })
}

// TODO: Implement this fully.
export const lounge: EPR = async (info, data, send) => {
  send.object({
    interval: K.ITEM("u32", 10),
    // wait
  })
}

export const exception: EPR = async (info, data, send) => {
  send.success()
}

async function processCustomData() {
  return processMdbData("data/custom_mdb.xml")
}

async function processValidData(info: EamuseInfo) {
  const version = parseInt(info.model.trim().substr(10), 10)
  if (version >= 2020102200) {
    // MUSECA PLUS
     processCommunityPlusData();
  } else /** if (version > 2016071300) */ {
    return await processOnePlusHalfData()
  } /** else {
    // Museca 1
    return await processOneData()
  }**/
}