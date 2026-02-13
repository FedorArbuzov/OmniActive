import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseResult, getExerciseResults, getWorkouts, saveExerciseResult, Workout } from '@/utils/storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function WorkoutScreen() {
  const { workoutId, category } = useLocalSearchParams<{ workoutId: string; category: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [started, setStarted] = useState(false);
  // Для силовых тренировок: weight и reps
  // Для баскетбола/хоккея: hits и misses
  const [exerciseInputs, setExerciseInputs] = useState<Record<string, { weight?: string; reps?: string; hits?: string; misses?: string }>>({});
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseResult[]>>({});
  const [showEndModal, setShowEndModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // в секундах
  const [sessionId, setSessionId] = useState<string | null>(null); // ID сессии тренировки
  const alertShownRef = useRef(false);
  const timerIntervalRef = useRef<number | null>(null);

  const handleStart = useCallback(() => {
    console.log('Начало тренировки');
    const now = new Date();
    const newSessionId = Date.now().toString(); // Генерируем уникальный ID сессии
    setStartTime(now);
    setElapsedTime(0);
    setSessionId(newSessionId);
    setStarted(true);
  }, []);

  const handleCancel = useCallback(() => {
    // Останавливаем таймер при отмене
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setSessionId(null);
    router.back();
  }, []);

  // Форматирование времени в ЧЧ:ММ:СС
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadWorkout();
  }, [workoutId, category]);

  useEffect(() => {
    if (workout && started) {
      loadHistoryForAllExercises();
    }
  }, [workout, started]);

  // Обновляем историю при возврате на экран (например, после завершения упражнения)
  useFocusEffect(
    useCallback(() => {
      if (workout && started) {
        loadHistoryForAllExercises();
      }
    }, [workout, started])
  );

  // Таймер тренировки
  useEffect(() => {
    if (started && startTime) {
      // Запускаем таймер
      timerIntervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      // Останавливаем таймер
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [started, startTime]);

  const loadWorkout = async () => {
    if (workoutId && category && !alertShownRef.current) {
      const workouts = await getWorkouts(category);
      const foundWorkout = workouts.find(w => w.id === workoutId);
      if (foundWorkout) {
        setWorkout(foundWorkout);
        alertShownRef.current = true;
        // Показываем подтверждение перед началом
        Alert.alert(
          'Начать тренировку',
          `Вы хотите начать тренировку "${foundWorkout.name}"?`,
          [
            {
              text: 'Отмена',
              style: 'cancel',
              onPress: handleCancel,
            },
            {
              text: 'Начать',
              onPress: () => {
                requestAnimationFrame(() => {
                  handleStart();
                });
              },
            },
          ],
          { cancelable: false }
        );
      }
    }
  };

  const loadHistoryForAllExercises = async () => {
    if (!workout) return;
    const history: Record<string, ExerciseResult[]> = {};
    for (const exercise of workout.exercises) {
      const results = await getExerciseResults(exercise.id);
      history[exercise.id] = results;
    }
    setExerciseHistory(history);
  };

  const handleSaveExercise = async (exerciseId: string, exerciseName: string) => {
    const input = exerciseInputs[exerciseId];
    
    // Только для силовых тренировок
    if (!input || !input.weight?.trim() || !input.reps?.trim()) {
      alert('Заполните вес и количество повторений');
      return;
    }

    const weightNum = parseFloat(input.weight);
    const repsNum = parseInt(input.reps, 10);

    if (isNaN(weightNum) || isNaN(repsNum) || weightNum <= 0 || repsNum <= 0) {
      alert('Введите корректные значения');
      return;
    }

    const result: ExerciseResult = {
      id: Date.now().toString(),
      exerciseId,
      exerciseName,
      weight: weightNum,
      reps: repsNum,
      date: new Date().toISOString(),
      workoutId: workout?.id,
      sessionId: sessionId || undefined,
    };

    await saveExerciseResult(result);
    
    // Очищаем инпуты
    setExerciseInputs(prev => ({
      ...prev,
      [exerciseId]: { weight: '', reps: '' },
    }));
    
    // Обновляем историю
    await loadHistoryForAllExercises();
  };

  const handleEndWorkout = () => {
    setShowEndModal(true);
  };

  const handleConfirmEndWorkout = async () => {
    setIsSubmitting(true);
    
    // Останавливаем таймер
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    try {
      const endTime = new Date();
      const startTimeISO = startTime?.toISOString() || new Date().toISOString();
      const endTimeISO = endTime.toISOString();
      
      // Заглушка отправки данных на сервер
      const workoutData = {
        sessionId: sessionId, // ID сессии тренировки
        workoutId: workout?.id,
        workoutName: workout?.name,
        category: category,
        startTime: startTimeISO,
        endTime: endTimeISO,
        duration: elapsedTime, // длительность в секундах
        exercises: workout?.exercises.map(exercise => {
          const input = exerciseInputs[exercise.id];
          const history = exerciseHistory[exercise.id] || [];
          const workoutType = workout?.type || 'strength';
          
          // Фильтруем результаты только текущей СЕССИИ тренировки по sessionId
          const currentWorkoutResults = history.filter(r => {
            if (!sessionId) {
              return false; // Если сессия не начата, не включаем результаты
            }
            
            // Фильтруем строго по sessionId - только результаты текущей сессии
            return r.sessionId === sessionId;
          });
          
          if (workoutType === 'strength') {
            return {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              results: currentWorkoutResults.map(r => ({
                weight: r.weight,
                reps: r.reps,
                date: r.date,
              })),
              lastInput: input && input.weight && input.reps ? {
                weight: parseFloat(input.weight) || 0,
                reps: parseInt(input.reps, 10) || 0,
              } : null,
            };
          } else {
            // Баскетбол/Хоккей
            return {
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              results: currentWorkoutResults.map(r => ({
                hits: r.hits,
                misses: r.misses,
                date: r.date,
              })),
              lastInput: input && input.hits && input.misses ? {
                hits: parseInt(input.hits, 10) || 0,
                misses: parseInt(input.misses, 10) || 0,
              } : null,
            };
          }
        }),
      };

      console.log('Отправка данных тренировки на сервер:', workoutData);
      
      // Заглушка API запроса
      await new Promise(resolve => setTimeout(resolve, 1000)); // Имитация задержки сети
      
      // Здесь будет реальный запрос:
      // const response = await fetch('https://your-api.com/workouts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(workoutData),
      // });
      // if (!response.ok) throw new Error('Ошибка отправки данных');
      
      console.log('Данные успешно отправлены на сервер');
      
      setShowEndModal(false);
      setStarted(false);
      setStartTime(null);
      setElapsedTime(0);
      setSessionId(null);
      router.back();
    } catch (error) {
      console.error('Ошибка при отправке данных на сервер:', error);
      alert('Ошибка при отправке данных. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!workout) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Загрузка...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {workout.name}
        </ThemedText>

        {started ? (
          <>
            <ThemedView style={styles.timerContainer}>
              <ThemedText style={[styles.timerLabel, { color: colors.text + '80' }]}>
                Время тренировки:
              </ThemedText>
              <ThemedText type="title" style={[styles.timerValue, { color: colors.tint }]}>
                {formatTime(elapsedTime)}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Упражнения ({workout.exercises.length})
              </ThemedText>
              {workout.exercises.length > 0 ? (
                <View style={styles.exercisesList}>
                  {workout.exercises.map((exercise, index) => {
                    const workoutType = workout.type || 'strength';
                    const defaultInput = workoutType === 'strength' 
                      ? { weight: '', reps: '' } 
                      : { hits: '', misses: '' };
                    const input = exerciseInputs[exercise.id] || defaultInput;
                    const history = exerciseHistory[exercise.id] || [];
                    const lastResult = history[0];
                    const isCompleted = workoutType === 'strength' 
                      ? (input.weight && input.reps)
                      : (input.hits && input.misses);

                    return (
                      <View
                        key={exercise.id}
                        style={[
                          styles.exerciseCard,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.text + '20',
                          },
                        ]}>
                        <View style={styles.exerciseHeader}>
                          <View style={styles.exerciseNumber}>
                            <ThemedText style={[styles.exerciseNumberText, { color: colors.tint }]}>
                              {index + 1}
                            </ThemedText>
                          </View>
                          <ThemedText type="defaultSemiBold" style={styles.exerciseName}>
                            {exercise.name}
                          </ThemedText>
                        </View>

                        {workoutType === 'strength' ? (
                          // Силовая тренировка: вес и повторения
                          <>
                            <View style={styles.inputsRow}>
                              <View style={styles.inputContainer}>
                                <ThemedText style={styles.inputLabel}>Вес (кг)</ThemedText>
                                <TextInput
                                  style={[
                                    styles.input,
                                    {
                                      color: colors.text,
                                      borderColor: colors.text + '40',
                                      backgroundColor: colors.background,
                                    },
                                  ]}
                                  placeholder="0"
                                  placeholderTextColor={colors.text + '60'}
                                  value={input.weight || ''}
                                  onChangeText={(text) => {
                                    setExerciseInputs(prev => ({
                                      ...prev,
                                      [exercise.id]: { ...prev[exercise.id] || defaultInput, weight: text, reps: prev[exercise.id]?.reps || '' },
                                    }));
                                  }}
                                  keyboardType="numeric"
                                />
                              </View>

                              <View style={styles.inputContainer}>
                                <ThemedText style={styles.inputLabel}>Повторений</ThemedText>
                                <TextInput
                                  style={[
                                    styles.input,
                                    {
                                      color: colors.text,
                                      borderColor: colors.text + '40',
                                      backgroundColor: colors.background,
                                    },
                                  ]}
                                  placeholder="0"
                                  placeholderTextColor={colors.text + '60'}
                                  value={input.reps || ''}
                                  onChangeText={(text) => {
                                    setExerciseInputs(prev => ({
                                      ...prev,
                                      [exercise.id]: { ...prev[exercise.id] || defaultInput, weight: prev[exercise.id]?.weight || '', reps: text },
                                    }));
                                  }}
                                  keyboardType="numeric"
                                />
                              </View>

                              <TouchableOpacity
                                style={[
                                  styles.saveButton,
                                  {
                                    backgroundColor: colors.tint,
                                    opacity: isCompleted ? 1 : 0.5,
                                  },
                                ]}
                                onPress={() => handleSaveExercise(exercise.id, exercise.name)}
                                disabled={!isCompleted}>
                                <ThemedText style={styles.saveButtonText}>✓</ThemedText>
                              </TouchableOpacity>
                            </View>

                            {lastResult && lastResult.weight !== undefined && lastResult.reps !== undefined && (
                              <View style={styles.lastResult}>
                                <ThemedText style={[styles.lastResultText, { color: colors.text + '80' }]}>
                                  Последний раз: {lastResult.weight} кг × {lastResult.reps}
                                </ThemedText>
                              </View>
                            )}
                          </>
                        ) : (
                          // Баскетбол/Хоккей: кнопка "Начать упражнение"
                          <>
                            {lastResult && lastResult.hits !== undefined && lastResult.misses !== undefined && (
                              <View style={styles.lastResult}>
                                <ThemedText style={[styles.lastResultText, { color: colors.text + '80' }]}>
                                  Последний раз: {lastResult.hits} попаданий, {lastResult.misses} промахов
                                </ThemedText>
                              </View>
                            )}
                            
                            <View style={styles.buttonRow}>
                              <Button
                                title="Начать упражнение"
                                onPress={() => {
                                  router.push(`/exercise-session?exerciseId=${exercise.id}&exerciseName=${encodeURIComponent(exercise.name)}&workoutId=${workout?.id}&sessionId=${sessionId}` as any);
                                }}
                                color={colors.tint}
                              />
                            </View>
                          </>
                        )}

                        {history.length > 0 && (
                          <TouchableOpacity
                            style={styles.historyButton}
                            onPress={() => {
                              router.push(
                                `/exercise-detail?exerciseId=${exercise.id}&exerciseName=${encodeURIComponent(exercise.name)}&workoutId=${workout.id}` as any
                              );
                            }}>
                            <ThemedText style={[styles.historyButtonText, { color: colors.tint }]}>
                              История ({history.length})
                            </ThemedText>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <ThemedText style={styles.emptyExercises}>
                  В этой тренировке нет упражнений
                </ThemedText>
              )}
            </ThemedView>

            <View style={styles.buttonContainer}>
              <Button
                title="Завершить тренировку"
                onPress={handleEndWorkout}
                color="#ff3b30"
              />
            </View>
          </>
        ) : (
          <ThemedView style={styles.waitingContainer}>
            <ThemedText style={styles.waitingText}>
              Готовы начать тренировку?
            </ThemedText>
            <ThemedText style={[styles.waitingText, { marginTop: 8, fontSize: 14, opacity: 0.7 }]}>
              {workout.exercises.length} упражнений
            </ThemedText>
            <View style={styles.buttonContainer}>
              <Button
                title="Начать тренировку"
                onPress={handleStart}
                color={colors.tint}
              />
              <Button
                title="Отмена"
                onPress={handleCancel}
                color="#999"
              />
            </View>
          </ThemedView>
        )}
      </ScrollView>

      {/* Модальное окно завершения тренировки */}
      <Modal
        visible={showEndModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isSubmitting && setShowEndModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isSubmitting && setShowEndModal(false)}>
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.text + '20',
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <ThemedText type="title" style={styles.modalTitle}>
              Завершить тренировку?
            </ThemedText>
            <ThemedText style={[styles.modalText, { color: colors.text + '80' }]}>
              Вы уверены, что хотите завершить тренировку? Все данные будут сохранены и отправлены на сервер.
            </ThemedText>
            
            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonCancel,
                  { borderColor: colors.text + '40' },
                  isSubmitting && styles.modalButtonDisabled,
                ]}
                onPress={() => setShowEndModal(false)}
                disabled={isSubmitting}>
                <ThemedText style={styles.modalButtonText}>Отмена</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  { backgroundColor: '#ff3b30' },
                  isSubmitting && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmEndWorkout}
                disabled={isSubmitting}>
                <ThemedText style={[styles.modalButtonText, { color: '#fff' }]}>
                  {isSubmitting ? 'Отправка...' : 'Завершить'}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  timerLabel: {
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  exercisesList: {
    gap: 16,
  },
  exerciseCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseName: {
    fontSize: 16,
    flex: 1,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 44,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  lastResult: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  lastResultText: {
    fontSize: 12,
  },
  historyButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  historyButtonText: {
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  buttonRow: {
    marginTop: 12,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyExercises: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 16,
    fontSize: 24,
  },
  modalText: {
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonConfirm: {
    backgroundColor: '#ff3b30',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
