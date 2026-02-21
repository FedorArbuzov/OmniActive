import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionTitleWithTooltip } from '@/components/ui/section-title-with-tooltip';
import * as api from '@/utils/api';
import { getWorkouts } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, StyleSheet } from 'react-native';

export default function HockeyScreen() {
  const [hasWorkouts, setHasWorkouts] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkWorkouts();
    }, [])
  );

  const checkWorkouts = async () => {
    try {
      const workouts = await api.getWorkouts('hockey');
      setHasWorkouts(workouts.length > 0);
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error);
      // Fallback на локальное хранилище при ошибке API
      const workouts = await getWorkouts('hockey');
      setHasWorkouts(workouts.length > 0);
    }
  };

  const handleStartWorkout = async () => {
    try {
      const workouts = await api.getWorkouts('hockey');
      if (workouts.length === 0) {
        router.push('/create-workout?category=hockey' as any);
      } else {
        router.push('/select-workout?category=hockey' as any);
      }
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error);
      // Fallback на локальное хранилище при ошибке API
      const workouts = await getWorkouts('hockey');
      if (workouts.length === 0) {
        router.push('/create-workout?category=hockey' as any);
      } else {
        router.push('/select-workout?category=hockey' as any);
      }
    }
  };

  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <SectionTitleWithTooltip
          title="Хоккей"
          tooltipText="Раздел для хоккейных тренировок. Создавайте программы и отслеживайте прогресс."
        />
      </ThemedView>
      <ThemedText>Хоккейные тренировки</ThemedText>
      
      <ThemedView style={styles.stepContainer}>
        <Button
          title={hasWorkouts ? 'Начать тренировку' : 'Создать тренировку'}
          onPress={handleStartWorkout}
          color="#00BCD4"
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
});
