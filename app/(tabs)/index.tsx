import { AddToHomeScreen } from '@/components/add-to-home-screen';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionTitleWithTooltip } from '@/components/ui/section-title-with-tooltip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CustomWorkoutPlan, PlanSlot } from '@/utils/api';
import * as api from '@/utils/api';
import { getAllDishes, getExerciseStatsFromStorage, saveExerciseResult, type Dish } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View
} from 'react-native';

// Константы для быстрых упражнений
type QuickExercise = {
  id: string;
  name: string;
  icon: string;
  unit: string;
};

const QUICK_EXERCISES: QuickExercise[] = [
  { id: 'quick_pushups', name: 'Отжимания', icon: 'figure.climbing', unit: 'раз' },
  { id: 'quick_pullups', name: 'Подтягивания', icon: 'figure.climbing', unit: 'раз' },
  { id: 'quick_squats', name: 'Приседания', icon: 'figure.strengthtraining.functional', unit: 'раз' },
  { id: 'quick_plank', name: 'Стояние в планке', icon: 'figure.core.training', unit: 'сек' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [recentDishes, setRecentDishes] = useState<Dish[]>([]);
  const [exerciseStats, setExerciseStats] = useState<api.ExerciseStatsItem[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<QuickExercise | null>(null);
  const [exerciseInput, setExerciseInput] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);
  const [enrolledPlans, setEnrolledPlans] = useState<CustomWorkoutPlan[]>([]);
  const [nextWorkout, setNextWorkout] = useState<{ slot: PlanSlot; planTitle: string; dayLabel: string; isToday: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadRecentDishes();
      loadExerciseStats();
      loadEnrolledPlans();
    }, [])
  );

  const loadRecentDishes = async () => {
    try {
      const dishes = await api.getAllDishes();
      setRecentDishes(dishes.slice(0, 5)); // Последние 5 блюд
    } catch (error) {
      console.error('Ошибка загрузки блюд:', error);
      const dishes = await getAllDishes();
      setRecentDishes(dishes.slice(0, 5));
    }
  };

  const loadExerciseStats = async () => {
    try {
      const stats = await api.getExerciseStats();
      setExerciseStats(stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики упражнений:', error);
      const stats = await getExerciseStatsFromStorage();
      setExerciseStats(stats);
    }
  };

  const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const loadEnrolledPlans = async () => {
    try {
      const plans = await api.getEnrolledPlans();
      setEnrolledPlans(plans);
      findNextWorkout(plans);
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
      setEnrolledPlans([]);
      setNextWorkout(null);
    }
  };

  const findNextWorkout = (plans: CustomWorkoutPlan[]) => {
    if (!plans.length) {
      setNextWorkout(null);
      return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    type SlotWithMeta = { slot: PlanSlot; planTitle: string; daysAhead: number; minutes: number };
    const candidates: SlotWithMeta[] = [];

    for (const plan of plans) {
      const schedule: PlanSlot[] = plan.schedule || [];
      for (const slot of schedule) {
        const [h, m] = slot.time.split(':').map(Number);
        const slotMinutes = (h || 0) * 60 + (m || 0);
        let daysAhead = (slot.dayOfWeek - currentDay + 7) % 7;
        if (daysAhead === 0 && slotMinutes <= currentTime) {
          daysAhead = 7;
        }
        candidates.push({ slot, planTitle: plan.title, daysAhead, minutes: slotMinutes });
      }
    }

    if (!candidates.length) {
      setNextWorkout(null);
      return;
    }

    candidates.sort((a, b) => {
      if (a.daysAhead !== b.daysAhead) return a.daysAhead - b.daysAhead;
      return a.minutes - b.minutes;
    });

    const best = candidates[0];
    const isToday = best.daysAhead === 0;
    const dayLabel = isToday ? 'Сегодня' : best.daysAhead === 1 ? 'Завтра' : DAY_NAMES[best.slot.dayOfWeek];

    setNextWorkout({ slot: best.slot, planTitle: best.planTitle, dayLabel, isToday });
  };

  const handleQuickExercise = (exercise: QuickExercise) => {
    setSelectedExercise(exercise);
    setExerciseInput('');
    setShowExerciseModal(true);
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise) return;
    const value = exerciseInput.trim();
    if (!value) {
      Alert.alert('Ошибка', 'Введите значение');
      return;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Ошибка', 'Введите корректное число');
      return;
    }

    setSavingExercise(true);
    try {
      await api.saveExerciseResult({
        id: Date.now().toString(),
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        date: new Date().toISOString(),
        reps: numValue,
      });
      Alert.alert('Успешно', `${selectedExercise.name}: ${numValue} ${selectedExercise.unit || 'раз'} сохранено`);
      setShowExerciseModal(false);
      setSelectedExercise(null);
      setExerciseInput('');
      loadExerciseStats();
    } catch (error) {
      console.error('Ошибка сохранения упражнения:', error);
      // Fallback на локальное хранилище при ошибке API
      try {
        await saveExerciseResult({
          id: Date.now().toString(),
          exerciseId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          date: new Date().toISOString(),
          reps: numValue,
        });
        Alert.alert('Успешно', `${selectedExercise.name}: ${numValue} ${selectedExercise.unit || 'раз'} сохранено`);
        setShowExerciseModal(false);
        setSelectedExercise(null);
        setExerciseInput('');
        loadExerciseStats();
      } catch (fallbackError) {
        Alert.alert('Ошибка', 'Не удалось сохранить');
      }
    } finally {
      setSavingExercise(false);
    }
  };

  const handleCreateDish = () => {
    router.push('/create-dish' as any);
  };

  const handleAddFood = () => {
    router.push('/add-food' as any);
  };

  const handleQuickFood = (dish: Dish) => {
    router.push(`/dish-add?dishId=${dish.id}` as any);
  };

  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <SectionTitleWithTooltip
          title="Главная"
          tooltipText="Быстрый доступ к основным функциям приложения."
        />
      </ThemedView>

      <AddToHomeScreen />

      {/* План тренировок */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          План тренировок
        </ThemedText>
        {nextWorkout ? (
          <Pressable
            style={[
              styles.planCard,
              {
                backgroundColor: nextWorkout.isToday ? colors.tint + '25' : colors.tint + '15',
                borderColor: nextWorkout.isToday ? colors.tint : colors.tint + '30',
              },
            ]}
            onPress={() => router.push('/select-workout-plan' as any)}>
            <View style={styles.nextWorkoutHeader}>
              <ThemedText style={[styles.nextWorkoutDay, { color: nextWorkout.isToday ? colors.tint : colors.text }]}>
                {nextWorkout.dayLabel}, {nextWorkout.slot.time}
              </ThemedText>
              {nextWorkout.isToday && (
                <View style={[styles.todayBadge, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.todayBadgeText}>Сегодня</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={[styles.nextWorkoutName, { color: colors.text }]}>
              {nextWorkout.slot.workoutName}
            </ThemedText>
            <ThemedText style={[styles.planSubtext, { color: colors.text + '99' }]}>
              {nextWorkout.planTitle}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.planCard, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}
            onPress={() => router.push('/select-workout-plan' as any)}>
            <ThemedText style={[styles.planText, { color: colors.text }]}>
              Подобрать план тренировок по целям и данным о себе →
            </ThemedText>
            <ThemedText style={[styles.planSubtext, { color: colors.text + '99' }]}>
              Введите цели, рост, вес и место занятий — подберём подходящие планы.
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>

      {/* Быстрый ввод упражнений */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Быстрый ввод упражнений
        </ThemedText>
        <View style={styles.exercisesGrid}>
          {QUICK_EXERCISES.map((exercise) => {
            const stat = exerciseStats.find(s => s.exerciseId === exercise.id);
            const total = stat?.totalReps ?? 0;
            const unit = exercise.unit || 'раз';
            const totalText = total > 0
              ? unit === 'сек'
                ? (total >= 60 ? `Всего: ${Math.round(total / 60)} мин` : `Всего: ${total} сек`)
                : `Всего: ${total} ${unit}`
              : null;
            return (
              <Pressable
                key={exercise.id}
                style={[styles.exerciseCard, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '40' }]}
                onPress={() => handleQuickExercise(exercise)}>
                <IconSymbol size={32} name={exercise.icon as any} color={colors.tint} />
                <ThemedText style={[styles.exerciseName, { color: colors.tint }]}>
                  {exercise.name}
                </ThemedText>
                {totalText ? (
                  <ThemedText style={[styles.exerciseTotal, { color: colors.text + '99' }]}>
                    {totalText}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[styles.statsLink, { borderColor: colors.tint + '60' }]}
          onPress={() => router.push('/exercise-stats' as any)}>
          <ThemedText style={[styles.statsLinkText, { color: colors.tint }]}>
            Статистика по упражнениям →
          </ThemedText>
        </Pressable>
      </ThemedView>

      {/* Быстрый ввод пищи */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Быстрый ввод пищи
        </ThemedText>
        <Pressable
          style={[styles.foodButton, { backgroundColor: colors.tint }]}
          onPress={handleCreateDish}>
          <ThemedText style={styles.foodButtonText}>Создать блюдо</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.foodButton, { backgroundColor: colors.tint }]}
          onPress={handleAddFood}>
          <ThemedText style={styles.foodButtonText}>Добавить что съел</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.statsLink, { borderColor: colors.tint + '60', marginTop: 12 }]}
          onPress={() => router.push('/calories-stats' as any)}>
          <ThemedText style={[styles.statsLinkText, { color: colors.tint }]}>
            Календарь калорий →
          </ThemedText>
        </Pressable>
      </ThemedView>

      {/* Модальное окно для ввода упражнения */}
      <Modal
        visible={showExerciseModal}
        transparent
        animationType="fade"
        onRequestClose={() => !savingExercise && setShowExerciseModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !savingExercise && setShowExerciseModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}
              onPress={(e) => e.stopPropagation()}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {selectedExercise?.name}
              </ThemedText>
              <ThemedText style={[styles.modalHint, { color: colors.text + '99' }]}>
                Введите количество {selectedExercise?.unit || 'раз'}
              </ThemedText>
              <TextInput
                style={[
                  styles.exerciseInput,
                  { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background },
                ]}
                value={exerciseInput}
                onChangeText={setExerciseInput}
                placeholder="0"
                placeholderTextColor={colors.text + '60'}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[
                    styles.modalButton,
                    styles.modalButtonSecondary,
                    { borderColor: colors.text + '40' },
                  ]}
                  onPress={() => !savingExercise && setShowExerciseModal(false)}
                  disabled={savingExercise}>
                  <ThemedText style={[styles.modalButtonTextSecondary, { color: colors.text }]}>
                    Отмена
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalButton,
                    { backgroundColor: colors.tint },
                    savingExercise && styles.modalButtonDisabled,
                  ]}
                  onPress={handleSaveExercise}
                  disabled={savingExercise || !exerciseInput.trim()}>
                  <ThemedText style={styles.modalButtonTextPrimary}>
                    {savingExercise ? '…' : 'Сохранить'}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  planText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  planSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  nextWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nextWorkoutDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  nextWorkoutName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseCard: {
    width: '47%',
    minWidth: 140,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  exerciseTotal: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsLink: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statsLinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  foodButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  foodButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentDishes: {
    gap: 8,
  },
  recentDishesTitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  dishesScroll: {
    flexDirection: 'row',
  },
  dishChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  dishChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseInput: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
