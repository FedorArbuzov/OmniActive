import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getWorkouts } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, StyleSheet } from 'react-native';

export default function FootballScreen() {
  const [hasWorkouts, setHasWorkouts] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkWorkouts();
    }, [])
  );

  const checkWorkouts = async () => {
    const workouts = await getWorkouts('football');
    setHasWorkouts(workouts.length > 0);
  };

  const handleStartWorkout = async () => {
    const workouts = await getWorkouts('football');
    if (workouts.length === 0) {
      router.push('/create-workout?category=football' as any);
    } else {
      router.push('/select-workout?category=football' as any);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E3F2FD', dark: '#0D47A1' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#2196F3"
          name="soccerball"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Футбол</ThemedText>
      </ThemedView>
      <ThemedText>Футбольные тренировки</ThemedText>
      
      <ThemedView style={styles.stepContainer}>
        <Button
          title={hasWorkouts ? 'Начать тренировку' : 'Создать тренировку'}
          onPress={handleStartWorkout}
          color="#2196F3"
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#2196F3',
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
});
