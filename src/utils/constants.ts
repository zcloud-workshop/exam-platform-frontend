import { Role, QuestionType } from '@/types/enums';
import i18n from '@/locales';

export const ROLE_LABELS: Record<Role, string> = {
  [Role.super_admin]: () => i18n.t('roles.super_admin'),
  [Role.question_admin]: () => i18n.t('roles.question_admin'),
  [Role.teacher]: () => i18n.t('roles.teacher'),
  [Role.student]: () => i18n.t('roles.student'),
} as unknown as Record<Role, string>;

export function getRoleLabel(role: Role): string {
  return i18n.t(`roles.${role}`);
}

export function getQuestionTypeLabel(type: QuestionType): string {
  return i18n.t(`questionTypes.${type}`);
}

export function getDifficultyLabel(level: number): string {
  return i18n.t(`difficulty.${level}`);
}

export const QUESTION_TYPE_OPTIONS = Object.values(QuestionType).map((v) => ({
  value: v,
  get label() { return getQuestionTypeLabel(v); },
}));

export const DIFFICULTY_OPTIONS = [1, 2, 3, 4, 5].map((v) => ({
  value: v,
  get label() { return getDifficultyLabel(v); },
}));
