/**
 * Данные и логика подбора планов тренировок
 */

export type Goal = 'strength' | 'muscle' | 'endurance' | 'weight_loss';
export type Location = 'home' | 'gym';
export type Gender = 'male' | 'female' | 'other';

export const GOALS: { id: Goal; label: string; short: string }[] = [
  { id: 'strength', label: 'Набрать силу', short: 'Сила' },
  { id: 'muscle', label: 'Набрать мышечную массу', short: 'Масса' },
  { id: 'endurance', label: 'Повысить выносливость', short: 'Выносливость' },
  { id: 'weight_loss', label: 'Похудеть / подсушиться', short: 'Похудение' },
];

export const LOCATIONS: { id: Location; label: string }[] = [
  { id: 'home', label: 'Дома' },
  { id: 'gym', label: 'В зале' },
];

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Мужской' },
  { id: 'female', label: 'Женский' },
  { id: 'other', label: 'Другое' },
];

export type WorkoutPlan = {
  id: string;
  name: string;
  description: string;
  goals: Goal[];
  location: Location[];
  durationWeeks?: number;
  daysPerWeek: number;
  /** Что входит в план — для экрана детали */
  highlights?: string[];
};

export const WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: 'fullbody_beginner',
    name: 'Full Body для начинающих',
    description: 'Тренировка всего тела 2–3 раза в неделю. Подходит тем, кто только начинает. Базовые упражнения с собственным весом.',
    goals: ['strength', 'muscle'],
    location: ['home', 'gym'],
    durationWeeks: 8,
    daysPerWeek: 3,
    highlights: ['Тренировка всего тела', 'Базовые упражнения с собственным весом', 'Постепенное увеличение нагрузки', 'Подходит новичкам'],
  },
  {
    id: '5x5_strength',
    name: '5×5 — на силу',
    description: 'Классическая программа для роста силы. 5 подходов по 5 повторений в базовых упражнениях: присед, жим лёжа, становая тяга.',
    goals: ['strength'],
    location: ['gym'],
    durationWeeks: 12,
    daysPerWeek: 3,
  },
  {
    id: 'home_bodyweight',
    name: 'Домашняя программа с собственным весом',
    description: 'Отжимания, приседания, планка, выпады — без оборудования. Идеально для занятий дома.',
    goals: ['strength', 'endurance', 'weight_loss'],
    location: ['home'],
    durationWeeks: 6,
    daysPerWeek: 4,
    highlights: ['Отжимания', 'Приседания', 'Планка', 'Выпады', 'Без оборудования', 'Идеально для дома'],
  },
  {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    description: 'Разделение на жимовые, тяговые и ноги. 3–6 тренировок в неделю. Подходит для набора массы в зале.',
    goals: ['muscle'],
    location: ['gym'],
    durationWeeks: 8,
    daysPerWeek: 4,
  },
  {
    id: 'cardio_hiit',
    name: 'HIIT и выносливость',
    description: 'Интервальные тренировки для развития выносливости и ускорения метаболизма. Подходит для похудения.',
    goals: ['endurance', 'weight_loss'],
    location: ['home', 'gym'],
    durationWeeks: 6,
    daysPerWeek: 4,
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower — верх и низ',
    description: 'Чередование тренировок верха и низа тела. 4 дня в неделю. Баланс силы и массы.',
    goals: ['strength', 'muscle'],
    location: ['gym'],
    durationWeeks: 8,
    daysPerWeek: 4,
  },
  {
    id: 'home_fatburn',
    name: 'Домашнее жиросжигание',
    description: 'Круговые тренировки и кардио дома. Минимум оборудования, максимум эффективности для похудения.',
    goals: ['weight_loss', 'endurance'],
    location: ['home'],
    durationWeeks: 6,
    daysPerWeek: 5,
  },
  {
    id: '531_simple',
    name: '5/3/1 — программа для силы',
    description: 'Периодизированная программа с рабочими весами в процентах от максимума. 4 тренировки в неделю.',
    goals: ['strength'],
    location: ['gym'],
    durationWeeks: 12,
    daysPerWeek: 4,
  },
];

export type PlanSelectionData = {
  goals: Goal[];
  location: Location;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  age: number;
};

export function getPlanById(planId: string): WorkoutPlan | undefined {
  return WORKOUT_PLANS.find((p) => p.id === planId);
}

export function filterPlansBySelection(data: PlanSelectionData): WorkoutPlan[] {
  return WORKOUT_PLANS.filter(
    (plan) =>
      plan.location.includes(data.location) &&
      plan.goals.some((g) => data.goals.includes(g))
  );
}
