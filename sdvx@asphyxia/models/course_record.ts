export interface CourseRecord {
  collection: 'course';

  sid: number;
  cid: number;
  score: number;
  clearType: number;
  grade: number;
  achieveRate: number;
  playCount: number;
}
