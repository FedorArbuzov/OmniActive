import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
    type UserProfile,
    type WorkoutSession,
    type WorkoutType,
} from '@/utils/storage';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

const KCAL_PER_STEP = 0.04;
const MET_BY_WORKOUT_TYPE: Record<WorkoutType, number> = {
  strength: 3.5,
  basketball: 6.5,
  hockey: 8,
};

function calculateBMR(profile: UserProfile): number {
  const { heightCm, weightKg, ageYears } = profile;
  if (heightCm == null || weightKg == null || ageYears == null) return 0;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
}

function getWorkoutSessionCalories(
  weightKg: number,
  durationSeconds: number,
  workoutType: WorkoutType
): number {
  const met = MET_BY_WORKOUT_TYPE[workoutType] ?? 3.5;
  const hours = durationSeconds / 3600;
  return Math.round(met * weightKg * hours);
}

function formatDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const weekday = WEEKDAYS[dayOfWeek];
  return `${weekday}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export default function CaloriesDayScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dateKey = (dateParam ?? '').slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [stepsByDate, setStepsByDate] = useState<Record<string, number>>({});
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [runActivityMode, setRunActivityMode] = useState<RunActivityMode | null>(null);
  const [runFixedPal, setRunFixedPal] = useState<number | null>(null);
  const [runDailyLog, setRunDailyLog] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [log, stepsList, sessions, p, mode, fixedPal, dailyLog] = await Promise.all([
        api.getFoodLog(),
        api.getStepsLog(),
        api.getWorkoutSessions(),
        api.getUserProfile(),
        api.getRunActivityMode(),
        api.getRunFixedPal(),
        api.getRunDailyActivityLog(),
      ]);
      setEntries(log);
      const stepsMap: Record<string, number> = {};
      for (const e of stepsList) {
        stepsMap[e.date.slice(0, 10)] = e.steps;
      }
      setStepsByDate(stepsMap);
      setWorkoutSessions(sessions);
      setProfile(p);
      setRunActivityMode(mode);
      setRunFixedPal(fixedPal);
      setRunDailyLog(dailyLog ?? {});
    } catch (error) {
      console.error('Ошибка загрузки данных калорий:', error);
      // Fallback на локальное хранилище при ошибке API
      const [log, stepsList, sessions, p, mode, fixedPal, dailyLog] = await Promise.all([
        getFoodLog(),
        getStepsLog(),
        getWorkoutSessions(),
        getUserProfile(),
        getRunActivityMode(),
        getRunFixedPal(),
        getRunDailyActivityLog(),
      ]);
      setEntries(log);
      const stepsMap: Record<string, number> = {};
      for (const e of stepsList) {
        stepsMap[e.date.slice(0, 10)] = e.steps;
      }
      setStepsByDate(stepsMap);
      setWorkoutSessions(sessions);
      setProfile(p);
      setRunActivityMode(mode);
      setRunFixedPal(fixedPal);
      setRunDailyLog(dailyLog ?? {});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (dateKey) {
      navigation.setOptions({
        title: formatDateLong(dateKey),
        headerRight: () => (
          <Pressable
            onPress={() => router.push(`/add-food?date=${encodeURIComponent(dateKey)}` as any)}
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <ThemedText style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>
              Добавить
            </ThemedText>
          </Pressable>
        ),
      });
    }
  }, [dateKey, navigation, colors.tint, router]);

  const bmr = profile ? calculateBMR(profile) : 0;
  const dayEntries = entries.filter((e) => e.date.slice(0, 10) === dateKey);
  const daySteps = stepsByDate[dateKey] ?? 0;
  const daySessions = workoutSessions.filter((s) => s.date.slice(0, 10) === dateKey);
  const totalEaten = dayEntries.reduce((sum, e) => sum + e.calories, 0);
  const stepsCal = Math.round(daySteps * KCAL_PER_STEP);
  const weightKg = profile?.weightKg ?? 0;
  const sessionCalories = daySessions.map((s) =>
    getWorkoutSessionCalories(weightKg, s.durationSeconds, s.workoutType)
  );
  const palForDay =
    runActivityMode === 'fixed' && runFixedPal != null
      ? runFixedPal
      : runActivityMode === 'daily'
        ? runDailyLog[dateKey] ?? runDailyLog[getYesterdayKey(dateKey)] ?? null
        : null;
  const totalBurned =
    palForDay != null
      ? Math.round(bmr * palForDay)
      : Math.round(bmr + stepsCal + sessionCalories.reduce((a, b) => a + b, 0));

  if (!dateKey) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Не указана дата</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={{ color: colors.tint }}>Назад</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}>

        <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.tint }]}>
          Съедено
        </ThemedText>
        {dayEntries.length === 0 ? (
          <ThemedText style={[styles.empty, { color: colors.text + '99' }]}>
            Нет записей
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {dayEntries.map((e) => (
              <View key={e.id} style={[styles.row, { borderBottomColor: colors.text + '20' }]}>
                <ThemedText style={styles.rowLabel} numberOfLines={1}>
                  {e.dishName}
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                  {e.calories} ккал
                </ThemedText>
              </View>
            ))}
          </View>
        )}
        <View style={[styles.totalRow, { borderTopColor: colors.text + '30' }]}>
          <ThemedText type="defaultSemiBold">Итого съедено</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            {totalEaten} ккал
          </ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.tint, marginTop: 24 }]}>
          На что потрачено
        </ThemedText>
        <View style={styles.list}>
          <View style={[styles.row, { borderBottomColor: colors.text + '20' }]}>
            <ThemedText style={styles.rowLabel}>Базовый обмен (BMR)</ThemedText>
            <ThemedText style={{ color: colors.text + 'cc' }}>{bmr} ккал</ThemedText>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.text + '20' }]}>
            <ThemedText style={styles.rowLabel}>
              Шаги {daySteps > 0 ? `(${daySteps})` : ''}
            </ThemedText>
            <ThemedText style={{ color: colors.text + 'cc' }}>{stepsCal} ккал</ThemedText>
          </View>
          {daySessions.map((s, i) => (
            <View key={s.id} style={[styles.row, { borderBottomColor: colors.text + '20' }]}>
              <ThemedText style={styles.rowLabel} numberOfLines={1}>
                {s.workoutName || 'Тренировка'} ({Math.floor(s.durationSeconds / 60)} мин)
              </ThemedText>
              <ThemedText style={{ color: colors.text + 'cc' }}>
                {sessionCalories[i]} ккал
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={[styles.totalRow, { borderTopColor: colors.text + '30' }]}>
          <ThemedText type="defaultSemiBold">Итого потрачено</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            {totalBurned} ккал
          </ThemedText>
        </View>

        <View style={[styles.balance, { backgroundColor: colors.text + '12', marginTop: 20 }]}>
          <ThemedText type="defaultSemiBold">
            {totalBurned > totalEaten
              ? `Дефицит ${totalBurned - totalEaten} ккал`
              : totalEaten > totalBurned
                ? `Профицит ${totalEaten - totalBurned} ккал`
                : 'Баланс'}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backBtn: {
    marginTop: 16,
    padding: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 20,
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 8,
  },
  empty: {
    fontSize: 14,
    marginBottom: 8,
  },
  list: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    marginRight: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  balance: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
