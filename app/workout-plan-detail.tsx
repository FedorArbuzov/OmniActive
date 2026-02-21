import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CustomWorkoutPlan, PlanSlot } from '@/utils/api';
import * as api from '@/utils/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

const DAY_LABELS: Record<number, string> = {
  0: 'Вс',
  1: 'Пн',
  2: 'Вт',
  3: 'Ср',
  4: 'Чт',
  5: 'Пт',
  6: 'Сб',
};

function formatSlot(slot: PlanSlot): string {
  const day = DAY_LABELS[slot.dayOfWeek] ?? '?';
  return `${day} ${slot.time} — ${slot.workoutName}`;
}

export default function WorkoutPlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [plan, setPlan] = useState<CustomWorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!planId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await api.getPublicWorkoutPlanById(planId);
      setPlan(p);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleStart = async () => {
    if (!plan || !planId) return;
    setSaving(true);
    try {
      await api.enrollPlan(planId);
      router.replace('/(tabs)' as any);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось добавить план');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!plan) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={[styles.errorText, { color: colors.text + '99' }]}>
          План не найден
        </ThemedText>
        <Pressable
          style={[styles.backLink, { borderColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={{ color: colors.tint }}>← Назад</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const schedule: PlanSlot[] = plan.schedule || [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={[styles.title, { color: colors.tint }]}>
          {plan.title}
        </ThemedText>

        {plan.description ? (
          <ThemedText style={[styles.description, { color: colors.text + 'CC' }]}>
            {plan.description}
          </ThemedText>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.text }]}>
            Расписание
          </ThemedText>
          {schedule.length === 0 ? (
            <ThemedText style={[styles.emptySchedule, { color: colors.text + '99' }]}>
              Расписание пока не заполнено
            </ThemedText>
          ) : (
            <View style={[styles.scheduleList, { borderColor: colors.text + '20', backgroundColor: colors.tint + '08' }]}>
              {schedule.map((slot, index) => (
                <View
                  key={index}
                  style={[styles.scheduleRow, { borderBottomColor: index < schedule.length - 1 ? colors.text + '15' : 'transparent' }]}
                >
                  <ThemedText style={[styles.scheduleText, { color: colors.text }]}>
                    {formatSlot(slot)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.startButton, { backgroundColor: colors.tint }, saving && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={saving}
        >
          <ThemedText style={styles.startButtonText}>
            {saving ? 'Добавление...' : 'Приступить'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.backLink, { borderColor: 'transparent' }]}
          onPress={() => router.back()}
        >
          <ThemedText style={{ color: colors.text + '99', fontSize: 14 }}>← Назад</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 16,
    fontSize: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 17,
  },
  scheduleList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scheduleRow: {
    padding: 14,
    borderBottomWidth: 1,
  },
  scheduleText: {
    fontSize: 15,
  },
  emptySchedule: {
    fontSize: 15,
    paddingVertical: 16,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backLink: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
