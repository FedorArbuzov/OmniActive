import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as api from '@/utils/api';
import {
    getFoodLog,
    getRunActivityMode,
    getRunDailyActivityLog,
    getRunFixedPal,
    getStepsLog,
    getUserProfile,
    getWorkoutSessions,
    getYesterdayKey,
    type FoodLogEntry,
    type RunActivityMode,
    type StepsEntry,
    type UserProfile,
    type WorkoutSession,
    type WorkoutType,
} from '@/utils/storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** Возвращает дату в формате YYYY-MM-DD (локальное время) */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Суммирует калории по датам из записей дневника */
function aggregateCaloriesByDate(entries: FoodLogEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 10);
    map[key] = (map[key] || 0) + e.calories;
  }
  return map;
}

/** Агрегирует шаги по датам (последняя запись для даты — она может перезаписываться) */
function aggregateStepsByDate(entries: StepsEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const key = e.date.slice(0, 10);
    map[key] = e.steps;
  }
  return map;
}

/** BMR по формуле Миффлина–Сан Жеора (мужской вариант, рост см, вес кг, возраст лет) */
function calculateBMR(profile: UserProfile): number {
  const { heightCm, weightKg, ageYears } = profile;
  if (heightCm == null || weightKg == null || ageYears == null) return 0;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
}

/** ~0.04 ккал на шаг для средней массы тела */
const KCAL_PER_STEP = 0.04;

/** MET (метаболический эквивалент) по типу тренировки для расчёта калорий */
const MET_BY_WORKOUT_TYPE: Record<WorkoutType, number> = {
  strength: 3.5,
  basketball: 6.5,
  hockey: 8,
};

/** Калории за одну сессию: MET × вес (кг) × время (часы) */
function getWorkoutSessionCalories(
  weightKg: number,
  durationSeconds: number,
  workoutType: WorkoutType
): number {
  const met = MET_BY_WORKOUT_TYPE[workoutType] ?? 3.5;
  const hours = durationSeconds / 3600;
  return Math.round(met * weightKg * hours);
}

/** Сумма калорий по сессиям тренировок по датам (для расчёта нужен вес) */
function aggregateWorkoutCaloriesByDate(
  sessions: WorkoutSession[],
  weightKg: number | null
): Record<string, number> {
  const map: Record<string, number> = {};
  if (weightKg == null || weightKg <= 0) return map;
  for (const s of sessions) {
    const key = s.date.slice(0, 10);
    map[key] = (map[key] || 0) + getWorkoutSessionCalories(weightKg, s.durationSeconds, s.workoutType);
  }
  return map;
}

/** Потрачено за день. Если передан PAL — расход = BMR × PAL (режим «активность»). Иначе BMR + шаги + тренировки. */
function getBurnedForDate(
  dateKeyParam: string,
  bmr: number,
  stepsByDate: Record<string, number>,
  workoutCaloriesForDate: number = 0,
  pal: number | null = null
): number {
  const todayKey = dateKey(new Date());
  if (dateKeyParam > todayKey) return 0;
  if (pal != null && pal > 0) return Math.round(bmr * pal);
  const steps = stepsByDate[dateKeyParam] ?? 0;
  return Math.round(bmr + steps * KCAL_PER_STEP + workoutCaloriesForDate);
}

/** Возвращает понедельник недели для даты (Пн–Вс) */
function getWeekStart(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Вс, 1=Пн, ..., 6=Сб
  const daysToMonday = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - daysToMonday);
  return copy;
}

/** Суммирует «эффективные» калории за неделю: съедено или потрачено, если нет записей о еде */
function getWeekTotal(
  byDate: Record<string, number>,
  burnedByDate: Record<string, number>,
  weekStart: Date
): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const eaten = byDate[key] ?? 0;
    const burned = burnedByDate[key] ?? 0;
    total += eaten > 0 ? eaten : burned;
  }
  return total;
}

/** Суммирует потраченные калории за неделю по уже посчитанному burnedByDate */
function getWeekBurnedTotal(
  weekStart: Date,
  burnedByDate: Record<string, number>
): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    total += burnedByDate[dateKey(d)] ?? 0;
  }
  return total;
}

