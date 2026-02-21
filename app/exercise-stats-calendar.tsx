import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import * as api from '@/utils/api';
import type { ExerciseResult } from '@/utils/storage';
import { getExerciseResults } from '@/utils/storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/** Даты, в которые есть результаты, и сводка: всего раз или суммарный вес (кг) */
function getDayStats(results: ExerciseResult[]): {
  dates: Set<string>;
  byDate: Record<string, { totalReps: number; totalWeight: number }>;
  hasWeight: boolean;
} {
  const dates = new Set<string>();
  const byDate: Record<string, { totalReps: number; totalWeight: number }> = {};
  const hasWeight = results.some((r) => r.weight != null && r.weight > 0);

  for (const r of results) {
    const key = r.date.slice(0, 10);
    dates.add(key);
    if (!byDate[key]) byDate[key] = { totalReps: 0, totalWeight: 0 };
    const reps = r.reps ?? 0;
    const weight = r.weight ?? 0;
    byDate[key].totalReps += reps;
    byDate[key].totalWeight += weight * (reps || 1);
  }
  return { dates, byDate, hasWeight };
}

export default function ExerciseStatsCalendarScreen() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const backgroundColor = useThemeColor({}, 'background');
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());

  const loadResults = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const data = await api.getExerciseResults(exerciseId);
      setResults(data);
    } catch (error) {
      console.error('Ошибка загрузки результатов:', error);
      const data = await getExerciseResults(exerciseId);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useFocusEffect(
    useCallback(() => {
      if (exerciseId) loadResults();
    }, [exerciseId, loadResults])
  );

  const { dates: datesWithData, byDate: statsByDate, hasWeight } = useMemo(
    () => getDayStats(results),
    [results]
  );
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const goPrevMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const goNextMonth = () => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  const getDayLabel = (key: string) => {
    const s = statsByDate[key];
    if (!s) return '';
    return hasWeight ? `${Math.round(s.totalWeight)} кг` : String(s.totalReps);
  };

  const handleDayPress = (key: string) => {
    if (!datesWithData.has(key)) return;
    router.push({
      pathname: '/exercise-day',
      params: { exerciseId, exerciseName, date: key },
    } as any);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Календарь' }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Календарь' }} />
      <ScrollView
        style={[styles.scroll, { backgroundColor }]}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.monthHeader}>
          <Pressable onPress={goPrevMonth} style={styles.arrowBtn}>
            <ThemedText style={[styles.arrow, { color: colors.tint }]}>←</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </ThemedText>
          <Pressable onPress={goNextMonth} style={styles.arrowBtn}>
            <ThemedText style={[styles.arrow, { color: colors.tint }]}>→</ThemedText>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <ThemedText style={[styles.weekdayText, { color: colors.text + '99' }]}>{wd}</ThemedText>
            </View>
          ))}
        </View>

        {grid.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((day, ci) => {
              if (day === null) {
                return <View key={ci} style={[styles.cell, styles.emptyCell]} />;
              }
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasData = datesWithData.has(key);
              return (
                <Pressable
                  key={ci}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.dayCell,
                    hasData && { backgroundColor: colors.tint + '30', borderColor: colors.tint + '60' },
                    pressed && hasData && { opacity: 0.7 },
                  ]}
                  onPress={() => handleDayPress(key)}
                  disabled={!hasData}>
                  <ThemedText
                    style={[
                      styles.dayNum,
                      { color: hasData ? colors.tint : colors.text + '99' },
                    ]}>
                    {day}
                  </ThemedText>
                  {hasData && (
                    <ThemedText
                      style={[styles.dayHint, { color: colors.tint + 'cc' }]}
                      numberOfLines={1}>
                      {getDayLabel(key)}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}

        <ThemedText style={[styles.hint, { color: colors.text + '99', marginTop: 16 }]}>
          Подсвечены дни, когда выполнялось упражнение. Нажмите на день, чтобы увидеть подходы.
        </ThemedText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrowBtn: {
    padding: 8,
  },
  arrow: {
    fontSize: 22,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  emptyCell: {
    opacity: 0,
  },
  dayCell: {
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayHint: {
    fontSize: 10,
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
});
