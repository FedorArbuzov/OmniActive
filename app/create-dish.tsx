import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { addFoodLogEntry, Dish, saveDish } from '@/utils/storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

export default function CreateDishScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fats, setFats] = useState('');
  const [carbs, setCarbs] = useState('');

  const parseOptionalNum = (s: string): number => {
    const n = parseFloat(s);
    return (s.trim() === '' || isNaN(n) || n < 0) ? 0 : n;
  };

  const buildDish = (): Dish | null => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      alert('Введите название блюда');
      return null;
    }
    const cal = parseFloat(calories);
    if (isNaN(cal) || cal < 0) {
      alert('Введите корректные калории (0 или больше)');
      return null;
    }
    const prot = parseOptionalNum(protein);
    const f = parseOptionalNum(fats);
    const c = parseOptionalNum(carbs);

    return {
      id: Date.now().toString(),
      name: nameTrim,
      calories: cal,
      protein: prot,
      fats: f,
      carbs: c,
      createdAt: new Date().toISOString(),
    };
  };

  const handleSave = async () => {
    const dish = buildDish();
    if (!dish) return;
    try {
      await api.saveDish(dish);
      router.back();
    } catch (error) {
      console.error('Ошибка сохранения блюда:', error);
      // Fallback на локальное хранилище при ошибке API
      await saveDish(dish);
      router.back();
    }
  };

  const handleSaveAndAddToDiet = async () => {
    const dish = buildDish();
    if (!dish) return;
    try {
      await api.saveDish(dish);
      await api.addFoodLogEntry({
        dishId: dish.id,
        dishName: dish.name,
        calories: dish.calories,
        protein: dish.protein,
        fats: dish.fats,
        carbs: dish.carbs,
        date: new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      console.error('Ошибка сохранения блюда и записи:', error);
      // Fallback на локальное хранилище при ошибке API
      await saveDish(dish);
      await addFoodLogEntry({
        dishId: dish.id,
        dishName: dish.name,
        calories: dish.calories,
        protein: dish.protein,
        fats: dish.fats,
        carbs: dish.carbs,
        date: new Date().toISOString(),
      });
      router.back();
    }
  };

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Название</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="Например: Овсянка"
            placeholderTextColor={colors.text + '60'}
            value={name}
            onChangeText={setName}
          />
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Калории (ккал)</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="0"
            placeholderTextColor={colors.text + '60'}
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Белки (г)</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="0"
            placeholderTextColor={colors.text + '60'}
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
          />
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Жиры (г)</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="0"
            placeholderTextColor={colors.text + '60'}
            value={fats}
            onChangeText={setFats}
            keyboardType="numeric"
          />
        </ThemedView>
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Углеводы (г)</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="0"
            placeholderTextColor={colors.text + '60'}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
          />
        </ThemedView>
        <ThemedView style={styles.buttons}>
          <Button title="Сохранить блюдо" onPress={handleSave} color={colors.tint} />
          <View style={styles.secondButton}>
            <Button
              title="Сохранить и добавить в рацион"
              onPress={handleSaveAndAddToDiet}
              color={colors.tint}
            />
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  buttons: {
    marginTop: 24,
  },
  secondButton: {
    marginTop: 12,
  },
});