/** Возвращает недели, выровненные по строкам календаря */
function getWeeksForGrid(
  byDate: Record<string, number>,
  burnedByDate: Record<string, number>,
  grid: (number | null)[][],
  year: number,
  month: number
): { weekStart: string; total: number; burnedTotal: number; label: string }[] {
  const result: { weekStart: string; total: number; burnedTotal: number; label: string }[] = [];
  for (const row of grid) {
    const firstDay = row.find((c) => c !== null);
    if (firstDay === undefined) continue;
    const d = new Date(year, month, firstDay);
    const ws = getWeekStart(d);
    const total = getWeekTotal(byDate, burnedByDate, ws);
    const burnedTotal = getWeekBurnedTotal(ws, burnedByDate);
    result.push({
      weekStart: dateKey(ws),
      total,
      burnedTotal,
      label: formatWeekLabel(dateKey(ws)),
    });
  }
  return result;
}

function formatWeekLabel(weekStartKey: string): string {
  const [y, m, d] = weekStartKey.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) => `${x.getDate()}.${String(x.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

/** Строит сетку календаря для месяца */
function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const offset = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = last.getDate();
  const total = offset + daysInMonth;
  const rows = Math.ceil(total / 7);
  const grid: (number | null)[][] = [];

  let day = 1;
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      if (idx < offset || day > daysInMonth) {
        row.push(null);
      } else {
        row.push(day++);
      }
    }
    grid.push(row);
  }
  return grid;
}

export default function CaloriesStatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const backgroundColor = useThemeColor({}, 'background');
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [runActivityMode, setRunActivityMode] = useState<RunActivityMode | null>(null);
  const [runFixedPal, setRunFixedPal] = useState<number | null>(null);
  const [runDailyLog, setRunDailyLog] = useState<Record<string, number>>({});
  const [registrationDateKey, setRegistrationDateKey] = useState<string | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [log, steps, sessions, p, mode, fixedPal, dailyLog, me] = await Promise.all([
        api.getFoodLog(),
        api.getStepsLog(),
        api.getWorkoutSessions(),
        api.getUserProfile(),
        api.getRunActivityMode(),
        api.getRunFixedPal(),
        api.getRunDailyActivityLog(),
        api.getMe().then((m) => m.created_at.slice(0, 10)).catch(() => null),
      ]);
      setRegistrationDateKey(me);
      setEntries(log);
      setStepsEntries(steps);
      setWorkoutSessions(sessions);
      setProfile(p);
      setRunActivityMode(mode);
      setRunFixedPal(fixedPal);
      setRunDailyLog(dailyLog ?? {});
    } catch (error) {
      console.error('Ошибка загрузки статистики калорий:', error);
      setRegistrationDateKey(null);
      // Fallback на локальное хранилище при ошибке API
      const [log, steps, sessions, p, mode, fixedPal, dailyLog] = await Promise.all([
        getFoodLog(),
        getStepsLog(),
        getWorkoutSessions(),
        getUserProfile(),
        getRunActivityMode(),
        getRunFixedPal(),
        getRunDailyActivityLog(),
      ]);
      setEntries(log);
      setStepsEntries(steps);
      setWorkoutSessions(sessions);
      setProfile(p);
      setRunActivityMode(mode);
      setRunFixedPal(fixedPal);
      setRunDailyLog(dailyLog ?? {});
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (loading || !profile) return;
    const { heightCm, weightKg, ageYears } = profile;
    if (heightCm == null || weightKg == null || ageYears == null) {
      setShowProfilePrompt(true);
    }
  }, [loading, profile]);

  const byDate = aggregateCaloriesByDate(entries);
  const stepsByDate = aggregateStepsByDate(stepsEntries);
  const workoutsBurnedByDate = aggregateWorkoutCaloriesByDate(
    workoutSessions,
    profile?.weightKg ?? null
  );
  const bmr = profile ? calculateBMR(profile) : 0;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function getPalForDate(key: string): number | null {
    if (runActivityMode === 'fixed' && runFixedPal != null) return runFixedPal;
    if (runActivityMode === 'daily') return runDailyLog[key] ?? runDailyLog[getYesterdayKey(key)] ?? null;
    return null;
  }

  const burnedByDate: Record<string, number> = {};
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const weekStartFirst = getWeekStart(firstOfMonth);
  const weekStartLast = getWeekStart(lastOfMonth);
  const weekEndLast = new Date(weekStartLast);
  weekEndLast.setDate(weekEndLast.getDate() + 6);
  const iter = new Date(weekStartFirst);
  while (iter <= weekEndLast) {
    const key = dateKey(iter);
    if (registrationDateKey && key < registrationDateKey) {
      burnedByDate[key] = 0;
    } else {
      burnedByDate[key] = getBurnedForDate(
        key,
        bmr,
        stepsByDate,
        workoutsBurnedByDate[key] ?? 0,
        getPalForDate(key)
      );
    }
    iter.setDate(iter.getDate() + 1);
  }
  const grid = buildMonthGrid(year, month);
  const weekTotals = getWeeksForGrid(byDate, burnedByDate, grid, year, month);

  const goPrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const goNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  const narrowScreen = width < 400;

  const monthStartKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEndKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
  const monthTotalEaten = Object.keys(burnedByDate)
    .filter((key) => key >= monthStartKey && key <= monthEndKey)
    .reduce((sum, key) => {
      const eaten = byDate[key] ?? 0;
      const burned = burnedByDate[key] ?? 0;
      return sum + (eaten > 0 ? eaten : burned);
    }, 0);
  const monthTotalBurned = Object.entries(burnedByDate)
    .filter(([key]) => key >= monthStartKey && key <= monthEndKey)
    .reduce((a, [, v]) => a + v, 0);
  const monthBalance = monthTotalBurned - monthTotalEaten;
  const KCAL_PER_KG = 8000;
  const balanceKg = Math.abs(monthBalance) / KCAL_PER_KG;

  const goToProfile = () => {
    setShowProfilePrompt(false);
    router.push('/profile' as any);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <>
    <Modal
      visible={showProfilePrompt}
      transparent
      animationType="fade">
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setShowProfilePrompt(false)}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            Не указаны данные для расчёта
          </ThemedText>
          <ThemedText style={[styles.modalMessage, { color: colors.text + 'cc' }]}>
            Чтобы видеть, сколько калорий потрачено (базовый обмен, шаги, тренировки), укажите рост, вес и возраст в профиле.
          </ThemedText>
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.text + '40' }]}
              onPress={() => setShowProfilePrompt(false)}>
              <ThemedText style={[styles.modalButtonTextSecondary, { color: colors.text }]}>Позже</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={goToProfile}>
              <ThemedText style={styles.modalButtonTextPrimary}>Перейти в профиль</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    <ScrollView
        style={[styles.scroll, { backgroundColor }]}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.container}>

          <View style={[styles.contentRow, narrowScreen && styles.contentColumn]}>
            <View style={[styles.calendarSection, narrowScreen && styles.calendarFull]}>
              <View style={styles.monthHeader}>
                <Pressable onPress={goPrevMonth} style={styles.arrowBtn}>
                  <ThemedText style={styles.arrow}>←</ThemedText>
                </Pressable>
                <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
                  {MONTH_NAMES[month]} {year}
                </ThemedText>
                <Pressable onPress={goNextMonth} style={styles.arrowBtn}>
                  <ThemedText style={styles.arrow}>→</ThemedText>
                </Pressable>
              </View>

              <View style={[styles.weekdayRow, styles.calendarRow]}>
                <View style={[styles.weekCol, narrowScreen && styles.weekColNarrow]}>
                  <ThemedText style={styles.weekdayText}>Неделя</ThemedText>
                </View>
                <View style={styles.daysRow}>
                  {WEEKDAYS.map((wd) => (
                    <View key={wd} style={[styles.cell, styles.dayCellFlex]}>
                      <ThemedText style={styles.weekdayText}>{wd}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              {grid.map((row, ri) => (
                <View key={ri} style={[styles.gridRow, styles.calendarRow]}>
                  <View style={[styles.weekCol, narrowScreen && styles.weekColNarrow]}>
                    {weekTotals[ri] ? (
                      <>
                        <ThemedText style={styles.weekLabel} numberOfLines={1}>
                          {weekTotals[ri].label}
                        </ThemedText>
                        <ThemedText type="defaultSemiBold" style={[styles.weekKcal, { color: colors.tint }]}>
                          {weekTotals[ri].total} ккал
                        </ThemedText>
                        <ThemedText style={[styles.weekBurned, { color: colors.text + '99' }]}>
                          потр. {weekTotals[ri].burnedTotal}
                        </ThemedText>
                      </>
                    ) : null}
                  </View>
                  <View style={styles.daysRow}>
                  {row.map((day, ci) => {
                    if (day === null) {
                      return (
                        <View key={ci} style={[styles.cell, styles.emptyCell, styles.dayCellFlex]} />
                      );
                    }
                    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const eaten = byDate[key] ?? 0;
                    const burned = burnedByDate[key] ?? 0;
                    const cal = eaten > 0 ? eaten : burned;
                    const deficit = burned > cal;
                    const surplus = cal > burned;
                    return (
                      <Pressable
                        key={ci}
                        style={({ pressed }) => [
                          styles.cell,
                          styles.dayCell,
                          styles.dayCellFlex,
                          deficit && { backgroundColor: 'rgba(76, 175, 80, 0.25)' },
                          surplus && { backgroundColor: 'rgba(244, 67, 54, 0.25)' },
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => router.push(`/calories-day?date=${key}` as any)}>
                        <ThemedText style={styles.dayNum}>{day}</ThemedText>
                        <ThemedText
                          style={[
                            styles.calText,
                            { color: deficit ? '#2E7D32' : surplus ? '#C62828' : cal > 0 ? colors.tint : undefined },
                          ]}
                          numberOfLines={1}>
                          {cal}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.burnedText,
                            { color: deficit ? '#2E7D32' : surplus ? '#C62828' : colors.text + '99' },
                          ]}
                          numberOfLines={1}>
                          {burned}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.monthSummary, { backgroundColor: colors.text + '12', borderColor: colors.text + '20' }]}>
            <ThemedText type="defaultSemiBold" style={styles.monthSummaryTitle}>
              Итого за {MONTH_NAMES[month].toLowerCase()} {year}
            </ThemedText>
            {monthBalance > 0 ? (
              <ThemedText style={[styles.monthSummaryValue, { color: '#2E7D32' }]}>
                Дефицит {monthBalance} ккал ({balanceKg >= 1 ? balanceKg.toFixed(1) : balanceKg.toFixed(2)} кг)
              </ThemedText>
            ) : monthBalance < 0 ? (
              <ThemedText style={[styles.monthSummaryValue, { color: '#C62828' }]}>
                Профицит {Math.abs(monthBalance)} ккал ({balanceKg >= 1 ? balanceKg.toFixed(1) : balanceKg.toFixed(2)} кг)
              </ThemedText>
            ) : (
              <ThemedText style={[styles.monthSummaryValue, { color: colors.text + 'cc' }]}>
                Баланс
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 20,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%',
  },
  contentColumn: {
    flexDirection: 'column',
  },
  calendarSection: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  calendarFull: {
    flex: 0,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekCol: {
    width: 95,
    minWidth: 85,
    flexShrink: 0,
  },
  weekColNarrow: {
    width: 78,
    minWidth: 72,
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
    gap: 4,
  },
  dayCellFlex: {
    flex: 1,
    minWidth: 28,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    padding: 8,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
  },
  weekdayRow: {
    marginBottom: 4,
  },
  gridRow: {
    marginBottom: 4,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  emptyCell: {
    opacity: 0,
  },
  weekdayText: {
    fontSize: 12,
    opacity: 0.7,
  },
  dayCell: {
    borderRadius: 6,
    paddingVertical: 2,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '600',
  },
  calText: {
    fontSize: 10,
  },
  burnedText: {
    fontSize: 9,
    marginTop: 1,
  },
  weekLabel: {
    fontSize: 11,
    opacity: 0.9,
    marginBottom: 1,
  },
  weekKcal: {
    fontSize: 12,
  },
  weekBurned: {
    fontSize: 10,
    marginTop: 1,
  },
  monthSummary: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  monthSummaryTitle: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.9,
  },
  monthSummaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
