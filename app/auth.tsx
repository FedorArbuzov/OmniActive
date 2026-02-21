import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { saveAuthToken, saveUserEmail } from '@/utils/storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, Pressable, StyleSheet, TextInput, View } from 'react-native';

/**
 * Экран авторизации
 * Показывается когда пользователь не авторизован
 */
export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isLogin, setIsLogin] = useState(true); // true = вход, false = регистрация
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    // Валидация пароля
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 6 символов');
      return;
    }

    // Проверка подтверждения пароля при регистрации
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    try {
      let response;
      
      if (isLogin) {
        // Вход
        response = await api.login({ email, password });
      } else {
        // Регистрация
        const registerData: api.RegisterRequest = { 
          email, 
          password,
          ...(referralCode.trim() && { referral_code: referralCode.trim() })
        };
        response = await api.register(registerData);
      }
      
      // Сохраняем токен и email локально
      await saveAuthToken(response.token);
      await saveUserEmail(response.user.email);

      // Сразу переходим на главный экран (onPress в Alert на web может не вызываться)
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error(`Ошибка при ${isLogin ? 'авторизации' : 'регистрации'}:`, error);
      
      const errorMessage = error?.message || `Ошибка при ${isLogin ? 'авторизации' : 'регистрации'}`;
      
      // Fallback на мок-авторизацию при ошибке API (для разработки)
      if (errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        Alert.alert(
          'Ошибка подключения',
          'Не удалось подключиться к серверу. Используется режим разработки.',
          [
            {
              text: 'Продолжить',
              onPress: async () => {
                try {
                  const mockToken = 'mock_token_' + Date.now();
                  await saveAuthToken(mockToken);
                  await saveUserEmail(email);
                  router.replace('/(tabs)');
                } catch (fallbackError) {
                  Alert.alert('Ошибка', 'Не удалось войти');
                }
              }
            },
            { text: 'Отмена', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Ошибка', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {isLogin ? 'Вход' : 'Регистрация'}
        </ThemedText>
        
        <TextInput
          style={[styles.input, { 
            color: colors.text, 
            borderColor: colors.text + '40',
            backgroundColor: colors.background 
          }]}
          placeholder="Email"
          placeholderTextColor={colors.text + '80'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        
        <TextInput
          style={[styles.input, { 
            color: colors.text, 
            borderColor: colors.text + '40',
            backgroundColor: colors.background 
          }]}
          placeholder="Пароль"
          placeholderTextColor={colors.text + '80'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isLogin ? 'password' : 'password-new'}
        />

        {!isLogin && (
          <>
            <TextInput
              style={[styles.input, { 
                color: colors.text, 
                borderColor: colors.text + '40',
                backgroundColor: colors.background 
              }]}
              placeholder="Подтвердите пароль"
              placeholderTextColor={colors.text + '80'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
            />
            
            <TextInput
              style={[styles.input, { 
                color: colors.text, 
                borderColor: colors.text + '40',
                backgroundColor: colors.background 
              }]}
              placeholder="У меня есть код (опционально)"
              placeholderTextColor={colors.text + '80'}
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </>
        )}
        
        <View style={styles.buttonContainer}>
          <Button
            title={isLoading ? (isLogin ? 'Вход...' : 'Регистрация...') : (isLogin ? 'Войти' : 'Зарегистрироваться')}
            onPress={handleSubmit}
            disabled={isLoading}
            color={colors.tint}
          />
        </View>

        <Pressable
          style={styles.switchButton}
          onPress={() => {
            setIsLogin(!isLogin);
            setPassword('');
            setConfirmPassword('');
            setReferralCode('');
          }}
          disabled={isLoading}>
          <ThemedText style={[styles.switchText, { color: colors.tint }]}>
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </ThemedText>
        </Pressable>
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  switchButton: {
    padding: 12,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
