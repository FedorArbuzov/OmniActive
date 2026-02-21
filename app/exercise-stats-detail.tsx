import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import type { ExerciseResult } from '@/utils/storage';
import { getExerciseResults } from '@/utils/storage';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function ExerciseStatsDetailScreen() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [results, setResults] = useState<ExerciseResult[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (exerciseId) loadResults();
    }, [exerciseId])
  );

  const loadResults = async () => {
    if (!exerciseId) return;
    try {
      const data = await api.getExerciseResults(exerciseId);
      setResults(data);
    } catch (error) {
      console.error('Ошибка загрузки результатов упражнения:', error);
      const data = await getExerciseResults(exerciseId);
      setResults(data);
    }
  };

  const totalReps = results.reduce((sum, r) => sum + (r.reps ?? 0), 0);
  const maxReps = results.length > 0
    ? Math.max(...results.map((r) => r.reps ?? 0))
    : 0;
  const hasWeight = results.some((r) => r.weight != null && r.weight > 0);
  const maxWeight = hasWeight
    ? Math.max(...results.filter((r) => r.weight != null).map((r) => r.weight!))
    : 0;
  const maxWeightVolume = hasWeight
    ? Math.max(
        ...results
          .filter((r) => r.weight != null && (r.reps ?? 0) > 0)
          .map((r) => r.weight! * (r.reps ?? 1))
      )
    : 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: exerciseName || 'Упражнение',
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {exerciseName || 'Упражнение'}
        </ThemedText>

        {results.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: colors.text + '99' }]}>
            Пока нет данных по этому упражнению.
          </ThemedText>
        ) : (
          <View style={styles.stats}>
            <ThemedView
              style={[styles.statCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.statLabel, { color: colors.text + '99' }]}>
                Всего раз
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                {totalReps}
              </ThemedText>
            </ThemedView>

            <ThemedView
              style={[styles.statCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
              <ThemedText style={[styles.statLabel, { color: colors.text + '99' }]}>
                Максимум за раз
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                {maxReps}
              </ThemedText>
            </ThemedView>

            {hasWeight && (
              <>
                <ThemedView
                  style={[styles.statCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
                  <ThemedText style={[styles.statLabel, { color: colors.text + '99' }]}>
                    Максимальный вес за раз (кг)
                  </ThemedText>
                  <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                    {maxWeight}
                  </ThemedText>
                </ThemedView>

                <ThemedView
                  style={[styles.statCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
                  <ThemedText style={[styles.statLabel, { color: colors.text + '99' }]}>
                    Максимальный объём за подход (кг × раз)
                  </ThemedText>
                  <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                    {maxWeightVolume}
                  </ThemedText>
                </ThemedView>
              </>
            )}
          </View>
        )}

        {results.length > 0 && (
          <Pressable
            style={[styles.calendarLink, { borderColor: colors.tint + '60' }]}
            onPress={() =>
              router.push({
                pathname: '/exercise-stats-calendar',
                params: { exerciseId, exerciseName },
              } as any)
            }>
            <ThemedText style={[styles.calendarLinkText, { color: colors.tint }]}>
              Календарь →
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    fontSize: 24,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  stats: {
    gap: 16,
  },
  statCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  calendarLink: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  calendarLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
