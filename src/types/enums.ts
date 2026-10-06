export enum Role {
  super_admin = 'super_admin',
  question_admin = 'question_admin',
  teacher = 'teacher',
  student = 'student',
}

export enum QuestionType {
  single = 'single',
  multiple = 'multiple',
  true_false = 'true_false',
  fill = 'fill',
  short = 'short',
  program = 'program',
}

export enum RecordStatus {
  draft = 'draft',
  submitted = 'submitted',
}

export enum BankShareRole {
  viewer = 'viewer',
  editor = 'editor',
  exam_manager = 'exam_manager',
}
