import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { getExerciseStatsFromStorage } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function ExerciseStatsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [stats, setStats] = useState<api.ExerciseStatsItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const data = await api.getExerciseStats();
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики упражнений:', error);
      const data = await getExerciseStatsFromStorage();
      setStats(data);
    }
  };

  const handleExercisePress = (item: api.ExerciseStatsItem) => {
    router.push({
      pathname: '/exercise-stats-detail',
      params: { exerciseId: item.exerciseId, exerciseName: item.exerciseName },
    } as any);
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}>
      <ThemedView>
        {stats.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: colors.text + '99' }]}>
            Пока нет данных. Добавьте результаты упражнений через быстрый ввод на главной или в тренировках.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {stats.map((item) => (
              <Pressable
                key={item.exerciseId}
                style={[
                  styles.exerciseCard,
                  { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' },
                ]}
                onPress={() => handleExercisePress(item)}>
                <ThemedText style={[styles.exerciseName, { color: colors.tint }]}>
                  {item.exerciseName}
                </ThemedText>
                <ThemedText style={[styles.exerciseTotal, { color: colors.text + '99' }]}>
                  Всего: {item.totalReps} раз · {item.sessionsCount} записей
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  list: {
    gap: 12,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseTotal: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
