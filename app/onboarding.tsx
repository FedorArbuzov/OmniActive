import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setFirstLaunchComplete } from '@/utils/storage';
import { router } from 'expo-router';
import React from 'react';
import { Button, StyleSheet, View } from 'react-native';

/**
 * Экран первого запуска приложения
 * Показывается только при первом запуске
 */
export default function OnboardingScreen() {
  const handleGetStarted = async () => {
    // Отмечаем, что первый запуск завершен
    await setFirstLaunchComplete();
    // Переходим на экран авторизации
    router.replace('/auth' as any);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Добро пожаловать!
        </ThemedText>
        <ThemedText style={styles.description}>
          Это ваш первый запуск приложения. Здесь можно разместить инструкции или приветствие.
        </ThemedText>
        <Button
          title="Начать"
          onPress={handleGetStarted}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
