// prop's course mode: the course list, the player's results, and saving a course play.

import { PROP_COURSES } from "../../data/prop_courses";
import { playerByJid } from "../../handlers/player";
import { findVersionCourse, saveVersionCourse, versionCourses } from "../../handlers/version_data";
import { PROP, PropData, loadProp } from "./data";

const fix = (v: any, n: number, def: number): number[] => {
  const a = Array.isArray(v) ? v.slice(0, n) : [];
  while (a.length < n) a.push(def);
  return a;
};

const COURSE_RATING_FAILED = 1;

export const getCourse: EamusePluginRoute = async (info, data, send) => {
  const jid = $(data).number("data.player.jid");
  const player = jid ? await playerByJid(jid) : null;
  const results = player ? await versionCourses(player.__refid, PROP) : [];
  const p = player ? await loadProp(player.__refid) : null;
  const valid = new Set(PROP_COURSES.map(c => c.id));

  const course = PROP_COURSES.map(c => {
    const ids = [0, 0, 0], bronze = [0, 0, 0], silver = [0, 0, 0], gold = [0, 0, 0];
    c.norma.slice(0, 3).forEach((n, i) => { ids[i] = n[0]; bronze[i] = n[1]; silver[i] = n[2]; gold[i] = n[3]; });
    return {
      id: K.ITEM("s32", c.id),
      name: K.ITEM("str", c.name),
      level: K.ITEM("u8", c.level),
      norma: {
        norma_id: K.ARRAY("s32", ids),
        bronze_value: K.ARRAY("s32", bronze),
        silver_value: K.ARRAY("s32", silver),
        gold_value: K.ARRAY("s32", gold),
      },
      music_list: {
        music: c.music.map((m, i) => K.ATTR({ index: String(i) }, {
          music_id: K.ITEM("s32", m[0]),
          seq: K.ITEM("u8", m[1]),
        })),
      },
    };
  });

  return send.object({
    data: {
      course_list: { course },
      player_list: {
        player: {
          jid: K.ITEM("s32", jid | 0),
          result_list: {
            result: results.filter(r => valid.has(r.courseId)).map(r => ({
              id: K.ITEM("s32", r.courseId),
              rating: K.ITEM("u8", r.rating | 0),
              score: K.ARRAY("s32", fix(r.scores, 5, 0)),
            })),
          },
        },
      },
      last_course_id: K.ITEM("s32", p ? p.last.last_course_id : -1),
    },
  }, { compress: true });
};

/** Saves the `data.player.course` part of gameend.regist, keeping the best rating. */
export async function saveCourseResult(refid: string, d: KDataReader, p: PropData) {
  if (!d.element("data.player.course")) return;
  const courseId = d.number("data.player.course.course_id");
  if (courseId === undefined || courseId === null || isNaN(courseId)) return;
  const rawRating = d.number("data.player.course.rating");
  const rating = isNaN(rawRating) ? COURSE_RATING_FAILED : rawRating;
  const scores = [0, 0, 0, 0, 0];
  for (const m of d.elements("data.player.course.music") || []) {
    const idx = parseInt(m.attr("").index);
    if (!isNaN(idx) && idx >= 0 && idx < 5) scores[idx] = m.number("score") | 0;
  }
  const old = await findVersionCourse(refid, PROP, courseId);
  const sum = (a: number[]) => fix(a, 5, 0).reduce((x, y) => x + y, 0);
  if (!old || rating > (old.rating | 0) || (rating === (old.rating | 0) && sum(scores) > sum(old.scores))) {
    await saveVersionCourse(refid, PROP, courseId, Math.max(rating, old ? old.rating | 0 : 0), scores);
  }
  p.last.last_course_id = courseId;
}
