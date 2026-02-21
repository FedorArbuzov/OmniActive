import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
    GENDERS,
    GOALS,
    LOCATIONS,
    type Gender,
    type Goal,
    type Location,
} from '@/constants/workout-plans';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { saveUserProfile, type UserProfile } from '@/utils/storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

type Step = 0 | 1 | 2 | 3 | 4;

export default function SelectWorkoutPlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState<Step>(0);
  const [hasPlanCode, setHasPlanCode] = useState<boolean | null>(null);
  const [planCode, setPlanCode] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [age, setAge] = useState('');
  const [publicPlans, setPublicPlans] = useState<api.CustomWorkoutPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const toggleGoal = (g: Goal) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const canProceedStep1 = goals.length > 0;
  const canProceedStep2 =
    gender && heightCm && weightKg && age &&
    parseInt(heightCm, 10) > 0 &&
    parseInt(weightKg, 10) > 0 &&
    parseInt(age, 10) > 0;
  const canProceedStep3 = location !== null;

  const handleStep2Next = async () => {
    if (!canProceedStep2) return;
    const profile: UserProfile = {
      heightCm: parseInt(heightCm, 10) || null,
      weightKg: parseFloat(weightKg) || null,
      ageYears: parseInt(age, 10) || null,
    };
    try {
      await api.saveUserProfile(profile);
    } catch (error) {
      try {
        await saveUserProfile(profile);
      } catch {
        console.error('Не удалось сохранить профиль');
      }
    }
    setStep(3);
  };

  useEffect(() => {
    if (step === 4) {
      setLoadingPlans(true);
      api.getPublicWorkoutPlans()
        .then(setPublicPlans)
        .catch(() => setPublicPlans([]))
        .finally(() => setLoadingPlans(false));
    }
  }, [step]);

  // Шаг 0: Код плана
  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Есть ли у вас код плана?
      </ThemedText>
      <ThemedText style={[styles.stepHint, { color: colors.text + '99' }]}>
        В будущем тренер сможет составить для вас индивидуальный план и передать его по коду.
      </ThemedText>

      {hasPlanCode === null ? (
        <View style={styles.choiceRow}>
          <Pressable
            style={[styles.choiceButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
            onPress={() => setHasPlanCode(true)}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Да, есть код</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.choiceButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
            onPress={() => {
              setHasPlanCode(false);
              setStep(1);
            }}
          >
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Нет, подобрать план</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background },
            ]}
            value={planCode}
            onChangeText={setPlanCode}
            placeholder="Введите код плана"
            placeholderTextColor={colors.text + '60'}
            autoCapitalize="characters"
          />
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              // TODO: проверка кода через API
              if (planCode.trim()) {
                // Пока заглушка — план по коду в разработке
                alert('Функция «План по коду» в разработке. Пока подберите план самостоятельно.');
              }
            }}
          >
            <ThemedText style={styles.primaryButtonText}>Продолжить по коду</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.text + '40' }]}
            onPress={() => {
              setHasPlanCode(null);
              setPlanCode('');
            }}
          >
            <ThemedText style={{ color: colors.text }}>Назад</ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );

  // Шаг 1: Цели
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Какие цели ставите?
      </ThemedText>
      <ThemedText style={[styles.stepHint, { color: colors.text + '99' }]}>
        Можно выбрать несколько.
      </ThemedText>
      <View style={styles.optionsGrid}>
        {GOALS.map((g) => {
          const selected = goals.includes(g.id);
          return (
            <Pressable
              key={g.id}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected ? colors.tint + '25' : colors.background,
                  borderColor: selected ? colors.tint : colors.text + '30',
                },
              ]}
              onPress={() => toggleGoal(g.id)}
            >
              <ThemedText style={{ color: selected ? colors.tint : colors.text, fontWeight: '500' }}>
                {g.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.tint, opacity: canProceedStep1 ? 1 : 0.5 }]}
        onPress={() => canProceedStep1 && setStep(2)}
        disabled={!canProceedStep1}
      >
        <ThemedText style={styles.primaryButtonText}>Далее</ThemedText>
      </Pressable>
      <Pressable style={[styles.backLink, { borderColor: 'transparent' }]} onPress={() => { setStep(0); setHasPlanCode(null); }}>
        <ThemedText style={{ color: colors.text + '99', fontSize: 14 }}>← Назад</ThemedText>
      </Pressable>
    </View>
  );

  // Шаг 2: Данные о себе
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Укажите данные о себе
      </ThemedText>

      <ThemedText style={[styles.inputLabel, { color: colors.text + '99' }]}>Пол</ThemedText>
      <View style={styles.choiceRow}>
        {GENDERS.map((g) => {
          const selected = gender === g.id;
          return (
            <Pressable
              key={g.id}
              style={[
                styles.smallChip,
                {
                  backgroundColor: selected ? colors.tint + '25' : colors.background,
                  borderColor: selected ? colors.tint : colors.text + '30',
                },
              ]}
              onPress={() => setGender(g.id)}
            >
              <ThemedText style={{ color: selected ? colors.tint : colors.text, fontSize: 14 }}>
                {g.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText style={[styles.inputLabel, { color: colors.text + '99', marginTop: 16 }]}>Рост (см)</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background }]}
        value={heightCm}
        onChangeText={setHeightCm}
        placeholder="170"
        placeholderTextColor={colors.text + '60'}
        keyboardType="number-pad"
      />

      <ThemedText style={[styles.inputLabel, { color: colors.text + '99' }]}>Вес (кг)</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background }]}
        value={weightKg}
        onChangeText={setWeightKg}
        placeholder="70"
        placeholderTextColor={colors.text + '60'}
        keyboardType="decimal-pad"
      />

      <ThemedText style={[styles.inputLabel, { color: colors.text + '99' }]}>Возраст</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background }]}
        value={age}
        onChangeText={setAge}
        placeholder="25"
        placeholderTextColor={colors.text + '60'}
        keyboardType="number-pad"
      />

      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.tint, opacity: canProceedStep2 ? 1 : 0.5 }]}
        onPress={handleStep2Next}
        disabled={!canProceedStep2}
      >
        <ThemedText style={styles.primaryButtonText}>Далее</ThemedText>
      </Pressable>
      <Pressable style={[styles.backLink, { borderColor: 'transparent' }]} onPress={() => setStep(1)}>
        <ThemedText style={{ color: colors.text + '99', fontSize: 14 }}>← Назад</ThemedText>
      </Pressable>
    </View>
  );

  // Шаг 3: Дома или в зале
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Где занимаетесь?
      </ThemedText>
      <View style={styles.optionsGrid}>
        {LOCATIONS.map((loc) => {
          const selected = location === loc.id;
          return (
            <Pressable
              key={loc.id}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected ? colors.tint + '25' : colors.background,
                  borderColor: selected ? colors.tint : colors.text + '30',
                },
              ]}
              onPress={() => setLocation(loc.id)}
            >
              <ThemedText style={{ color: selected ? colors.tint : colors.text, fontWeight: '500' }}>
                {loc.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.tint, opacity: canProceedStep3 ? 1 : 0.5 }]}
        onPress={() => canProceedStep3 && setStep(4)}
        disabled={!canProceedStep3}
      >
        <ThemedText style={styles.primaryButtonText}>Показать планы</ThemedText>
      </Pressable>
      <Pressable style={[styles.backLink, { borderColor: 'transparent' }]} onPress={() => setStep(2)}>
        <ThemedText style={{ color: colors.text + '99', fontSize: 14 }}>← Назад</ThemedText>
      </Pressable>
    </View>
  );

  // Шаг 4: Список публичных планов из API
  const renderStep4 = () => {
    return (
      <View style={styles.stepContent}>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Публичные планы
        </ThemedText>
        <ThemedText style={[styles.stepHint, { color: colors.text + '99' }]}>
          Выберите план и нажмите, чтобы посмотреть детали и расписание.
        </ThemedText>

        {loadingPlans ? (
          <ThemedText style={[styles.emptyText, { color: colors.text + '99' }]}>
            Загрузка планов...
          </ThemedText>
        ) : publicPlans.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: colors.text + '99' }]}>
            Публичных планов пока нет.
          </ThemedText>
        ) : (
          <View style={styles.plansList}>
            {publicPlans.map((plan) => (
              <Pressable
                key={plan.id}
                style={[styles.planCard, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '40' }]}
                onPress={() => router.push(`/workout-plan-detail?planId=${encodeURIComponent(plan.id)}` as any)}
              >
                <ThemedText type="subtitle" style={[styles.planName, { color: colors.tint }]}>
                  {plan.title}
                </ThemedText>
                <ThemedText style={[styles.planDescription, { color: colors.text + 'CC' }]}>
                  {plan.description || ''}
                </ThemedText>
                <ThemedText style={[styles.planMeta, { color: colors.text + '99' }]}>
                  {plan.schedule?.length || 0} слотов в расписании
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable style={[styles.backLink, { borderColor: 'transparent', marginTop: 20 }]} onPress={() => setStep(3)}>
          <ThemedText style={{ color: colors.text + '99', fontSize: 14 }}>← Изменить параметры</ThemedText>
        </Pressable>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    marginBottom: 8,
  },
  stepHint: {
    fontSize: 14,
    marginBottom: 20,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  choiceButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  optionChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  smallChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 12,
  },
  backLink: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  plansList: {
    gap: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  planName: {
    marginBottom: 8,
    fontSize: 18,
  },
  planDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  planMeta: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
