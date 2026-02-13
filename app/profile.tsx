import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { clearAuth } from '@/utils/storage';
import { router } from 'expo-router';
import React from 'react';
import { Button, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const handleLogout = async () => {
    try {
      await clearAuth();
      router.replace('/auth' as any);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Профиль
      </ThemedText>
      <ThemedText style={styles.description}>
        Настройки и данные аккаунта
      </ThemedText>
      <ThemedView style={styles.section}>
        <Button
          title="Выйти из аккаунта"
          onPress={handleLogout}
          color="#ff3b30"
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    marginBottom: 8,
    fontSize: 28,
  },
  description: {
    marginBottom: 32,
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginTop: 16,
  },
});
