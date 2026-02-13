import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExerciseResult, getExerciseResults, saveExerciseResult } from '@/utils/storage';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function ExerciseDetailScreen() {
  const { exerciseId, exerciseName, workoutId } = useLocalSearchParams<{
    exerciseId: string;
    exerciseName: string;
    workoutId?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [history, setHistory] = useState<ExerciseResult[]>([]);

  useEffect(() => {
    loadHistory();
  }, [exerciseId]);

  const loadHistory = async () => {
    if (exerciseId) {
      const results = await getExerciseResults(exerciseId);
      setHistory(results);
    }
  };

  const handleSave = async () => {
    if (!weight.trim() || !reps.trim()) {
      alert('Заполните вес и количество повторений');
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps, 10);

    if (isNaN(weightNum) || isNaN(repsNum) || weightNum <= 0 || repsNum <= 0) {
      alert('Введите корректные значения');
      return;
    }

    if (!exerciseId || !exerciseName) {
      alert('Ошибка: отсутствует информация об упражнении');
      return;
    }

    const result: ExerciseResult = {
      id: Date.now().toString(),
      exerciseId,
      exerciseName,
      weight: weightNum,
      reps: repsNum,
      date: new Date().toISOString(),
      workoutId: workoutId || undefined,
    };

    await saveExerciseResult(result);
    setWeight('');
    setReps('');
    await loadHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {exerciseName || 'Упражнение'}
        </ThemedText>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Вес (кг)
          </ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.text + '40' }]}
            placeholder="Введите вес"
            placeholderTextColor={colors.text + '80'}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Количество повторений
          </ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.text + '40' }]}
            placeholder="Введите количество повторений"
            placeholderTextColor={colors.text + '80'}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
          />
        </ThemedView>

        <View style={styles.buttonContainer}>
          <Button
            title="Сохранить результат"
            onPress={handleSave}
            color={colors.tint}
          />
        </View>

        {history.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              История результатов
            </ThemedText>
            <View style={styles.historyList}>
              {history.map((result, index) => (
                <View
                  key={result.id}
                  style={[
                    styles.historyItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.text + '20',
                    },
                  ]}>
                  <View style={styles.historyHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.historyDate}>
                      {formatDate(result.date)}
                    </ThemedText>
                    {index === 0 && (
                      <ThemedText style={[styles.newBadge, { color: colors.tint }]}>
                        Новое
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.historyStats}>
                    <ThemedText style={styles.historyStat}>
                      <ThemedText type="defaultSemiBold">Вес:</ThemedText> {result.weight} кг
                    </ThemedText>
                    <ThemedText style={styles.historyStat}>
                      <ThemedText type="defaultSemiBold">Повторений:</ThemedText> {result.reps}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </ThemedView>
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
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 20,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
  },
  newBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  historyStat: {
    fontSize: 14,
  },
});
