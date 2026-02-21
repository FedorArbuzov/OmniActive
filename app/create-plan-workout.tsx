import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { PlanSlot } from '@/utils/api';
import * as api from '@/utils/api';
import type { Workout } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from 'react-native';

const DAYS = [
  { id: 0, label: 'Вс' },
  { id: 1, label: 'Пн' },
  { id: 2, label: 'Вт' },
  { id: 3, label: 'Ср' },
  { id: 4, label: 'Чт' },
  { id: 5, label: 'Пт' },
  { id: 6, label: 'Сб' },
];

export default function CreatePlanWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<PlanSlot[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, workoutsRes] = await Promise.all([
        isEdit ? api.getCustomWorkoutPlanById(id!) : Promise.resolve(null),
        api.getWorkouts(),
      ]);
      if (workoutsRes) setWorkouts(workoutsRes);
      if (plansRes) {
        setTitle(plansRes.title);
        setDescription(plansRes.description || '');
        setIsPublic(plansRes.is_public ?? false);
        setPlanCode(plansRes.code || null);
        setSchedule(plansRes.schedule || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSlot = () => {
    setSchedule((prev) => [
      ...prev,
      { dayOfWeek: 1, time: '09:00', workoutId: '', workoutName: '' },
    ]);
  };

  const updateSlot = (index: number, field: keyof PlanSlot, value: string | number) => {
    setSchedule((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      if (field === 'workoutId') {
        const w = workouts.find((x) => x.id === value);
        next[index].workoutName = w?.name ?? '';
      }
      return next;
    });
  };

  const removeSlot = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Ошибка', 'Введите название плана');
      return;
    }

    const validSlots = schedule.filter((s) => s.workoutId && s.time);
    if (validSlots.some((s) => !s.workoutName)) {
      for (const slot of validSlots) {
        if (!slot.workoutName) {
          const w = workouts.find((x) => x.id === slot.workoutId);
          if (w) slot.workoutName = w.name;
        }
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateCustomWorkoutPlan(id!, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          schedule: validSlots,
          is_public: isPublic,
        });
        Alert.alert('Сохранено', 'План обновлён', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const created = await api.createCustomWorkoutPlan({
          title: trimmedTitle,
          description: description.trim() || undefined,
          schedule: validSlots,
          is_public: isPublic,
        });
        setPlanCode(created.code);
        setIsPublic(created.is_public);
        Alert.alert('Создано', `План создан. Код: ${created.code}`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить план');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={[styles.label, { color: colors.text }]}>Название</ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
          placeholder="Например: Программа на массу"
          placeholderTextColor={colors.text + '60'}
          value={title}
          onChangeText={setTitle}
        />

        <ThemedText style={[styles.label, { color: colors.text }]}>Описание</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
          placeholder="Кратко опишите план"
          placeholderTextColor={colors.text + '60'}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.scheduleHeader}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: colors.text }]}>
            Расписание
          </ThemedText>
          <Pressable
            style={[styles.addSlotBtn, { backgroundColor: colors.tint + '30', borderColor: colors.tint }]}
            onPress={addSlot}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>+ Добавить</ThemedText>
          </Pressable>
        </View>
        <ThemedText style={[styles.hint, { color: colors.text + '99' }]}>
          Выберите день недели, время и тренировку
        </ThemedText>

        <View style={[styles.publicRow, { borderTopColor: colors.text + '20' }]}>
          <ThemedText style={[styles.label, { color: colors.text }]}>Публичный план</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.text + '99', marginBottom: 8 }]}>
            Приватные планы можно найти по коду
          </ThemedText>
          <View style={styles.switchRow}>
            <ThemedText style={{ color: colors.text }}>{isPublic ? 'Публичный (код не нужен)' : 'Приватный (по коду)'}</ThemedText>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.text + '40', true: colors.tint + '80' }} thumbColor={isPublic ? colors.tint : colors.text + '60'} />
          </View>
          {planCode && (
            <View style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.tint }]}>
              <ThemedText style={[styles.codeLabel, { color: colors.text + '99' }]}>Код плана</ThemedText>
              <ThemedText style={[styles.codeValue, { color: colors.tint }]}>{planCode}</ThemedText>
            </View>
          )}
        </View>

        {schedule.map((slot, index) => (
          <View
            key={index}
            style={[styles.slotCard, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}
          >
            <View style={styles.slotRow}>
              <View style={styles.slotDay}>
                <ThemedText style={[styles.slotLabel, { color: colors.text + '99' }]}>День</ThemedText>
                <View style={styles.daysRow}>
                  {DAYS.map((d) => (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.dayChip,
                        {
                          backgroundColor: slot.dayOfWeek === d.id ? colors.tint + '30' : 'transparent',
                          borderColor: slot.dayOfWeek === d.id ? colors.tint : colors.text + '30',
                        },
                      ]}
                      onPress={() => updateSlot(index, 'dayOfWeek', d.id)}
                    >
                      <ThemedText
                        style={{ color: slot.dayOfWeek === d.id ? colors.tint : colors.text, fontSize: 12 }}
                      >
                        {d.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.slotTime}>
                <ThemedText style={[styles.slotLabel, { color: colors.text + '99' }]}>Время</ThemedText>
                <TextInput
                  style={[styles.timeInput, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
                  placeholder="09:00"
                  placeholderTextColor={colors.text + '60'}
                  value={slot.time}
                  onChangeText={(t) => updateSlot(index, 'time', t)}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={styles.slotWorkout}>
              <ThemedText style={[styles.slotLabel, { color: colors.text + '99' }]}>Тренировка</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator style={styles.workoutsScroll}>
                {workouts.map((w) => (
                  <Pressable
                    key={w.id}
                    style={[
                      styles.workoutChip,
                      {
                        backgroundColor: slot.workoutId === w.id ? colors.tint + '30' : 'transparent',
                        borderColor: slot.workoutId === w.id ? colors.tint : colors.text + '30',
                      },
                    ]}
                    onPress={() => updateSlot(index, 'workoutId', w.id)}
                  >
                    <ThemedText
                      style={[styles.workoutChipText, { color: slot.workoutId === w.id ? colors.tint : colors.text }]}
                      numberOfLines={1}
                    >
                      {w.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Pressable
              style={[styles.removeSlotBtn, { borderColor: colors.text + '40' }]}
              onPress={() => removeSlot(index)}
            >
              <ThemedText style={{ color: '#ff3b30', fontSize: 14 }}>Удалить</ThemedText>
            </Pressable>
          </View>
        ))}

        {schedule.length === 0 && (
          <ThemedText style={[styles.emptyHint, { color: colors.text + '80' }]}>
            Нажмите «Добавить», чтобы добавить тренировку в расписание
          </ThemedText>
        )}

        <View style={styles.footer}>
          <Button
            title={saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать план'}
            onPress={handleSave}
            disabled={saving}
            color={colors.tint}
          />
          {isEdit && (
            <Pressable
              style={[styles.deleteBtn, { borderColor: '#ff3b30' }]}
              onPress={() => {
                Alert.alert(
                  'Удалить план?',
                  'План будет удалён без возможности восстановления.',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    {
                      text: 'Удалить',
                      style: 'destructive',
                      onPress: async () => {
                        setSaving(true);
                        try {
                          await api.deleteCustomWorkoutPlan(id!);
                          Alert.alert('Удалено', undefined, [{ text: 'OK', onPress: () => router.back() }]);
                        } catch (e) {
                          Alert.alert('Ошибка', 'Не удалось удалить план');
                        } finally {
                          setSaving(false);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={saving}
            >
              <ThemedText style={{ color: '#ff3b30', fontSize: 16 }}>Удалить план</ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: { marginBottom: 8 },
  scheduleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  addSlotBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  hint: { fontSize: 14, marginBottom: 12 },
  publicRow: { marginTop: 24, paddingTop: 20, borderTopWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBlock: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  codeLabel: { fontSize: 12, marginBottom: 4 },
  codeValue: { fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  slotCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  slotRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  slotDay: { flex: 1 },
  slotTime: { width: 90 },
  slotLabel: { fontSize: 12, marginBottom: 6 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  slotWorkout: { marginBottom: 8 },
  workoutsScroll: { flexDirection: 'row', marginTop: 6 },
  workoutChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 160,
  },
  workoutChipText: { fontSize: 14 },
  removeSlotBtn: { paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, marginTop: 8 },
  emptyHint: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  footer: { marginTop: 24, gap: 12 },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderRadius: 8 },
});
