import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
    const workouts = await getWorkouts('hockey');
    setHasWorkouts(workouts.length > 0);
  };

  const handleStartWorkout = async () => {
    const workouts = await getWorkouts('hockey');
    if (workouts.length === 0) {
      router.push('/create-workout?category=hockey' as any);
    } else {
      router.push('/select-workout?category=hockey' as any);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E1F5FE', dark: '#01579B' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#00BCD4"
          name="figure.skating"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Хоккей</ThemedText>
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
  headerImage: {
    color: '#00BCD4',
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
