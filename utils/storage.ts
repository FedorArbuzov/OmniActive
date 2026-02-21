import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  FIRST_LAUNCH: 'isFirstLaunch',
  IS_AUTHENTICATED: 'isAuthenticated',
  USER_TOKEN: 'userToken',
  USER_EMAIL: 'userEmail',
  LAST_TAB: 'lastTab',
  WORKOUTS: 'workouts',
  EXERCISE_RESULTS: 'exerciseResults',
  DISHES: 'dishes',
  FOOD_LOG: 'foodLog',
  USER_PROFILE: 'userProfile',
  STEPS_LOG: 'stepsLog',
  WORKOUT_SESSIONS: 'workoutSessions',
  RUN_ACTIVITY_MODE: 'runActivityMode',
  RUN_FIXED_PAL: 'runFixedPal',
  RUN_DAILY_ACTIVITY: 'runDailyActivity',
  ACTIVE_PLAN_TEMPLATE: 'activePlanTemplate',
} as const;

export type WorkoutType = 'strength' | 'basketball' | 'hockey';

export interface Exercise {
  id: string;
  name: string;
}

export interface Workout {
  id: string;
  name: string;
  category: 'index' | 'basketball' | 'football' | 'hockey';
  type: WorkoutType; // Тип тренировки
  exercises: Exercise[];
  createdAt: string;
}

export interface ExerciseResult {
  id: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  workoutId?: string;
  sessionId?: string; // ID сессии тренировки
  // Для силовых тренировок
  weight?: number;
  reps?: number;
  // Для баскетбола и хоккея
  hits?: number; // Попадания
  misses?: number; // Промахи
}

export interface Dish {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  createdAt?: string;
}

export interface FoodLogEntry {
  id: string;
  dishId: string;
  dishName: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  date: string;
}

/** Запись шагов за день */
export interface StepsEntry {
  id: string;
  date: string; // YYYY-MM-DD
  steps: number;
}

/** Сессия завершённой тренировки (для расчёта калорий по MET) */
export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  workoutId: string;
  workoutName?: string;
  workoutType: WorkoutType;
  durationSeconds: number;
}

/** Данные профиля для расчёта калорий (рост, вес, возраст) */
export interface UserProfile {
  heightCm: number | null;
  weightKg: number | null;
  ageYears: number | null;
}

/**
 * Проверяет, был ли это первый запуск приложения
 */
export async function isFirstLaunch(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
    return value === null;
  } catch (error) {
    console.error('Ошибка при проверке первого запуска:', error);
    return true; // В случае ошибки считаем первым запуском
  }
}

/**
 * Отмечает, что первый запуск завершен
 */
export async function setFirstLaunchComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
  } catch (error) {
    console.error('Ошибка при сохранении флага первого запуска:', error);
  }
}

/**
 * Проверяет, авторизован ли пользователь
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    return !!token;
  } catch (error) {
    console.error('Ошибка при проверке авторизации:', error);
    return false;
  }
}

/**
 * Сохраняет токен пользователя
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error);
  }
}

/**
 * Сохраняет email пользователя (при входе)
 */
export async function saveUserEmail(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
  } catch (error) {
    console.error('Ошибка при сохранении email:', error);
  }
}

/**
 * Возвращает сохранённый email или null
 */
export async function getSavedEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  } catch (error) {
    console.error('Ошибка при получении email:', error);
    return null;
  }
}

/**
 * Удаляет данные авторизации
 */
export async function clearAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  } catch (error) {
    console.error('Ошибка при очистке авторизации:', error);
  }
}

/**
 * Сохраняет последний открытый таб
 */
export async function saveLastTab(tabName: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_TAB, tabName);
  } catch (error) {
    console.error('Ошибка при сохранении последнего таба:', error);
  }
}

/**
 * Получает последний открытый таб
 */
export async function getLastTab(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_TAB);
  } catch (error) {
    console.error('Ошибка при получении последнего таба:', error);
    return null;
  }
}

/**
 * Получает все тренировки для категории
 */
export async function getWorkouts(category: string): Promise<Workout[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
    if (!data) return [];
    const allWorkouts: Workout[] = JSON.parse(data);
    return allWorkouts.filter(w => w.category === category);
  } catch (error) {
    console.error('Ошибка при получении тренировок:', error);
    return [];
  }
}

/**
 * Получает все тренировки
 */
export async function getAllWorkouts(): Promise<Workout[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при получении всех тренировок:', error);
    return [];
  }
}

/**
 * Сохраняет тренировку
 */
export async function saveWorkout(workout: Workout): Promise<void> {
  try {
    const allWorkouts = await getAllWorkouts();
    const existingIndex = allWorkouts.findIndex(w => w.id === workout.id);
    
    if (existingIndex >= 0) {
      allWorkouts[existingIndex] = workout;
    } else {
      allWorkouts.push(workout);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(allWorkouts));
  } catch (error) {
    console.error('Ошибка при сохранении тренировки:', error);
  }
}

