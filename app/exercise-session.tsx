import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseResult, saveExerciseResult } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function ExerciseSessionScreen() {
  const { exerciseId, exerciseName, workoutId, sessionId } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
    workoutId: string;
    sessionId: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Форматирование времени в ММ:СС
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Запуск таймера при монтировании компонента
  useEffect(() => {
    const now = new Date();
    setStartTime(now);
    setElapsedTime(0);

    timerIntervalRef.current = setInterval(() => {
      const currentTime = new Date();
      const elapsed = Math.floor((currentTime.getTime() - now.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  const handleComplete = useCallback(async (finalHits: number, finalMisses: number) => {
    // Останавливаем таймер
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Сохраняем результат
    const result: ExerciseResult = {
      id: Date.now().toString(),
      exerciseId: exerciseId!,
      exerciseName: exerciseName!,
      hits: finalHits,
      misses: finalMisses,
      date: new Date().toISOString(),
      workoutId: workoutId,
      sessionId: sessionId,
    };

    await saveExerciseResult(result);

    // Возвращаемся на экран тренировки
    router.back();
  }, [exerciseId, exerciseName, workoutId, sessionId]);

  // Автоматическое завершение при сумме = 10
  useEffect(() => {
    if (hits + misses === 10) {
      // Небольшая задержка для визуального отображения последнего нажатия
      const timer = setTimeout(() => {
        handleComplete(hits, misses);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hits, misses, handleComplete]);

  const handleHit = () => {
    if (hits + misses < 10) {
      setHits(prev => prev + 1);
    }
  };

  const handleMiss = () => {
    if (hits + misses < 10) {
      setMisses(prev => prev + 1);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Маленький таймер сверху */}
      <View style={styles.header}>
        <ThemedText style={[styles.timerText, { color: colors.text + '80' }]}>
          {formatTime(elapsedTime)}
        </ThemedText>
      </View>

      {/* Верхняя половина экрана - попадания */}
      <Pressable
        style={[
          styles.hitArea,
          {
            backgroundColor: hits + misses >= 10 ? colors.text + '10' : colors.tint + '20',
            borderBottomWidth: 2,
            borderBottomColor: colors.text + '20',
            opacity: hits + misses >= 10 ? 0.6 : 1,
          },
        ]}
        onPress={handleHit}
        disabled={hits + misses >= 10}>
        <View style={styles.counterContainer}>
          <ThemedText style={[styles.counterLabel, { color: colors.text + '60' }]}>
            Попадания
          </ThemedText>
          <ThemedText type="title" style={[styles.counterValue, { color: colors.tint }]}>
            {hits}
          </ThemedText>
          {hits + misses >= 10 && (
            <ThemedText style={[styles.completeText, { color: colors.tint }]}>
              Завершено
            </ThemedText>
          )}
        </View>
      </Pressable>

      {/* Нижняя половина экрана - промахи */}
      <Pressable
        style={[
          styles.missArea,
          {
            backgroundColor: hits + misses >= 10 ? colors.text + '10' : '#ff3b30' + '20',
            opacity: hits + misses >= 10 ? 0.6 : 1,
          },
        ]}
        onPress={handleMiss}
        disabled={hits + misses >= 10}>
        <View style={styles.counterContainer}>
          <ThemedText style={[styles.counterLabel, { color: colors.text + '60' }]}>
            Промахи
          </ThemedText>
          <ThemedText type="title" style={[styles.counterValue, { color: '#ff3b30' }]}>
            {misses}
          </ThemedText>
        </View>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hitArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterLabel: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  counterValue: {
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
});
