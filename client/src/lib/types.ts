export type User = {
  id: string;
  fullName: string;
  email: string;
  college?: string | null;
  course?: string | null;
  yearSemester?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  course_code?: string;
  difficulty: string;
  preparation_percent: number;
  exam_date?: string | null;
};
