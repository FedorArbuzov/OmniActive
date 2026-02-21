import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionTitleWithTooltip } from '@/components/ui/section-title-with-tooltip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { getWorkouts, Workout } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, StyleSheet, TouchableOpacity } from 'react-native';

export default function GymScreen() {
  const [hasWorkouts, setHasWorkouts] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useFocusEffect(
    useCallback(() => {
      checkWorkouts();
    }, [])
  );

  const checkWorkouts = async () => {
    try {
      const categoryWorkouts = await api.getWorkouts('index');
      setWorkouts(categoryWorkouts);
      setHasWorkouts(categoryWorkouts.length > 0);
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error);
      // Fallback на локальное хранилище при ошибке API
      const categoryWorkouts = await getWorkouts('index');
      setWorkouts(categoryWorkouts);
      setHasWorkouts(categoryWorkouts.length > 0);
    }
  };

  const handleCreateWorkout = () => {
    router.push('/create-workout?category=index' as any);
  };

  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <SectionTitleWithTooltip
          title="Тренировки"
          tooltipText="Здесь вы можете создавать тренировки и отслеживать их выполнение."
        />
      </ThemedView>
      <ThemedText>Тренировки в зале</ThemedText>
      
      {workouts.length > 0 && (
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Мои тренировки</ThemedText>
          {workouts.map(workout => (
            <TouchableOpacity
              key={workout.id}
              style={[styles.workoutCard, { backgroundColor: colors.background + '80', borderColor: colors.text + '20' }]}
              onPress={() => router.push(`/workout-screen?workoutId=${workout.id}&category=index` as any)}>
              <ThemedText type="defaultSemiBold" style={styles.workoutCardName}>
                {workout.name}
              </ThemedText>
              <ThemedText style={[styles.workoutCardExercises, { color: colors.text + '80' }]}>
                {workout.exercises.length} упражнений
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}
      
      <ThemedView style={styles.stepContainer}>
        <Button
          title="Создать новую тренировку"
          onPress={handleCreateWorkout}
          color="#4CAF50"
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  workoutCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  workoutCardName: {
    fontSize: 16,
    marginBottom: 4,
  },
  workoutCardExercises: {
    fontSize: 14,
  },
});
