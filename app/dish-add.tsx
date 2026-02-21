import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { addFoodLogEntry, getDishById } from '@/utils/storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatDateLabel(dateKey: string): string {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (dateKey === todayKey) return 'Сегодня';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateKey === yesterdayKey) return 'Вчера';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = (date.getDay() + 6) % 7;
  return `${WEEKDAYS[dayOfWeek]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function getDateOptions(): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];
  for (let i = -90; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    options.push({ key, label: formatDateLabel(key) });
  }
  return options;
}

export default function DishAddScreen() {
  const { dishId, date: dateParam } = useLocalSearchParams<{ dishId: string; date?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [dish, setDish] = useState<Awaited<ReturnType<typeof getDishById>>>(null);
  const [loading, setLoading] = useState(true);
  const dateOptions = useMemo(getDateOptions, []);
  const defaultDateKey = (() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();
  const [selectedDateKey, setSelectedDateKey] = useState(defaultDateKey);
  const [showDateModal, setShowDateModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!dishId) return;
      try {
        const d = await api.getDishById(dishId);
        if (!cancelled) {
          setDish(d);
        }
      } catch (error) {
        console.error('Ошибка загрузки блюда:', error);
        // Fallback на локальное хранилище при ошибке API
        const d = await getDishById(dishId);
        if (!cancelled) {
          setDish(d);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dishId]);

  const dateTimeStr = `${selectedDateKey}T12:00:00.000Z`;

  const handleAdd = async () => {
    if (!dish) return;
    try {
      await api.addFoodLogEntry({
        dishId: dish.id,
        dishName: dish.name,
        calories: dish.calories,
        protein: dish.protein,
        fats: dish.fats,
        carbs: dish.carbs,
        date: dateTimeStr,
      });
      router.back();
    } catch (error) {
      console.error('Ошибка добавления записи:', error);
      await addFoodLogEntry({
        dishId: dish.id,
        dishName: dish.name,
        calories: dish.calories,
        protein: dish.protein,
        fats: dish.fats,
        carbs: dish.carbs,
        date: dateTimeStr,
      });
      router.back();
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!dish) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Блюдо не найдено</ThemedText>
        <Button title="Назад" onPress={() => router.back()} color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}>
        <ThemedText type="title" style={styles.name}>
          {dish.name}
        </ThemedText>
        <Pressable
          style={[styles.dateRow, { backgroundColor: colors.text + '10', borderColor: colors.text + '25' }]}
          onPress={() => setShowDateModal(true)}
        >
          <ThemedText style={styles.dateLabel}>Дата</ThemedText>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            {formatDateLabel(selectedDateKey)}
          </ThemedText>
        </Pressable>
        <ThemedText style={[styles.row, { color: colors.text + '90' }]}>
          Калории: {dish.calories} ккал
        </ThemedText>
        <ThemedText style={[styles.row, { color: colors.text + '90' }]}>
          Белки: {dish.protein} г
        </ThemedText>
        <ThemedText style={[styles.row, { color: colors.text + '90' }]}>
          Жиры: {dish.fats} г
        </ThemedText>
        <ThemedText style={[styles.row, { color: colors.text + '90' }]}>
          Углеводы: {dish.carbs} г
        </ThemedText>
      </View>
      <View style={styles.buttonWrap}>
        <Button title="Добавить" onPress={handleAdd} color={colors.tint} />
      </View>

      <Modal visible={showDateModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDateModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Выберите день
            </ThemedText>
            <FlatList
              data={dateOptions}
              keyExtractor={(item) => item.key}
              style={styles.dateList}
              initialNumToRender={20}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.dateItem,
                    { borderBottomColor: colors.text + '15' },
                    item.key === selectedDateKey && { backgroundColor: colors.tint + '25' },
                  ]}
                  onPress={() => {
                    setSelectedDateKey(item.key);
                    setShowDateModal(false);
                  }}
                >
                  <ThemedText style={item.key === selectedDateKey ? { color: colors.tint, fontWeight: '600' } : undefined}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  name: {
    marginBottom: 16,
    fontSize: 22,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
    opacity: 0.9,
  },
  row: {
    fontSize: 16,
    marginBottom: 8,
  },
  buttonWrap: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    marginBottom: 12,
  },
  dateList: {
    maxHeight: 320,
  },
  dateItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
});
