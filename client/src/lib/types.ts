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

export type Unit = {
  id: string;
  subject_id: string;
  unit_number: number;
  name: string;
  created_at?: string;
};

export type Topic = {
  id: string;
  unit_id: string;
  name: string;
  completed: boolean;
  created_at?: string;
};
