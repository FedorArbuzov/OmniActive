import type {
    Dish,
    ExerciseResult,
    FoodLogEntry,
    RunActivityMode,
    StepsEntry,
    UserProfile,
    Workout,
    WorkoutSession,
} from './storage';

// Базовый URL API
// 
// Для локальной разработки:
// - iOS симулятор и веб: http://localhost:8000
// - Android эмулятор: http://10.0.2.2:8000
// - Физическое устройство: http://YOUR_LOCAL_IP:8000 (например http://192.168.1.100:8000)
//
// Для production установите EXPO_PUBLIC_API_URL в .env файле
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/** Когда true, путь передаётся как query-параметр path= (для Yandex Cloud Functions и др.) */
const USE_PATH_AS_QUERY =
  typeof API_BASE_URL === 'string' && API_BASE_URL.includes('functions.yandexcloud.net');

/**
 * Собирает URL запроса: при USE_PATH_AS_QUERY путь уходит в ?path=..., иначе как обычно.
 */
function buildRequestUrl(endpoint: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  if (!USE_PATH_AS_QUERY) {
    return `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }
  const [pathPart, searchPart] = endpoint.split('?');
  const path = pathPart.startsWith('/') ? pathPart : '/' + pathPart;
  const query = new URLSearchParams();
  query.set('path', path);
  if (searchPart) {
    for (const pair of searchPart.split('&')) {
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const k = decodeURIComponent(pair.slice(0, eq));
      const v = decodeURIComponent(pair.slice(eq + 1));
      if (k) query.set(k, v);
    }
  }
  return `${base}?${query.toString()}`;
}

/**
 * Получает токен авторизации из хранилища
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return await AsyncStorage.default.getItem('userToken');
  } catch {
    return null;
  }
}

/**
 * Выполняет HTTP запрос к API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const url = buildRequestUrl(endpoint);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    // Yandex Cloud возвращает 403 на запросы с заголовком Authorization — передаём токен в кастомном заголовке
    if (USE_PATH_AS_QUERY) {
      headers['X-Access-Token'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// ==================== АВТОРИЗАЦИЯ ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  referral_code?: string; // Опциональный реферальный код
}

/**
 * Вход в систему
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Регистрация нового пользователя
 */
export async function register(data: RegisterRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ReferralCodeResponse {
  referral_code: string;
}

export interface ReferralUser {
  id: string;
  email: string;
  created_at: string;
}

export interface ReferralsListResponse {
  referrals: ReferralUser[];
  total_count: number;
}

export interface UserMeResponse {
  created_at: string;
}

/**
 * Получить информацию о текущем пользователе (дата регистрации)
 */
export async function getMe(): Promise<UserMeResponse> {
  return apiRequest<UserMeResponse>('/auth/me');
}

/**
 * Получить свой реферальный код
 */
export async function getMyReferralCode(): Promise<ReferralCodeResponse> {
  return apiRequest<ReferralCodeResponse>('/auth/my-referral-code');
}

/**
 * Получить список пользователей, которых пригласил текущий пользователь
 */
export async function getMyReferrals(): Promise<ReferralsListResponse> {
  return apiRequest<ReferralsListResponse>('/auth/my-referrals');
}

// ==================== ТРЕНИРОВКИ ====================

/**
 * Получает все тренировки пользователя
 */
export async function getWorkouts(category?: string): Promise<Workout[]> {
  const endpoint = category ? `/workouts?category=${category}` : '/workouts';
  return apiRequest<Workout[]>(endpoint);
}

/**
 * Получает тренировку по ID
 */
export async function getWorkoutById(workoutId: string): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/${workoutId}`);
}

/**
 * Создает или обновляет тренировку
 */
export async function saveWorkout(workout: Workout): Promise<Workout> {
  return apiRequest<Workout>(`/workouts/${workout.id}`, {
    method: 'PUT',
    body: JSON.stringify(workout),
  });
}

