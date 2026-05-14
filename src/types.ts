export type AttendanceStatus = 'present' | 'absent' | 'late' | 'justified';
export type ActivityType = 'individual' | 'team';
export type GradingMode = 'direct' | 'deliveries' | 'boolean';
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

export type MaterialVisibility = 'private' | 'publishable' | 'published';

export interface CourseMaterial {
  id: string;
  professor_id: string;
  group_id: string;
  activity_id?: string;
  title: string;
  description?: string;
  material_type: string;
  unit?: number;
  week?: number;
  suggested_date?: string;
  file_url?: string;
  file_path?: string;
  external_link?: string;
  private_notes?: string;
  visibility: MaterialVisibility;
  reusable: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionBank {
  id: string;
  professor_id: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  unit?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  question_type: 'multiple_choice' | 'true_false' | 'numeric' | 'short_answer';
  question_text: string;
  explanation?: string;
  points: number;
  estimated_time?: number; // in minutes
  options?: string[]; // for multiple_choice
  correct_answer?: string; // for multiple_choice and short_answer
  correct_boolean?: boolean; // for true_false
  correct_value?: number; // for numeric
  tolerance?: number; // for numeric
  accepted_answers?: string[]; // for short_answer normalization
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  professor_id: string;
  group_id: string;
  activity_id?: string; // Link to rubric/activity
  title: string;
  description?: string;
  unit?: number;
  open_date: string;
  close_date: string;
  time_limit?: number; // in minutes
  attempts_allowed: number;
  show_results: boolean;
  show_correct_answers: boolean;
  show_explanation: boolean; // New
  is_supervised: boolean; // New
  max_warnings?: number; // New
  status: 'draft' | 'published' | 'closed';
  is_practice: boolean;
  created_at: string;
}

export interface ExamSecurityEvent {
  id: string;
  exam_attempt_id: string;
  student_id: string;
  event_type: 'tab_blur' | 'window_blur' | 'fullscreen_exit' | 'copy' | 'paste' | 'right_click' | 'page_reload' | 'back_navigation' | 'visibility_hidden' | 'key_combo';
  user_agent: string;
  metadata?: any;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_id: string;
  order_index: number;
  custom_points?: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed';
}

export interface ExamAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text?: string;
  answer_boolean?: boolean;
  answer_numeric?: number;
  is_correct: boolean;
  points_earned: number;
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
