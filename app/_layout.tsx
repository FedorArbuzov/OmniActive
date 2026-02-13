import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAuthenticated as checkAuth, isFirstLaunch as checkFirstLaunch } from '@/utils/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationContent() {
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [firstLaunch, setFirstLaunch] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAppState() {
      try {
        // Проверяем первый запуск
        const isFirst = await checkFirstLaunch();
        setFirstLaunch(isFirst);

        // Проверяем авторизацию
        const isAuth = await checkAuth();
        setAuthenticated(isAuth);
      } catch (error) {
        console.error('Ошибка при проверке состояния:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAppState();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Перепроверяем состояние при изменении маршрута
    async function recheckState() {
      const isFirst = await checkFirstLaunch();
      const isAuth = await checkAuth();
      setFirstLaunch(isFirst);
      setAuthenticated(isAuth);
    }

    const currentRoute = segments[0];

    // Приоритет 1: Первый запуск → onboarding
    if (firstLaunch && currentRoute !== 'onboarding') {
      router.replace('/onboarding' as any);
      return;
    }

    // Приоритет 2: Не авторизован → auth
    if (!firstLaunch && !authenticated && currentRoute !== 'auth') {
      router.replace('/auth' as any);
      return;
    }

    // Приоритет 3: Авторизован → основное приложение
    if (!firstLaunch && authenticated) {
      if (currentRoute === 'onboarding' || currentRoute === 'auth') {
        router.replace('/(tabs)' as any);
      }
    }

    // Перепроверяем состояние при изменении маршрута (для обновления после авторизации)
    if (currentRoute === 'auth' || currentRoute === 'onboarding') {
      recheckState();
    }
  }, [isLoading, firstLaunch, authenticated, segments, router]);

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="auth" 
        options={{ 
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Профиль',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="create-workout" 
        options={{ 
          presentation: 'modal', 
          title: 'Создать тренировку',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="select-workout" 
        options={{ 
          presentation: 'modal', 
          title: 'Выберите тренировку',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="workout-screen" 
        options={{ 
          presentation: 'modal', 
          title: 'Тренировка',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="exercise-detail" 
        options={{ 
          presentation: 'modal', 
          title: 'Упражнение',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="exercise-session" 
        options={{ 
          presentation: 'modal', 
          title: 'Выполнение упражнения',
          headerShown: true,
        }} 
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NavigationContent />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
} 