/**
 * Удаляет тренировку
 */
export async function deleteWorkout(workoutId: string): Promise<void> {
  return apiRequest<void>(`/workouts/${workoutId}`, {
    method: 'DELETE',
  });
}

// ==================== РЕЗУЛЬТАТЫ УПРАЖНЕНИЙ ====================

/**
 * Сохраняет результат упражнения
 */
export async function saveExerciseResult(result: ExerciseResult): Promise<ExerciseResult> {
  return apiRequest<ExerciseResult>('/exercise-results', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}

/**
 * Получает результаты упражнения
 */
export async function getExerciseResults(exerciseId: string): Promise<ExerciseResult[]> {
  return apiRequest<ExerciseResult[]>(`/exercise-results?exercise_id=${encodeURIComponent(exerciseId)}`);
}

/**
 * Получает все результаты упражнений пользователя
 */
export async function getAllExerciseResults(): Promise<ExerciseResult[]> {
  return apiRequest<ExerciseResult[]>('/exercise-results');
}

/** Сводка по упражнению: всего повторений/единиц и количество записей */
export interface ExerciseStatsItem {
  exerciseId: string;
  exerciseName: string;
  totalReps: number;
  sessionsCount: number;
}

/**
 * Статистика по всем упражнениям (сумма повторений и число записей по каждому)
 */
export async function getExerciseStats(): Promise<ExerciseStatsItem[]> {
  return apiRequest<ExerciseStatsItem[]>('/exercise-results/stats');
}

// ==================== БЛЮДА ====================

/**
 * Получает все блюда пользователя
 */
export async function getAllDishes(): Promise<Dish[]> {
  return apiRequest<Dish[]>('/dishes');
}

/**
 * Получает блюдо по ID
 */
export async function getDishById(dishId: string): Promise<Dish> {
  return apiRequest<Dish>(`/dishes/${dishId}`);
}

/**
 * Создает или обновляет блюдо
 */
export async function saveDish(dish: Dish): Promise<Dish> {
  return apiRequest<Dish>(`/dishes/${dish.id}`, {
    method: 'PUT',
    body: JSON.stringify(dish),
  });
}

/**
 * Удаляет блюдо
 */
export async function deleteDish(dishId: string): Promise<void> {
  return apiRequest<void>(`/dishes/${dishId}`, {
    method: 'DELETE',
  });
}

// ==================== ДНЕВНИК ПИТАНИЯ ====================

/**
 * Добавляет запись в дневник питания
 */
export async function addFoodLogEntry(entry: Omit<FoodLogEntry, 'id'>): Promise<FoodLogEntry> {
  return apiRequest<FoodLogEntry>('/food-log', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

/**
 * Получает записи дневника питания
 */
export async function getFoodLog(limit?: number): Promise<FoodLogEntry[]> {
  const endpoint = limit ? `/food-log?limit=${limit}` : '/food-log';
  return apiRequest<FoodLogEntry[]>(endpoint);
}

/**
 * Получает записи дневника питания за указанную дату
 */
export async function getFoodLogEntriesForDate(dateKey: string): Promise<FoodLogEntry[]> {
  return apiRequest<FoodLogEntry[]>(`/food-log?date=${dateKey}`);
}

/**
 * Удаляет запись из дневника питания
 */
export async function deleteFoodLogEntry(entryId: string): Promise<void> {
  return apiRequest<void>(`/food-log/${entryId}`, {
    method: 'DELETE',
  });
}

// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================

/**
 * Получает профиль пользователя
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/profile');
}

/**
 * Обновляет профиль пользователя
 */
export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  return apiRequest<UserProfile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// ==================== ШАГИ ====================

/**
 * Сохраняет количество шагов за день
 */
export async function saveStepsEntry(date: string, steps: number): Promise<StepsEntry> {
  return apiRequest<StepsEntry>('/steps', {
    method: 'POST',
    body: JSON.stringify({ date: date.slice(0, 10), steps }),
  });
}

/**
 * Получает количество шагов за указанную дату
 */
export async function getStepsForDate(date: string): Promise<number | null> {
  const dateKey = date.slice(0, 10);
  const entry = await apiRequest<StepsEntry | null>(`/steps?date=${dateKey}`);
  return entry?.steps ?? null;
}

/**
 * Получает все записи шагов
 */
export async function getStepsLog(limit?: number): Promise<StepsEntry[]> {
  const endpoint = limit ? `/steps?limit=${limit}` : '/steps';
  return apiRequest<StepsEntry[]>(endpoint);
}

// ==================== СЕССИИ ТРЕНИРОВОК ====================

/**
 * Сохраняет сессию тренировки
 */
export async function saveWorkoutSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
  return apiRequest<WorkoutSession>('/workout-sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

/**
 * Получает все сессии тренировок
 */
export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  return apiRequest<WorkoutSession[]>('/workout-sessions');
}

/**
 * Получает сессии тренировок за указанную дату
 */
export async function getWorkoutSessionsForDate(dateKey: string): Promise<WorkoutSession[]> {
  return apiRequest<WorkoutSession[]>(`/workout-sessions?date=${dateKey}`);
}

// ==================== НАСТРОЙКИ АКТИВНОСТИ ====================

/**
 * Получает режим учёта активности
 */
export async function getRunActivityMode(): Promise<RunActivityMode | null> {
  return apiRequest<RunActivityMode | null>('/activity-settings/mode');
}

/**
 * Сохраняет режим учёта активности
 */
export async function setRunActivityMode(mode: RunActivityMode): Promise<void> {
  return apiRequest<void>('/activity-settings/mode', {
    method: 'PUT',
    body: JSON.stringify({ mode }),
  });
}

/**
 * Получает фиксированный коэффициент PAL
 */
export async function getRunFixedPal(): Promise<number | null> {
  return apiRequest<number | null>('/activity-settings/fixed-pal');
}

// ==================== ДОСТИЖЕНИЯ ====================

export interface AchievementItem {
  id: string;
  name: string;
  type: string;
  target: number;
  achieved: boolean;
  achieved_at: string | null;
  push_notified: boolean;
}

/**
 * Получить все достижения с отметкой achieved
 */
export async function getAchievements(): Promise<AchievementItem[]> {
  return apiRequest<AchievementItem[]>('/achievements');
}

export interface CheckAchievementsResponse {
  newly_awarded: { id: string; name: string; achieved_at: string }[];
}

/**
 * Проверить и выдать новые достижения. Возвращает только что полученные.
 */
export async function checkAchievements(): Promise<CheckAchievementsResponse> {
  return apiRequest<CheckAchievementsResponse>('/achievements/check', {
    method: 'POST',
  });
}

/**
 * Отметить, что пуш по достижению отправлен
 */
export async function markAchievementPushNotified(achievementId: string): Promise<void> {
  return apiRequest<void>(`/achievements/${encodeURIComponent(achievementId)}/push-notified`, {
    method: 'PATCH',
  });
}

// ==================== ПОЛЬЗОВАТЕЛЬСКИЕ ПЛАНЫ ТРЕНИРОВОК ====================

export interface PlanSlot {
  dayOfWeek: number;
  time: string;
  workoutId: string;
  workoutName: string;
}

export interface CustomWorkoutPlan {
  id: string;
  title: string;
  description: string | null;
  schedule: PlanSlot[];
  is_public: boolean;
  code: string;
  created_at: string;
}

/**
 * Получить все планы тренировок пользователя
 */
export async function getCustomWorkoutPlans(): Promise<CustomWorkoutPlan[]> {
  return apiRequest<CustomWorkoutPlan[]>('/custom-workout-plans');
}

/**
 * Получить все публичные планы тренировок
 */
export async function getPublicWorkoutPlans(): Promise<CustomWorkoutPlan[]> {
  return apiRequest<CustomWorkoutPlan[]>('/custom-workout-plans/public');
}

/**
 * Получить публичный план по ID
 */
export async function getPublicWorkoutPlanById(planId: string): Promise<CustomWorkoutPlan> {
  return apiRequest<CustomWorkoutPlan>(`/custom-workout-plans/public/${encodeURIComponent(planId)}`);
}

/**
 * Получить план по коду (приватные планы, без авторизации)
 */
export async function getCustomWorkoutPlanByCode(code: string): Promise<CustomWorkoutPlan> {
  return apiRequest<CustomWorkoutPlan>(`/custom-workout-plans/by-code/${encodeURIComponent(code.trim().toUpperCase())}`);
}

/**
 * Получить план по ID
 */
export async function getCustomWorkoutPlanById(planId: string): Promise<CustomWorkoutPlan> {
  return apiRequest<CustomWorkoutPlan>(`/custom-workout-plans/${planId}`);
}

/**
 * Создать план тренировок
 */
export async function createCustomWorkoutPlan(data: {
  title: string;
  description?: string;
  schedule: PlanSlot[];
  is_public?: boolean;
}): Promise<CustomWorkoutPlan> {
  return apiRequest<CustomWorkoutPlan>('/custom-workout-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Обновить план тренировок
 */
export async function updateCustomWorkoutPlan(
  planId: string,
  data: { title: string; description?: string; schedule: PlanSlot[]; is_public?: boolean }
): Promise<CustomWorkoutPlan> {
  return apiRequest<CustomWorkoutPlan>(`/custom-workout-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Удалить план тренировок
 */
export async function deleteCustomWorkoutPlan(planId: string): Promise<void> {
  return apiRequest<void>(`/custom-workout-plans/${planId}`, {
    method: 'DELETE',
  });
}

/**
 * Записаться на план (enroll)
 */
export async function enrollPlan(planId: string): Promise<{ id: string; plan_id: string; enrolled_at: string }> {
  return apiRequest(`/custom-workout-plans/${encodeURIComponent(planId)}/enroll`, {
    method: 'POST',
  });
}

/**
 * Отписаться от плана (unenroll)
 */
export async function unenrollPlan(planId: string): Promise<void> {
  return apiRequest<void>(`/custom-workout-plans/${encodeURIComponent(planId)}/enroll`, {
    method: 'DELETE',
  });
}

/**
 * Получить планы, на которые записан пользователь
 */
export async function getEnrolledPlans(): Promise<CustomWorkoutPlan[]> {
  return apiRequest<CustomWorkoutPlan[]>('/custom-workout-plans/enrolled');
}

/**
 * Сохраняет фиксированный коэффициент PAL
 */
export async function setRunFixedPal(pal: number): Promise<void> {
  return apiRequest<void>('/activity-settings/fixed-pal', {
    method: 'PUT',
    body: JSON.stringify({ pal }),
  });
}

/**
 * Получает лог ежедневной активности
 */
export async function getRunDailyActivityLog(): Promise<Record<string, number>> {
  return apiRequest<Record<string, number>>('/activity-settings/daily-log');
}

/**
 * Сохраняет коэффициент PAL за дату
 */
export async function setRunDailyActivityForDate(dateKey: string, pal: number): Promise<void> {
  return apiRequest<void>('/activity-settings/daily-log', {
    method: 'POST',
    body: JSON.stringify({ date: dateKey.slice(0, 10), pal }),
  });
}

/**
 * Получает коэффициент PAL за дату (или вчерашний, если за день нет)
 */
export async function getRunDailyPalForDate(dateKey: string): Promise<number | null> {
  return apiRequest<number | null>(`/activity-settings/daily-pal?date=${dateKey.slice(0, 10)}`);
}
