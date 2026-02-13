import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { saveAuthToken } from '@/utils/storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Button, StyleSheet, TextInput, View } from 'react-native';

/**
 * Экран авторизации
 * Показывается когда пользователь не авторизован
 */
export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Заполните все поля');
      return;
    }

    setIsLoading(true);
    try {
      // Здесь должна быть реальная логика авторизации
      // Для примера просто сохраняем токен
      const mockToken = 'mock_token_' + Date.now();
      await saveAuthToken(mockToken);
      
      // Переходим на главный экран
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      alert('Ошибка при авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Вход
        </ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <Button
          title={isLoading ? 'Вход...' : 'Войти'}
          onPress={handleLogin}
          disabled={isLoading}
          color={colors.tint}
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
  },
  title: {
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
});
