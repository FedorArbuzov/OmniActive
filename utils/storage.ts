import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  FIRST_LAUNCH: 'isFirstLaunch',
  IS_AUTHENTICATED: 'isAuthenticated',
  USER_TOKEN: 'userToken',
  LAST_TAB: 'lastTab',
  WORKOUTS: 'workouts',
  EXERCISE_RESULTS: 'exerciseResults',
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
 * Удаляет данные авторизации
 */
export async function clearAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
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
