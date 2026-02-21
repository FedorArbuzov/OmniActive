import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { getWorkouts, Workout } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function SelectWorkoutScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const loadWorkouts = async () => {
    if (category) {
      try {
        const categoryWorkouts = await api.getWorkouts(category);
        setWorkouts(categoryWorkouts);
      } catch (error) {
        console.error('Ошибка загрузки тренировок:', error);
        const categoryWorkouts = await getWorkouts(category);
        setWorkouts(categoryWorkouts);
      }
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const handleSelectWorkout = (workout: Workout) => {
    router.push(`/workout-screen?workoutId=${workout.id}&category=${category}` as any);
  };

  const handleCreateNew = () => {
    router.push(`/create-workout?category=${category}` as any);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Выберите тренировку
        </ThemedText>

        {workouts.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              У вас пока нет тренировок для этой категории
            </ThemedText>
            <Button
              title="Создать тренировку"
              onPress={handleCreateNew}
              color={colors.tint}
            />
          </ThemedView>
        ) : (
          <>
            <View style={styles.workoutsList}>
              {workouts.map(workout => (
                <TouchableOpacity
                  key={workout.id}
                  style={[
                    styles.workoutItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + '20',
                    },
                  ]}
                  onPress={() => handleSelectWorkout(workout)}>
                  <ThemedView style={styles.workoutHeader}>
                    <ThemedText type="subtitle" style={styles.workoutName}>
                      {workout.name}
                    </ThemedText>
                    <ThemedText style={[styles.exerciseCount, { color: colors.text + '80' }]}>
                      {workout.exercises.length} упражнений
                    </ThemedText>
                  </ThemedView>
                  <View style={styles.exercisesPreview}>
                    {workout.exercises.slice(0, 3).map((exercise, index) => (
                      <ThemedText
                        key={exercise.id}
                        style={[styles.exerciseTag, { color: colors.text + '80' }]}>
                        {exercise.name}
                        {index < Math.min(2, workout.exercises.length - 1) && ', '}
                      </ThemedText>
                    ))}
                    {workout.exercises.length > 3 && (
                      <ThemedText style={[styles.exerciseTag, { color: colors.text + '80' }]}>
                        ...
                      </ThemedText>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Создать новую тренировку"
                onPress={handleCreateNew}
                color={colors.tint}
              />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    fontSize: 28,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  workoutsList: {
    gap: 12,
    marginBottom: 20,
  },
  workoutItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  workoutHeader: {
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
  },
  exercisesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  exerciseTag: {
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 8,
  },
});