/**
 * Удаляет тренировку
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  try {
    const allWorkouts = await getAllWorkouts();
    const filtered = allWorkouts.filter(w => w.id !== workoutId);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Ошибка при удалении тренировки:', error);
  }
}

/**
 * Сохраняет результат упражнения
 */
export async function saveExerciseResult(result: ExerciseResult): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISE_RESULTS);
    const allResults: ExerciseResult[] = data ? JSON.parse(data) : [];
    
    const newResult: ExerciseResult = {
      ...result,
      id: result.id || Date.now().toString(),
      date: result.date || new Date().toISOString(),
    };
    
    allResults.push(newResult);
    await AsyncStorage.setItem(STORAGE_KEYS.EXERCISE_RESULTS, JSON.stringify(allResults));
  } catch (error) {
    console.error('Ошибка при сохранении результата упражнения:', error);
  }
}

/**
 * Получает результаты упражнения
 */
export async function getExerciseResults(exerciseId: string): Promise<ExerciseResult[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISE_RESULTS);
    if (!data) return [];
    const allResults: ExerciseResult[] = JSON.parse(data);
    return allResults
      .filter(r => r.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Ошибка при получении результатов упражнения:', error);
    return [];
  }
}

/** Сводка по упражнению для отображения на главной */
export interface ExerciseStatsItem {
  exerciseId: string;
  exerciseName: string;
  totalReps: number;
  sessionsCount: number;
}

/**
 * Статистика по всем упражнениям из локального хранилища (сумма повторений и число записей)
 */
export async function getExerciseStatsFromStorage(): Promise<ExerciseStatsItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISE_RESULTS);
    const allResults: ExerciseResult[] = data ? JSON.parse(data) : [];
    const byExercise = new Map<string, { name: string; totalReps: number; count: number }>();
    for (const r of allResults) {
      const cur = byExercise.get(r.exerciseId) ?? { name: r.exerciseName, totalReps: 0, count: 0 };
      cur.totalReps += r.reps ?? 0;
      cur.count += 1;
      byExercise.set(r.exerciseId, cur);
    }
    return Array.from(byExercise.entries()).map(([exerciseId, v]) => ({
      exerciseId,
      exerciseName: v.name,
      totalReps: v.totalReps,
      sessionsCount: v.count,
    }));
  } catch (error) {
    console.error('Ошибка при получении статистики упражнений:', error);
    return [];
  }
}

/**
 * Получает все блюда
 */
export async function getAllDishes(): Promise<Dish[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DISHES);
    if (!data) return [];
    const list: Dish[] = JSON.parse(data);
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    console.error('Ошибка при получении блюд:', error);
    return [];
  }
}

/**
 * Сохраняет блюдо (создание или обновление)
 */
export async function saveDish(dish: Dish): Promise<void> {
  try {
    const all = await getAllDishes();
    const existingIndex = all.findIndex(d => d.id === dish.id);
    const toSave: Dish = {
      ...dish,
      createdAt: dish.createdAt || new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      all[existingIndex] = toSave;
    } else {
      all.unshift(toSave);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(all));
  } catch (error) {
    console.error('Ошибка при сохранении блюда:', error);
  }
}

/**
 * Получает блюдо по ID
 */
export async function getDishById(id: string): Promise<Dish | null> {
  const all = await getAllDishes();
  return all.find(d => d.id === id) || null;
}

/**
 * Добавляет запись в дневник питания
 */
export async function addFoodLogEntry(entry: Omit<FoodLogEntry, 'id'>): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FOOD_LOG);
    const list: FoodLogEntry[] = data ? JSON.parse(data) : [];
    const newEntry: FoodLogEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    list.unshift(newEntry);
    await AsyncStorage.setItem(STORAGE_KEYS.FOOD_LOG, JSON.stringify(list));
  } catch (error) {
    console.error('Ошибка при добавлении записи в дневник:', error);
  }
}

/**
 * Получает записи дневника питания (последние сверху)
 */
export async function getFoodLog(limit?: number): Promise<FoodLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FOOD_LOG);
    if (!data) return [];
    const list: FoodLogEntry[] = JSON.parse(data);
    return limit ? list.slice(0, limit) : list;
  } catch (error) {
    console.error('Ошибка при получении дневника питания:', error);
    return [];
  }
}

/**
 * Получает записи дневника за указанную дату (YYYY-MM-DD)
 */
export async function getFoodLogEntriesForDate(dateKey: string): Promise<FoodLogEntry[]> {
  const list = await getFoodLog();
  const key = dateKey.slice(0, 10);
  return list.filter((e) => e.date.slice(0, 10) === key);
}

