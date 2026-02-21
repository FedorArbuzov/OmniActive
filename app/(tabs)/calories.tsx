import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SectionTitleWithTooltip } from '@/components/ui/section-title-with-tooltip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import {
    addFoodLogEntry,
    getFoodLog,
    type FoodLogEntry,
} from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Button,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type DayCard = {
  dateKey: string;
  dayLabel: string;
  dayNum: number;
  calories: number;
  entries: FoodLogEntry[];
};

function getLast7DaysWithData(log: FoodLogEntry[]): DayCard[] {
  const byDate: Record<string, FoodLogEntry[]> = {};
  for (const e of log) {
    const key = e.date.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  }
  const today = new Date();
  const cards: DayCard[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dayNum = d.getDate();
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const entries = byDate[dateKey] ?? [];
    const dayOfWeek = (d.getDay() + 6) % 7;
    cards.push({
      dateKey,
      dayLabel: WEEKDAYS[dayOfWeek],
      dayNum,
      calories: entries.reduce((s, e) => s + e.calories, 0),
      entries,
    });
  }
  return cards;
}

export default function CaloriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [dayCards, setDayCards] = useState<DayCard[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayCard | null>(null);
  const [copying, setCopying] = useState(false);

  const loadDays = useCallback(async () => {
    try {
      const log = await api.getFoodLog();
      setDayCards(getLast7DaysWithData(log));
    } catch (error) {
      console.error('Ошибка загрузки дневника питания:', error);
      // Fallback на локальное хранилище при ошибке API
      const log = await getFoodLog();
      setDayCards(getLast7DaysWithData(log));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDays();
    }, [loadDays])
  );

  const handleCopyToToday = useCallback(async () => {
    if (!selectedDay || selectedDay.entries.length === 0) {
      setSelectedDay(null);
      return;
    }
    setCopying(true);
    const today = new Date().toISOString();
    try {
      await Promise.all(
        selectedDay.entries.map((e) =>
          api.addFoodLogEntry({
            dishId: e.dishId,
            dishName: e.dishName,
            calories: e.calories,
            protein: e.protein,
            fats: e.fats,
            carbs: e.carbs,
            date: today,
          })
        )
      );
    } catch (error) {
      console.error('Ошибка копирования записей:', error);
      // Fallback на локальное хранилище при ошибке API
      await Promise.all(
        selectedDay.entries.map((e) =>
          addFoodLogEntry({
            dishId: e.dishId,
            dishName: e.dishName,
            calories: e.calories,
            protein: e.protein,
            fats: e.fats,
            carbs: e.carbs,
            date: today,
          })
        )
      );
    }
    setCopying(false);
    setSelectedDay(null);
    loadDays();
  }, [selectedDay, loadDays]);

  return (
    <ParallaxScrollView>
      <ThemedView style={styles.titleContainer}>
        <SectionTitleWithTooltip
          title="Подсчёт калорий"
          tooltipText="Создавайте блюда с БЖУ и добавляйте приёмы пищи в дневник."
        />
      </ThemedView>
      <ThemedText style={{ marginBottom: 24 }}>
        Создавайте блюда и ведите дневник питания
      </ThemedText>

      <ThemedView style={styles.section}>
        <Button
          title="Создать блюдо"
          onPress={() => router.push('/create-dish' as any)}
          color={colors.tint}
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <Button
          title="Добавить что съел"
          onPress={() => router.push('/add-food' as any)}
          color={colors.tint}
        />
      </ThemedView>

      <ThemedView style={styles.section}>
        <Pressable onPress={() => router.push('/calories-stats' as any)}>
          <ThemedText type="link">Показать статистику</ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView style={[styles.section, styles.repeatSection]}>
        <ThemedText type="subtitle" style={styles.repeatTitle}>
          Повторить прошлый день
        </ThemedText>
        <View style={styles.cardsRow}>
          {dayCards.map((card) => (
            <Pressable
              key={card.dateKey}
              style={[
                styles.dayCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + '25',
                },
              ]}
              onPress={() => setSelectedDay(card)}
            >
              <ThemedText style={styles.dayCardHeader}>
                {card.dayLabel}, {card.dayNum}
              </ThemedText>
              <ThemedText style={[styles.dayCardCal, { color: colors.tint }]}>
                {card.calories} ккал
              </ThemedText>
              <ThemedText
                style={[styles.dayCardDishes, { color: colors.text + 'cc' }]}
                numberOfLines={3}
              >
                {card.entries.length === 0
                  ? '—'
                  : card.entries.map((e) => e.dishName).join(', ')}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <Modal
        visible={!!selectedDay}
        transparent
        animationType="fade"
        onRequestClose={() => !copying && setSelectedDay(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !copying && setSelectedDay(null)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.background, borderColor: colors.text + '20' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Записать рацион за сегодня?
            </ThemedText>
            {selectedDay && selectedDay.entries.length > 0 && (
              <ScrollView
                style={styles.modalDishes}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {selectedDay.entries.map((e) => (
                  <ThemedText
                    key={e.id}
                    style={[styles.modalDishItem, { color: colors.text + 'cc' }]}
                  >
                    • {e.dishName} — {e.calories} ккал
                  </ThemedText>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  { borderColor: colors.text + '40' },
                ]}
                onPress={() => !copying && setSelectedDay(null)}
                disabled={copying}
              >
                <ThemedText style={[styles.modalButtonTextSecondary, { color: colors.text }]}>
                  Нет
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.tint },
                  copying && styles.modalButtonDisabled,
                ]}
                onPress={handleCopyToToday}
                disabled={copying || !selectedDay?.entries.length}
              >
                <ThemedText style={styles.modalButtonTextPrimary}>
                  {copying ? '…' : 'Да'}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
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
    marginTop: 16,
  },
  repeatSection: {
    marginTop: 24,
  },
  repeatTitle: {
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayCard: {
    width: '47%',
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  dayCardHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayCardCal: {
    fontSize: 13,
    marginBottom: 6,
  },
  dayCardDishes: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDishes: {
    maxHeight: 200,
    marginBottom: 16,
  },
  modalDishItem: {
    fontSize: 14,
    marginBottom: 4,
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
