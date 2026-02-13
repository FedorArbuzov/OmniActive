import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getWorkouts, Workout } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, StyleSheet, TouchableOpacity } from 'react-native';

export default function BasketballScreen() {
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
    const categoryWorkouts = await getWorkouts('basketball');
    setWorkouts(categoryWorkouts);
    setHasWorkouts(categoryWorkouts.length > 0);
  };

  const handleStartWorkout = async () => {
    const workouts = await getWorkouts('basketball');
    if (workouts.length === 0) {
      router.push('/create-workout?category=basketball' as any);
    } else {
      router.push('/select-workout?category=basketball' as any);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#FFF3E0', dark: '#E65100' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#FF9800"
          name="basketball.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Баскетбол</ThemedText>
      </ThemedView>
      <ThemedText>Баскетбольные тренировки</ThemedText>
      
      {workouts.length > 0 && (
        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Мои тренировки</ThemedText>
          {workouts.map(workout => (
            <TouchableOpacity
              key={workout.id}
              style={[styles.workoutCard, { backgroundColor: colors.background + '80', borderColor: colors.text + '20' }]}
              onPress={() => router.push(`/workout-screen?workoutId=${workout.id}&category=basketball` as any)}>
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
          title={hasWorkouts ? 'Начать тренировку' : 'Создать тренировку'}
          onPress={handleStartWorkout}
          color="#FF9800"
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#FF9800',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
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