/**
 * Получает профиль пользователя (рост, вес, возраст)
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!data) return { heightCm: null, weightKg: null, ageYears: null };
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    return { heightCm: null, weightKg: null, ageYears: null };
  }
}

/**
 * Сохраняет профиль пользователя (рост, вес, возраст)
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Ошибка при сохранении профиля:', error);
  }
}

/**
 * Сохраняет или обновляет количество шагов за день
 */
export async function saveStepsEntry(date: string, steps: number): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_LOG);
    const list: StepsEntry[] = data ? JSON.parse(data) : [];
    const dateKey = date.slice(0, 10);
    const idx = list.findIndex((e) => e.date === dateKey);
    const entry: StepsEntry = {
      id: Date.now().toString(),
      date: dateKey,
      steps,
    };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    list.sort((a, b) => b.date.localeCompare(a.date));
    await AsyncStorage.setItem(STORAGE_KEYS.STEPS_LOG, JSON.stringify(list));
  } catch (error) {
    console.error('Ошибка при сохранении шагов:', error);
  }
}

/**
 * Получает количество шагов за указанную дату
 */
export async function getStepsForDate(date: string): Promise<number | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_LOG);
    if (!data) return null;
    const list: StepsEntry[] = JSON.parse(data);
    const dateKey = date.slice(0, 10);
    const entry = list.find((e) => e.date === dateKey);
    return entry ? entry.steps : null;
  } catch (error) {
    console.error('Ошибка при получении шагов:', error);
    return null;
  }
}

/**
 * Получает все записи шагов (последние сверху)
 */
export async function getStepsLog(limit?: number): Promise<StepsEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STEPS_LOG);
    if (!data) return [];
    const list: StepsEntry[] = JSON.parse(data);
    return limit ? list.slice(0, limit) : list;
  } catch (error) {
    console.error('Ошибка при получении журнала шагов:', error);
    return [];
  }
}

/**
 * Сохраняет сессию завершённой тренировки (для расчёта калорий по MET)
 */
export async function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS);
    const list: WorkoutSession[] = data ? JSON.parse(data) : [];
    const newSession: WorkoutSession = {
      ...session,
      id: session.date + '_' + Date.now(),
      date: session.date.slice(0, 10),
    };
    list.unshift(newSession);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_SESSIONS, JSON.stringify(list));
  } catch (error) {
    console.error('Ошибка при сохранении сессии тренировки:', error);
  }
}

/**
 * Получает все сессии тренировок (последние сверху)
 */
export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_SESSIONS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при получении сессий тренировок:', error);
    return [];
  }
}

/** Режим учёта активности на экране «Активность» */
export type RunActivityMode = 'fixed' | 'daily' | 'steps_workouts';

export async function getRunActivityMode(): Promise<RunActivityMode | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.RUN_ACTIVITY_MODE);
    if (v === 'fixed' || v === 'daily' || v === 'steps_workouts') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setRunActivityMode(mode: RunActivityMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.RUN_ACTIVITY_MODE, mode);
}

export async function getRunFixedPal(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEYS.RUN_FIXED_PAL);
    if (v == null) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 1 && n <= 2.5 ? n : null;
  } catch {
    return null;
  }
}

export async function setRunFixedPal(pal: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.RUN_FIXED_PAL, String(pal));
}

/** Лог: дата (YYYY-MM-DD) → коэффициент активности (PAL) */
export async function getRunDailyActivityLog(): Promise<Record<string, number>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RUN_DAILY_ACTIVITY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function setRunDailyActivityForDate(dateKey: string, pal: number): Promise<void> {
  const key = dateKey.slice(0, 10);
  const log = await getRunDailyActivityLog();
  log[key] = pal;
  await AsyncStorage.setItem(STORAGE_KEYS.RUN_DAILY_ACTIVITY, JSON.stringify(log));
}

/** PAL за дату; если за день нет — возвращает вчерашний */
export async function getRunDailyPalForDate(dateKey: string): Promise<number | null> {
  const log = await getRunDailyActivityLog();
  const key = dateKey.slice(0, 10);
  if (log[key] != null) return log[key];
  return log[getYesterdayKey(key)] ?? null;
}

/** Возвращает ключ вчерашней даты (YYYY-MM-DD) */
export function getYesterdayKey(dateKey: string): string {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
}

/** Шаблон плана тренировок (выбранный пользователем) */
export interface ActivePlanTemplate {
  id: string;
  name: string;
  description: string;
  durationWeeks?: number;
  daysPerWeek: number;
  highlights?: string[];
}

export async function saveActivePlanTemplate(plan: ActivePlanTemplate): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN_TEMPLATE, JSON.stringify(plan));
  } catch (error) {
    console.error('Ошибка при сохранении выбранного плана:', error);
  }
}

export async function getActivePlanTemplate(): Promise<ActivePlanTemplate | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN_TEMPLATE);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при получении выбранного плана:', error);
    return null;
  }
}
