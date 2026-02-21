import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import type { ExerciseResult } from '@/utils/storage';
import { getExerciseResults } from '@/utils/storage';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = (date.getDay() + 6) % 7;
  const weekday = WEEKDAYS[dayOfWeek];
  return `${weekday}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function ExerciseDayScreen() {
  const { exerciseId, exerciseName, date: dateParam } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
    date: string;
  }>();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dateKey = (dateParam ?? '').slice(0, 10);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    if (!exerciseId || !dateKey) return;
    setLoading(true);
    try {
      const data = await api.getExerciseResults(exerciseId);
      setResults(data.filter((r) => r.date.slice(0, 10) === dateKey));
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      const data = await getExerciseResults(exerciseId);
      setResults(data.filter((r) => r.date.slice(0, 10) === dateKey));
    } finally {
      setLoading(false);
    }
  }, [exerciseId, dateKey]);

  useFocusEffect(
    useCallback(() => {
      if (exerciseId && dateKey) loadResults();
    }, [exerciseId, dateKey, loadResults])
  );

  useEffect(() => {
    if (dateKey) {
      navigation.setOptions({ title: formatDateLong(dateKey) });
    }
  }, [dateKey, navigation]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  const totalReps = results.reduce((sum, r) => sum + (r.reps ?? 0), 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator>
        <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.tint }]}>
          {exerciseName}
        </ThemedText>

        {results.length === 0 ? (
          <ThemedText style={[styles.empty, { color: colors.text + '99' }]}>
            Нет записей за этот день
          </ThemedText>
        ) : (
          <>
            <View style={[styles.totalRow, { borderColor: colors.text + '20' }]}>
              <ThemedText style={styles.rowLabel}>Всего повторений за день</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                {totalReps}
              </ThemedText>
            </View>

            <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: colors.tint, marginTop: 24 }]}>
              Подходы
            </ThemedText>
            <View style={styles.list}>
              {results.map((r, i) => (
                <View
                  key={r.id}
                  style={[styles.setCard, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '30' }]}>
                  <View style={styles.setHeader}>
                    <ThemedText style={[styles.setIndex, { color: colors.text + '99' }]}>
                      Подход {i + 1}
                    </ThemedText>
                    <ThemedText style={[styles.setTime, { color: colors.text + '99' }]}>
                      {formatTime(r.date)}
                    </ThemedText>
                  </View>
                  <View style={styles.setStats}>
                    {r.weight != null && r.weight > 0 && (
                      <ThemedText style={styles.setStat}>
                        <ThemedText type="defaultSemiBold">Вес:</ThemedText> {r.weight} кг
                      </ThemedText>
                    )}
                    <ThemedText style={styles.setStat}>
                      <ThemedText type="defaultSemiBold">Повторений:</ThemedText> {r.reps ?? '—'}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 15,
  },
  list: {
    gap: 12,
  },
  setCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setIndex: {
    fontSize: 14,
  },
  setTime: {
    fontSize: 13,
  },
  setStats: {
    flexDirection: 'row',
    gap: 16,
  },
  setStat: {
    fontSize: 15,
  },
});
