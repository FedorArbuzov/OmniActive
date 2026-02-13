import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, View } from 'react-native';

// Расстояние между двумя точками (км) — формула Haversine
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RunScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [paceMinPerKm, setPaceMinPerKm] = useState<number | null>(null);

  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<number | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPositionRef = useRef<{ lat: number; lon: number } | null>(null);

  // Таймер
  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current.getTime()) / 1000
        );
        setElapsedSeconds(elapsed);
        // Скорость и темп по текущим данным
        if (distanceKm > 0 && elapsed > 0) {
          const hours = elapsed / 3600;
          setSpeedKmh(distanceKm / hours);
          setPaceMinPerKm((elapsed / 60) / distanceKm);
        }
      }
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, distanceKm]);

  const startRun = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Нет доступа к геолокации',
        'Разрешите доступ к местоположению для отслеживания дистанции.'
      );
      return;
    }

    startTimeRef.current = new Date();
    lastPositionRef.current = null;
    setElapsedSeconds(0);
    setDistanceKm(0);
    setSpeedKmh(0);
    setPaceMinPerKm(null);
    setIsRunning(true);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        if (lastPositionRef.current) {
          const d = haversineKm(
            lastPositionRef.current.lat,
            lastPositionRef.current.lon,
            latitude,
            longitude
          );
          setDistanceKm((prev) => prev + d);
        }
        lastPositionRef.current = { lat: latitude, lon: longitude };
      }
    );
    subscriptionRef.current = sub;
  }, []);

  const stopRun = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    lastPositionRef.current = null;
    startTimeRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E3F2FD', dark: '#0D47A1' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#2196F3"
          name="figure.run"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Бег</ThemedText>
      </ThemedView>
      <ThemedText>Отслеживание пробежки по GPS</ThemedText>

      {isRunning && (
        <ThemedView style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
            <ThemedText style={[styles.statLabel, { color: colors.text + '80' }]}>
              Время
            </ThemedText>
            <ThemedText type="title" style={[styles.statValue, { color: colors.tint }]}>
              {formatTime(elapsedSeconds)}
            </ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
            <ThemedText style={[styles.statLabel, { color: colors.text + '80' }]}>
              Дистанция
            </ThemedText>
            <ThemedText type="title" style={[styles.statValue, { color: colors.tint }]}>
              {distanceKm.toFixed(2)} км
            </ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
            <ThemedText style={[styles.statLabel, { color: colors.text + '80' }]}>
              Скорость
            </ThemedText>
            <ThemedText type="title" style={[styles.statValue, { color: colors.tint }]}>
              {speedKmh.toFixed(1)} км/ч
            </ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
            <ThemedText style={[styles.statLabel, { color: colors.text + '80' }]}>
              Темп
            </ThemedText>
            <ThemedText type="title" style={[styles.statValue, { color: colors.tint }]}>
              {paceMinPerKm != null
                ? `${Math.floor(paceMinPerKm)}:${((paceMinPerKm % 1) * 60).toFixed(0).padStart(2, '0')} /км`
                : '—'}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.stepContainer}>
        {!isRunning ? (
          <Button
            title="Начать пробежку"
            onPress={startRun}
            color="#2196F3"
          />
        ) : (
          <Button
            title="Завершить пробежку"
            onPress={stopRun}
            color="#f44336"
          />
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#2196F3',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    marginTop: 16,
  },
  statsContainer: {
    marginTop: 24,
    gap: 12,
  },
  statBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
});
