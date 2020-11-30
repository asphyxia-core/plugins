import { Profile } from "../models/profile";
import { Scores } from "../models/scores";
import { IDToCode } from "../utils";

export const load: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const profile = await DB.FindOne<Profile>(refid, { collection: "profile" })
  if (profile == null) {
    // Request New Profile from game side.
    return send.object({
      result: K.ITEM("u8", 1)
    })
  }

  const item = _.map(profile.item, (v, k) => {
    return {
      type: K.ITEM("u8", v.type),
      id: K.ITEM("u32", parseInt(k)),
      param: K.ITEM("u32", v.param)
    }
  })


  send.object({
    hidden_param: K.ARRAY("s32", profile.hidden_param),
    play_count: K.ITEM("u32", profile.play_count),
    daily_count: K.ITEM("u32", profile.daily_count),
    play_chain: K.ITEM("u32", profile.play_chain),
    last: {
      headphone: K.ITEM("u8", profile.last.headphone),
      appeal_id: K.ITEM("u16", profile.last.appeal_id),
      comment_id: K.ITEM("u16", profile.last.comment_id),
      music_id: K.ITEM("s32", profile.last.music_id),
      music_type: K.ITEM("u8", profile.last.music_type),
      sort_type: K.ITEM("u8", profile.last.sort_type),
      narrow_down: K.ITEM("u8", profile.last.narrow_down),
      gauge_option: K.ITEM("u8", profile.last.gauge_option),
    },
    blaster_energy: K.ITEM("u32", profile.blaster_energy),
    blaster_count: K.ITEM("u32", profile.blaster_count),
    code: K.ITEM("str", IDToCode(profile.code)),
    name: K.ITEM("str", profile.name),
    creator_id: K.ITEM("u32", profile.creator_id),
    skill_level: K.ITEM("s16", profile.skill_level),
    skill_name_id: K.ITEM("s16", profile.skill_name_id),
    gamecoin_packet: K.ITEM("u32", profile.gamecoin_packet),
    gamecoin_block: K.ITEM("u32", profile.gamecoin_block),
    item: {
      info: item
    },
    param: {},
    result: K.ITEM("u8", 0),
    ea_shop: {
      packet_booster: K.ITEM("s32", 0),
      block_booster: K.ITEM("s32", 0)
    }
  })
}

export const load_m: EPR = async (info, data, send) => {
  const refid = $(data).str('dataid');
  if (!refid) return send.deny();

  const scores = (await DB.FindOne<Scores>(refid, { collection: 'scores'})).scores

  const music: any[] = [];
  for (const mid in scores) {
    for (const type in scores[mid]) {
      let score = scores[mid][type]
      music.push({
        music_id: K.ITEM("u32", parseInt(mid)),
        music_type: K.ITEM("u32", parseInt(type)),
        score: K.ITEM("u32", score.score),
        cnt: K.ITEM("u32", score.count),
        clear_type: K.ITEM("u32", score.clear_type),
        score_grade: K.ITEM("u32", score.score_grade),
        btn_rate: K.ITEM("u32", score.btn_rate),
        long_rate: K.ITEM("u32", score.long_rate),
        vol_rate: K.ITEM("u32", score.vol_rate)      
      })
    };
  };

  send.object({
    new: {
      music
    },
    // This field seems used on Museca 1, Ignore this.
    old: {}
  })
}

export const save: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const dbItem = (await DB.FindOne<Profile>(refid, { collection: "profile" })).item
  for(const item of $(data).elements("item.info")) {
    dbItem[item.number("id")] = {
      type: item.number("type"),
      param : item.number("param")
    }
  }


  await DB.Upsert<Profile>(refid, { collection: "profile" }, { 
    $set: {
      last: {
        headphone: $(data).number("headphone"),
        appeal_id: $(data).number("appeal_id"),
        comment_id: $(data).number("comment_id"),
        music_id: $(data).number("music_id"),
        music_type: $(data).number("music_type"),
        sort_type: $(data).number("sort_type"),
        narrow_down: $(data).number("narrow_down"),
        gauge_option: $(data).number("gauge_option"),
      },
      hidden_param: $(data).numbers("hidden_param"),
      blaster_count: $(data).number("blaster_count"),
      item: dbItem,
    },
    $inc: {
      blaster_energy: $(data).number("earned_blaster_energy"),
      gamecoin_block: $(data).number("earned_gamecoin_block"),
      gamecoin_packet: $(data).number("earned_gamecoin_packet")
    }
  })

  send.success()
}

export const save_m: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const scores = (await DB.FindOne<Scores>(refid, { collection: "scores" })).scores
  const mid = $(data).number("music_id")
  const type = $(data).number("music_type")

  if (!scores[mid]) {
    scores[mid] = {};
  }

  scores[mid][type] = {
    score: Math.max(_.get(scores[mid][type], 'score', 0), $(data).number("score")),
    clear_type: Math.max(_.get(scores[mid][type], 'clear_type', 0), $(data).number("clear_type")),
    score_grade: Math.max(_.get(scores[mid][type], 'score_grade', 0), $(data).number("score_grade")),
    count: _.get(scores[mid][type], 'count', 0) + 1,
    btn_rate: Math.max(_.get(scores[mid][type], 'btn_rate', 0), $(data).number("btn_rate")),
    long_rate: Math.max(_.get(scores[mid][type], 'long_rate', 0), $(data).number("long_rate")),
    vol_rate: Math.max(_.get(scores[mid][type], 'vol_rate', 0), $(data).number("vol_rate")),
  };

  const store: Scores = {
    collection: "scores",
    scores
  }

  await DB.Upsert<Scores>(refid, { collection: "scores" }, store)

  send.success()
}

export const newProfile: EPR = async (info, data, send) => {
  const refid = $(data).str('refid');
  if (!refid) return send.deny();

  const name = $(data).str('name', 'NONAME');
  let code = _.random(0, 99999999);
  while (await DB.FindOne<Profile>(null, { collecttion: 'profile', code })) {
    code = _.random(0, 99999999);
  }

  let defItem = {};
  for(let i = 1; i < 801; i++) {
    defItem[i] = {
      type: 4,
      param : 1
    }
  }

  const profile: Profile = {
    collection: "profile",
    code,
    name,
    
    hidden_param: Array(20).fill(0),
    play_count: 0,
    daily_count: 0,
    play_chain: 0,
    last: {
      headphone: 0,
      appeal_id: 0,
      comment_id: 0,
      music_id: 0,
      music_type: 0,
      sort_type: 0,
      narrow_down: 0,
      gauge_option: 0,
    },
    blaster_energy: 0,
    blaster_count: 0,
    creator_id: 0,
    skill_level: 0,
    skill_name_id: 0,
    gamecoin_packet: 0,
    gamecoin_block: 0,

    item: defItem,

    packet_booster: 0,
    block_booster: 0,
  }
  await DB.Upsert<Profile>(refid, { collection: "profile"}, profile)
  await DB.Upsert<Scores>(refid, { collection: "scores" }, { collection: "scores", scores: {}})
  send.success()
}