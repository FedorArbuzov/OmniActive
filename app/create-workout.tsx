import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Exercise, saveWorkout, Workout, WorkoutType } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const STRENGTH_EXERCISES: Exercise[] = [
  { id: '1', name: 'Приседания' },
  { id: '2', name: 'Отжимания' },
  { id: '3', name: 'Подтягивания' },
  { id: '4', name: 'Жим лежа' },
  { id: '5', name: 'Становая тяга' },
  { id: '6', name: 'Планка' },
  { id: '7', name: 'Бег' },
  { id: '8', name: 'Прыжки' },
  { id: '9', name: 'Берпи' },
  { id: '10', name: 'Выпады' },
  { id: '11', name: 'Тяга к подбородку' },
  { id: '12', name: 'Разведение гантелей' },
  { id: '13', name: 'Скручивания' },
  { id: '14', name: 'Велосипед' },
  { id: '15', name: 'Мостик' },
];

const BASKETBALL_EXERCISES: Exercise[] = [
  { id: 'b1', name: 'Броски со штрафной линии' },
  { id: 'b2', name: 'Броски из-под кольца' },
  { id: 'b3', name: 'Броски с трехочковой линии' },
  { id: 'b4', name: 'Броски со средней дистанции' },
  { id: 'b5', name: 'Броски в движении' },
];

const HOCKEY_EXERCISES: Exercise[] = [
  { id: 'h1', name: 'Броски по воротам' },
  { id: 'h2', name: 'Броски с близкого расстояния' },
  { id: 'h3', name: 'Броски с дальнего расстояния' },
  { id: 'h4', name: 'Броски в движении' },
  { id: 'h5', name: 'Броски с острого угла' },
];

export default function CreateWorkoutScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Определяем тип тренировки и доступные упражнения по категории
  const workoutType: WorkoutType = category === 'basketball' ? 'basketball' 
    : category === 'hockey' ? 'hockey' 
    : 'strength';
  
  const availableExercises = workoutType === 'basketball' ? BASKETBALL_EXERCISES
    : workoutType === 'hockey' ? HOCKEY_EXERCISES
    : STRENGTH_EXERCISES;
  
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const handleSave = async () => {
    if (!workoutName.trim()) {
      alert('Введите название тренировки');
      return;
    }

    if (selectedExercises.length === 0) {
      alert('Выберите хотя бы одно упражнение');
      return;
    }

    const workout: Workout = {
      id: Date.now().toString(),
      name: workoutName.trim(),
      category: (category || 'index') as Workout['category'],
      type: workoutType,
      exercises: availableExercises.filter(ex => selectedExercises.includes(ex.id)),
      createdAt: new Date().toISOString(),
    };

    await saveWorkout(workout);
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Создать тренировку
        </ThemedText>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Название тренировки
          </ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.text + '40' }]}
            placeholder="Введите название"
            placeholderTextColor={colors.text + '80'}
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Упражнения
          </ThemedText>
          <View style={styles.exercisesList}>
            {availableExercises.map(exercise => {
              const isSelected = selectedExercises.includes(exercise.id);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseItem,
                    {
                      backgroundColor: isSelected ? colors.tint + '20' : colors.background,
                      borderColor: isSelected ? colors.tint : colors.text + '20',
                    },
                  ]}
                  onPress={() => toggleExercise(exercise.id)}>
                  <ThemedText
                    style={[
                      styles.exerciseText,
                      { color: isSelected ? colors.tint : colors.text },
                    ]}>
                    {exercise.name}
                  </ThemedText>
                  {isSelected && (
                    <ThemedText style={{ color: colors.tint, fontSize: 18 }}>✓</ThemedText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ThemedView>

        <View style={styles.buttonContainer}>
          <Button
            title="Сохранить тренировку"
            onPress={handleSave}
            color={colors.tint}
          />
        </View>
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
  section: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  exerciseText: {
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});
