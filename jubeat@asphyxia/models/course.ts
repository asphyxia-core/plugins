export interface Course {
    collection: "course";
  
    courseId: number;
    seen: boolean,
    played: boolean,
    cleared: boolean
  }