import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionTitleWithTooltip } from '@/components/ui/section-title-with-tooltip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import {
  getRunActivityMode,
  getRunDailyActivityLog,
  getRunDailyPalForDate,
  getRunFixedPal,
  getStepsForDate,
  getStepsLog,
  saveStepsEntry,
  setRunActivityMode,
  setRunDailyActivityForDate,
  setRunFixedPal,
  type RunActivityMode,
  type StepsEntry,
} from '@/utils/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** Варианты активности для режима «выбор в конце дня» (PAL + подпись) */
const DAILY_ACTIVITY_OPTIONS: { pal: number; label: string }[] = [
  { pal: 1.2, label: 'Сидячий образ жизни' },
  { pal: 1.3, label: 'Лёгкая активность' },
  { pal: 1.4, label: 'Умеренная активность' },
  { pal: 1.5, label: 'Активный день' },
  { pal: 1.6, label: 'Очень активный' },
  { pal: 1.7, label: 'Спортсмен' },
];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(d: Date): string {
  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function isToday(d: Date): boolean {
  return dateKey(d) === dateKey(new Date());
}

function isFuture(d: Date): boolean {
  return d > new Date();
}

export default function RunScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activityMode, setActivityModeState] = useState<RunActivityMode | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [stepsInput, setStepsInput] = useState('');
  const [savedSteps, setSavedSteps] = useState<number | null>(null);
  const [recentEntries, setRecentEntries] = useState<StepsEntry[]>([]);

  const [fixedPalInput, setFixedPalInput] = useState('');
  const [fixedPalSaved, setFixedPalSaved] = useState<number | null>(null);

  const [dailyLog, setDailyLogState] = useState<Record<string, number>>({});
  const [selectedDailyPal, setSelectedDailyPal] = useState<number | null>(null);

  const loadMode = useCallback(async () => {
    try {
      const mode = await api.getRunActivityMode();
      setActivityModeState(mode);
    } catch (error) {
      console.error('Ошибка загрузки режима активности:', error);
      // Fallback на локальное хранилище при ошибке API
      const mode = await getRunActivityMode();
      setActivityModeState(mode);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const mode = await api.getRunActivityMode();
      setActivityModeState(mode);
      if (mode === 'fixed') {
        const pal = await api.getRunFixedPal();
        setFixedPalSaved(pal);
        setFixedPalInput(pal != null ? String(pal) : '');
      }
      if (mode === 'daily') {
        const log = await api.getRunDailyActivityLog();
        setDailyLogState(log);
        const key = dateKey(selectedDate);
        const forDate = log[key] ?? (await api.getRunDailyPalForDate(key));
        setSelectedDailyPal(forDate ?? null);
      }
      if (mode === 'steps_workouts') {
        const key = dateKey(selectedDate);
        const steps = await api.getStepsForDate(key);
        setSavedSteps(steps);
        setStepsInput(steps != null ? String(steps) : '');
        const entries = await api.getStepsLog(10);
        setRecentEntries(entries);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных активности:', error);
      // Fallback на локальное хранилище при ошибке API
      const mode = await getRunActivityMode();
      setActivityModeState(mode);
      if (mode === 'fixed') {
        const pal = await getRunFixedPal();
        setFixedPalSaved(pal);
        setFixedPalInput(pal != null ? String(pal) : '');
      }
      if (mode === 'daily') {
        const log = await getRunDailyActivityLog();
        setDailyLogState(log);
        const key = dateKey(selectedDate);
        const forDate = log[key] ?? (await getRunDailyPalForDate(key));
        setSelectedDailyPal(forDate ?? null);
      }
      if (mode === 'steps_workouts') {
        const key = dateKey(selectedDate);
        const steps = await getStepsForDate(key);
        setSavedSteps(steps);
        setStepsInput(steps != null ? String(steps) : '');
        const entries = await getStepsLog(10);
        setRecentEntries(entries);
      }
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadMode().then(() => setLoading(false));
  }, [loadMode]);

  useEffect(() => {
    if (activityMode == null) return;
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [activityMode, loadData]);

  const chooseMode = useCallback(async (mode: RunActivityMode) => {
    try {
      await api.setRunActivityMode(mode);
      setActivityModeState(mode);
      setLoading(true);
      if (mode === 'fixed') {
        const pal = await api.getRunFixedPal();
        setFixedPalSaved(pal);
        setFixedPalInput(pal != null ? String(pal) : '');
      }
      if (mode === 'daily') {
        const log = await api.getRunDailyActivityLog();
        setDailyLogState(log);
        const key = dateKey(selectedDate);
        setSelectedDailyPal(log[key] ?? (await api.getRunDailyPalForDate(key)) ?? null);
      }
      if (mode === 'steps_workouts') {
        const key = dateKey(selectedDate);
        const steps = await api.getStepsForDate(key);
        setSavedSteps(steps);
        setStepsInput(steps != null ? String(steps) : '');
        const entries = await api.getStepsLog(10);
        setRecentEntries(entries);
      }
    } catch (error) {
      console.error('Ошибка установки режима активности:', error);
      // Fallback на локальное хранилище при ошибке API
      await setRunActivityMode(mode);
      setActivityModeState(mode);
      setLoading(true);
      if (mode === 'fixed') {
        const pal = await getRunFixedPal();
        setFixedPalSaved(pal);
        setFixedPalInput(pal != null ? String(pal) : '');
      }
      if (mode === 'daily') {
        const log = await getRunDailyActivityLog();
        setDailyLogState(log);
        const key = dateKey(selectedDate);
        setSelectedDailyPal(log[key] ?? (await getRunDailyPalForDate(key)) ?? null);
      }
      if (mode === 'steps_workouts') {
        const key = dateKey(selectedDate);
        const steps = await getStepsForDate(key);
        setSavedSteps(steps);
        setStepsInput(steps != null ? String(steps) : '');
        const entries = await getStepsLog(10);
        setRecentEntries(entries);
      }
    }
    setLoading(false);
  }, [selectedDate]);

  const changeMode = useCallback(async () => {
    try {
      await api.setRunActivityMode(null as unknown as RunActivityMode);
      setActivityModeState(null);
    } catch (error) {
      console.error('Ошибка сброса режима активности:', error);
      // Fallback на локальное хранилище при ошибке API
      await setRunActivityMode(null as unknown as RunActivityMode);
      setActivityModeState(null);
    }
  }, []);

  const changeDate = useCallback((delta: number) => {
    setSelectedDate((prev) => addDays(prev, delta));
  }, []);

  const handleSaveSteps = useCallback(async () => {
    const raw = stepsInput.trim();
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert('Ошибка', 'Введите корректное число шагов (целое неотрицательное).');
      return;
    }
    const key = dateKey(selectedDate);
    try {
      await api.saveStepsEntry(key, parsed);
      setSavedSteps(parsed);
      Keyboard.dismiss();
      const entries = await api.getStepsLog(10);
      setRecentEntries(entries);
    } catch (error) {
      console.error('Ошибка сохранения шагов:', error);
      // Fallback на локальное хранилище при ошибке API
      await saveStepsEntry(key, parsed);
      setSavedSteps(parsed);
      Keyboard.dismiss();
      const entries = await getStepsLog(10);
      setRecentEntries(entries);
    }
  }, [selectedDate, stepsInput]);

  const handleSaveFixedPal = useCallback(async () => {
    const raw = fixedPalInput.trim().replace(',', '.');
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 2.5) {
      Alert.alert('Ошибка', 'Введите коэффициент активности от 1.0 до 2.5 (например 1.2 или 1.4).');
      return;
    }
    try {
      await api.setRunFixedPal(parsed);
      setFixedPalSaved(parsed);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Ошибка сохранения фиксированного PAL:', error);
      // Fallback на локальное хранилище при ошибке API
      await setRunFixedPal(parsed);
      setFixedPalSaved(parsed);
      Keyboard.dismiss();
    }
  }, [fixedPalInput]);

  const handleSelectDailyPal = useCallback(async (pal: number) => {
    const key = dateKey(selectedDate);
    try {
      await api.setRunDailyActivityForDate(key, pal);
      setDailyLogState((prev) => ({ ...prev, [key]: pal }));
      setSelectedDailyPal(pal);
    } catch (error) {
      console.error('Ошибка сохранения ежедневного PAL:', error);
      // Fallback на локальное хранилище при ошибке API
      await setRunDailyActivityForDate(key, pal);
      setDailyLogState((prev) => ({ ...prev, [key]: pal }));
      setSelectedDailyPal(pal);
    }
  }, [selectedDate]);

  const selectDateFromEntry = useCallback((entry: StepsEntry) => {
    const [y, m, d] = entry.date.split('-').map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  }, []);

  const today = new Date();
  const canGoNext = !isFuture(addDays(selectedDate, 1));

  if (loading && activityMode != null) {
    return (
      <ParallaxScrollView>
        <ThemedView style={styles.titleContainer}>
          <SectionTitleWithTooltip
            title="Активность"
            tooltipText="Учёт дневной активности для расчёта калорий."
          />
        </ThemedView>
        <ThemedView style={styles.loadingPlaceholder}>
          <ThemedText style={{ opacity: 0.7 }}>Загрузка…</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (activityMode == null) {
    return (
      <ParallaxScrollView>
        <ThemedView style={styles.titleContainer}>
          <SectionTitleWithTooltip
            title="Активность"
            tooltipText="Выберите способ учёта активности. Потом его можно изменить."
          />
        </ThemedView>
        <ThemedText style={[styles.modeHint, { color: colors.text + '99' }]}>
          Как вы хотите учитывать активность?
        </ThemedText>
        <View style={styles.modeCards}>
          <Pressable
            style={[styles.modeCard, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}
            onPress={() => chooseMode('fixed')}>
            <ThemedText type="defaultSemiBold" style={[styles.modeCardTitle, { color: colors.tint }]}>
              Один коэффициент
            </ThemedText>
            <ThemedText style={[styles.modeCardDesc, { color: colors.text + '99' }]}>
              Укажите средний уровень активности (1.2, 1.3, 1.4…) — он будет использоваться каждый день.
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.modeCard, styles.modeCardPopular, { backgroundColor: colors.tint + '22', borderColor: colors.tint }]}
            onPress={() => chooseMode('daily')}>
            <View style={[styles.popularBadge, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.popularBadgeText}>Популярный</ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={[styles.modeCardTitle, { color: colors.tint }]}>
              Выбор в конце дня
            </ThemedText>
            <ThemedText style={[styles.modeCardDesc, { color: colors.text + '99' }]}>
              Заходите на экран в конце дня и выбирайте, какая сегодня была активность. Если не ввели — берётся вчерашняя.
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.modeCard, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}
            onPress={() => chooseMode('steps_workouts')}>
            <ThemedText type="defaultSemiBold" style={[styles.modeCardTitle, { color: colors.tint }]}>
              Шаги и тренировки
            </ThemedText>
            <ThemedText style={[styles.modeCardDesc, { color: colors.text + '99' }]}>
              Вводите шаги за день; тренировки, которые вы добавляете в приложении, учитываются автоматически.
            </ThemedText>
          </Pressable>
        </View>
      </ParallaxScrollView>
    );
  }

  if (activityMode === 'fixed') {
    return (
      <ParallaxScrollView>
        <ThemedView style={styles.titleContainer}>
          <SectionTitleWithTooltip
            title="Активность"
            tooltipText="Коэффициент активности (PAL) для расчёта расхода калорий."
          />
        </ThemedView>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}>
          <ThemedText style={[styles.hint, { color: colors.text + '99' }]}>
            Укажите ваш средний коэффициент активности (1.0 — минимум, 2.5 — очень высокая нагрузка). Обычно: 1.2 — сидячий, 1.4 — умеренный, 1.6 — активный.
          </ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.palInput,
                { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background },
              ]}
              value={fixedPalInput}
              onChangeText={setFixedPalInput}
              placeholder="1.2"
              placeholderTextColor={colors.text + '60'}
              keyboardType="decimal-pad"
              maxLength={4}
            />
          </View>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
            onPress={handleSaveFixedPal}>
            <ThemedText style={styles.saveButtonText}>Сохранить</ThemedText>
          </Pressable>
          {fixedPalSaved != null && (
            <ThemedText style={[styles.savedHint, { color: colors.text + '80' }]}>
              Сохранено: {fixedPalSaved}
            </ThemedText>
          )}
          <Pressable onPress={changeMode} style={styles.changeModeLink}>
            <ThemedText style={{ color: colors.tint, fontSize: 14 }}>Изменить способ учёта активности</ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </ParallaxScrollView>
    );
  }

  if (activityMode === 'daily') {
    const key = dateKey(selectedDate);
    const yesterdayKey = dateKey(addDays(selectedDate, -1));
    const fromYesterday = dailyLog[key] == null && dailyLog[yesterdayKey] != null;

    return (
      <ParallaxScrollView>
        <ThemedView style={styles.titleContainer}>
          <SectionTitleWithTooltip
            title="Активность"
            tooltipText="Выберите уровень активности за выбранный день. Если не выбирали — используется вчерашнее значение."
          />
        </ThemedView>
        <View style={styles.content}>
          <ThemedText style={[styles.hint, { color: colors.text + '99' }]}>
            Выберите дату и отметьте, какая была активность в этот день.
          </ThemedText>
          <View style={[styles.dateRow, { backgroundColor: colors.tint + '15' }]}>
            <Pressable
              style={[styles.dateButton, { borderColor: colors.tint }]}
              onPress={() => changeDate(-1)}>
              <IconSymbol size={20} name="chevron.left" color={colors.tint} />
            </Pressable>
            <ThemedText type="subtitle" style={[styles.dateText, { color: colors.tint }]}>
              {formatDateDisplay(selectedDate)}
              {isToday(selectedDate) ? ' (сегодня)' : ''}
            </ThemedText>
            <Pressable
              style={[
                styles.dateButton,
                { borderColor: canGoNext ? colors.tint : colors.text + '40' },
                !canGoNext && styles.dateButtonDisabled,
              ]}
              onPress={() => canGoNext && changeDate(1)}
              disabled={!canGoNext}>
              <IconSymbol
                size={20}
                name="chevron.right"
                color={canGoNext ? colors.tint : colors.text + '40'}
              />
            </Pressable>
          </View>
          {fromYesterday && (
            <ThemedText style={[styles.yesterdayHint, { color: colors.tint }]}>
              Для этого дня не задано — показываем вчерашнее значение
            </ThemedText>
          )}
          <View style={styles.dailyOptions}>
            {DAILY_ACTIVITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.pal}
                style={[
                  styles.dailyOption,
                  { backgroundColor: selectedDailyPal === opt.pal ? colors.tint + '25' : colors.tint + '12', borderColor: selectedDailyPal === opt.pal ? colors.tint : colors.tint + '30' },
                ]}
                onPress={() => handleSelectDailyPal(opt.pal)}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                  {opt.pal} — {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={changeMode} style={styles.changeModeLink}>
            <ThemedText style={{ color: colors.tint, fontSize: 14 }}>Изменить способ учёта активности</ThemedText>
          </Pressable>
        </View>
      </ParallaxScrollView>
    );
  }

  // steps_workouts
  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <SectionTitleWithTooltip
          title="Шаги и тренировки"
          tooltipText="Введите шаги за день. Тренировки, которые вы добавляете в приложении, учитываются автоматически при расчёте калорий."
        />
      </ThemedView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}>
        <ThemedText style={[styles.hint, { color: colors.text + '99' }]}>
          Выберите дату и введите количество шагов. Учтённые тренировки подтягиваются из раздела тренировок.
        </ThemedText>

        <View style={[styles.dateRow, { backgroundColor: colors.tint + '15' }]}>
          <Pressable
            style={[styles.dateButton, { borderColor: colors.tint }]}
            onPress={() => changeDate(-1)}>
            <IconSymbol size={20} name="chevron.left" color={colors.tint} />
          </Pressable>
          <ThemedText type="subtitle" style={[styles.dateText, { color: colors.tint }]}>
            {formatDateDisplay(selectedDate)}
            {isToday(selectedDate) ? ' (сегодня)' : ''}
          </ThemedText>
          <Pressable
            style={[
              styles.dateButton,
              { borderColor: canGoNext ? colors.tint : colors.text + '40' },
              !canGoNext && styles.dateButtonDisabled,
            ]}
            onPress={() => canGoNext && changeDate(1)}
            disabled={!canGoNext}>
            <IconSymbol
              size={20}
              name="chevron.right"
              color={canGoNext ? colors.tint : colors.text + '40'}
            />
          </Pressable>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.stepsInput,
              { color: colors.text, borderColor: colors.tint + '50', backgroundColor: colors.background },
            ]}
            value={stepsInput}
            onChangeText={setStepsInput}
            placeholder="0"
            placeholderTextColor={colors.text + '60'}
            keyboardType="number-pad"
            maxLength={8}
          />
          <ThemedText style={styles.stepsLabel}>шагов</ThemedText>
        </View>

        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSaveSteps}>
          <ThemedText style={styles.saveButtonText}>Сохранить</ThemedText>
        </Pressable>

        {savedSteps != null && (
          <ThemedText style={[styles.savedHint, { color: colors.text + '80' }]}>
            Сохранено: {savedSteps.toLocaleString('ru-RU')} шагов за этот день
          </ThemedText>
        )}

        {recentEntries.length > 0 && (
          <View style={styles.recentSection}>
            <ThemedText type="defaultSemiBold" style={styles.recentTitle}>
              Последние записи шагов
            </ThemedText>
            {recentEntries.map((entry) => (
              <Pressable
                key={entry.id}
                style={[styles.recentItem, { backgroundColor: colors.tint + '12' }]}
                onPress={() => selectDateFromEntry(entry)}>
                <ThemedText style={[styles.recentDate, { color: colors.text + '90' }]}>
                  {entry.date} • {entry.steps.toLocaleString('ru-RU')} шагов
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={changeMode} style={styles.changeModeLink}>
          <ThemedText style={{ color: colors.tint, fontSize: 14 }}>Изменить способ учёта активности</ThemedText>
        </Pressable>
      </KeyboardAvoidingView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingPlaceholder: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modeHint: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
  },
  modeCards: {
    gap: 16,
  },
  modeCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  modeCardPopular: {
    position: 'relative',
    paddingTop: 36,
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modeCardTitle: {
    fontSize: 17,
    marginBottom: 8,
  },
  modeCardDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    marginTop: 8,
  },
  hint: {
    marginBottom: 16,
    opacity: 0.9,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonDisabled: {
    opacity: 0.5,
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
  },
  yesterdayHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  palInput: {
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stepsInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stepsLabel: {
    fontSize: 18,
    opacity: 0.8,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savedHint: {
    fontSize: 14,
    marginBottom: 24,
  },
  changeModeLink: {
    marginTop: 16,
    marginBottom: 24,
  },
  dailyOptions: {
    gap: 10,
    marginBottom: 16,
  },
  dailyOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  recentSection: {
    marginTop: 8,
  },
  recentTitle: {
    marginBottom: 12,
  },
  recentItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  recentDate: {
    fontSize: 15,
  },
});
