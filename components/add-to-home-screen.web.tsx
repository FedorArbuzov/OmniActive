import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

/** beforeinstallprompt event type (PWA Install Prompt API) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function AddToHomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [storageKey] = useState('addToHomeScreenDismissed');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      const dismissedAt = localStorage.getItem(storageKey);
      if (dismissedAt) {
        const days = (Date.now() - parseInt(dismissedAt, 10)) / (24 * 60 * 60 * 1000);
        if (days < 7) setDismissed(true);
      }
      setIsInstallable(!dismissed);
      return;
    }

    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [storageKey]);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setIsInstallable(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, String(Date.now()));
    }
  };

  if (!isInstallable) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '40' }]}>
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={[styles.title, { color: colors.tint }]}>
          {isIOSDevice ? 'Установить приложение' : 'Добавить на главный экран'}
        </ThemedText>
        <ThemedText style={[styles.description, { color: colors.text + 'cc' }]}>
          {isIOSDevice
            ? 'Нажмите «Поделиться» и выберите «На экран „Домой“»'
            : 'Откройте OmniActive как приложение без адресной строки'}
        </ThemedText>
      </View>
      <View style={styles.buttons}>
        {!isIOSDevice && installPrompt && (
          <Pressable
            style={[styles.button, styles.buttonPrimary, { backgroundColor: colors.tint }]}
            onPress={handleInstall}
          >
            <ThemedText style={styles.buttonPrimaryText}>Установить</ThemedText>
          </Pressable>
        )}
        <Pressable
          style={[styles.button, styles.buttonSecondary, { borderColor: colors.text + '40' }]}
          onPress={handleDismiss}
        >
          <ThemedText style={[styles.buttonSecondaryText, { color: colors.text }]}>Позже</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonPrimary: {
    flex: 1,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSecondary: {
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  buttonSecondaryText: {
    fontSize: 15,
  },
});
