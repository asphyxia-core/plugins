export interface CourseResult {
  collection: "course_results";

  version: number;

  courseId: number;
  rating: number;
  scores: number[];
}
