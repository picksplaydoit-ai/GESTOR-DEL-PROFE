export type AttendanceStatus = 'present' | 'absent' | 'late' | 'justified';
export type ActivityType = 'individual' | 'team';
export type GradingMode = 'direct' | 'deliveries';
export type SubmissionStatus = 'delivered' | 'not_delivered' | 'late';

export interface Group {
  id: string;
  name: string;
  subject: string;
  school_year: string;
  period: string;
  professor_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  student_public_id: string;
  first_name: string;
  last_name: string;
  enrollment_id: string;
  email?: string;
  group_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Rubric {
  id: string;
  group_id: string;
  min_grade: number;
  min_attendance: number;
}

export interface RubricCriterion {
  id: string;
  rubric_id: string;
  name: string;
  weight: number;
  description?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  group_id: string;
  criterion_id: string;
  type: ActivityType;
  grading_mode: GradingMode;
  total_deliveries: number;
  due_date: string;
  status: 'active' | 'closed';
}

export interface Submission {
  id: string;
  activity_id: string;
  student_id: string;
  grade: number;
  deliveries_count: number;
  status: SubmissionStatus;
  comments?: string;
  updated_at: string;
}
