import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { Dish, getAllDishes } from '@/utils/storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AddFoodScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [search, setSearch] = useState('');

  const loadDishes = useCallback(async () => {
    try {
      const list = await api.getAllDishes();
      setDishes(list);
    } catch (error) {
      console.error('Ошибка загрузки блюд:', error);
      // Fallback на локальное хранилище при ошибке API
      const list = await getAllDishes();
      setDishes(list);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDishes();
    }, [loadDishes])
  );

  const filtered = search.trim()
    ? dishes.filter(
        d =>
          d.name.toLowerCase().includes(search.toLowerCase().trim())
      )
    : dishes;

  const onPressDish = (dish: Dish) => {
    const query = date ? `dishId=${dish.id}&date=${encodeURIComponent(date)}` : `dishId=${dish.id}`;
    router.push(`/dish-add?${query}` as any);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.text + '30' }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Поиск блюд..."
          placeholderTextColor={colors.text + '60'}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {filtered.length === 0 ? (
        <ThemedView style={styles.empty}>
          <ThemedText style={styles.emptyText}>
            {dishes.length === 0
              ? 'Нет блюд. Создайте блюдо на экране «Подсчёт калорий».'
              : 'По запросу ничего не найдено'}
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.background, borderColor: colors.text + '20' }]}
              onPress={() => onPressDish(item)}
              activeOpacity={0.7}>
              <ThemedText type="defaultSemiBold" style={styles.itemName}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.itemKcal, { color: colors.text + '80' }]}>
                {item.calories} ккал · Б: {item.protein} Ж: {item.fats} У: {item.carbs}
              </ThemedText>
            </TouchableOpacity>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  item: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 17,
    marginBottom: 4,
  },
  itemKcal: {
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.8,
  },
});
