import * as path from "path";
import { processData } from "../data/ForteMusic";
import { readB64JSON } from "../data/helper";

export const permitted_list = {
  flag: [
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '0' }),
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '1' }),
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '2' }),
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '3' }),
  ],
};

export const forte_permitted_list = {
  flag: [
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '0' }),
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '1' }),
    K.ARRAY('s32', Array(32).fill(-1), { sheet_type: '2' }),
  ],
}

async function ReadData(filename: string) {
  if (!IO.Exists(`data/${filename}.json.b64`)) {
    const xml = await IO.ReadFile(`data/${filename}.xml`, 'utf-8');
    const json = U.parseXML(xml, false)
    // await IO.WriteFile(`data/${filename}.json.b64`, Buffer.from(JSON.stringify(json)).toString('base64'));
    return json
  }
  return readB64JSON(`data/${filename}.json.b64`)
}

async function processIslandData() {
  const islandData = (await ReadData('island')).island_data_list.island_data;
  for (const island of islandData) {
    island.flag_permitted = K.ITEM('bool', 1);
    island.cost['@content'][0] = ~~(island.cost['@content'][0] / 10);
    let containers = island.get_music_index_list.container;
    if (!_.isArray(containers)) {
      containers = [containers];
    }

    for (const cont of containers) {
      cont['@attr'].no = cont['@attr'].container_no;
      delete cont['@attr'].container_no;
      if (!_.isArray(cont.music)) {
        cont.music = [cont.music];
      }

      for (const m of cont.music) {
        m.get_point['@content'][0] = ~~(m.get_point['@content'][0] / 6);
      }
    }

    island.get_music_index_list.container = containers;
  };

  return { island_data: islandData };
}

async function processCourseData() {
  const courseData = (await ReadData('course')).course_data_list.course_data;
  for (const course of courseData) {
    course.req_nos['@content'][0] = ~~(course.req_nos['@content'][0] / 10);
    if (course.seq_list && course.seq_list.tune) {
      course.seq_list = course.seq_list.tune;
      course.is_open = K.ITEM('bool', 1);
    }
  }

  return { course_data: courseData };
}

export const get_common_info = async (info, data, send) => {
  send.object({
    permitted_list,
    olupdate: {
      delete_flag: K.ITEM('bool', 0),
    },
  });
};

export const get_music_info: EPR = async (info, data, send) => {
  const isForte = !info.module.includes("op")

  const music_spec: any = [];
  for (let i = 1; i < 400; ++i) {
    music_spec.push(K.ATTR({ index: `${i}` }, {
      jk_jpn: K.ITEM('bool', 1),
      jk_asia: K.ITEM('bool', 1),
      jk_kor: K.ITEM('bool', 1),
      jk_idn: K.ITEM('bool', 1),
      start_date: K.ITEM('str', '2017-01-11 10:00'),
      end_date: K.ITEM('str', '9999-12-31 23:59'),
      expiration_date: K.ITEM('str', '9999-12-31 23:59'),
      real_start_date: K.ITEM('str', '2017-01-11 10:00'),
      real_end_date: K.ITEM('str', '9999-12-31 23:59'),
      real_once_price: K.ITEM('s32', 300),
      real_forever_price: K.ITEM('s32', 7500),
    }));
  }

  const versionObject = isForte
    ? {
      permitted_list: forte_permitted_list,
      music_list: await processData()
    }
    : {
      permitted_list,
      island_data_list: await processIslandData(),
      course_data_list: await processCourseData(),

      overwrite_music_list: K.ATTR({
        revision: '16706',
        release_code: '2019100200',
      }, {
        music_spec: music_spec,
      }),
    };
  send.object({
    ...versionObject,

    gamedata_flag_list: {
      event: {
        index: K.ITEM('s32', 0),
        status: K.ITEM('s8', 1),
        start_time: K.ITEM('u64', BigInt(0)),
        end_time: K.ITEM('u64', BigInt(0)),
        param1: K.ITEM('u64', BigInt(0)),
        param2: K.ITEM('u64', BigInt(0)),
      },
    },

    olupdate: {
      delete_flag: K.ITEM('bool', 0),
    },
  });
};
