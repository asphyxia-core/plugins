export interface CourseRecord {
  collection: 'course';

  version: number;

  sid: number;
  cid: number;
  score: number;
  clear: number;
  grade: number;
  rate: number;
  count: number;
}
