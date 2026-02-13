import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { DrawerProvider, useDrawer } from '@/contexts/drawer-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getLastTab, saveLastTab } from '@/utils/storage';

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { drawerOpen, openDrawer, closeDrawer } = useDrawer();
  const colors = Colors[colorScheme ?? 'light'];

  const tabs = ['index', 'basketball', 'football', 'hockey', 'run'] as const;
  type TabName = typeof tabs[number];

  // Восстанавливаем последний открытый таб при загрузке
  useEffect(() => {
    async function restoreLastTab() {
      const lastTab = await getLastTab();
      if (lastTab && tabs.includes(lastTab as TabName)) {
        const currentTab = segments[segments.length - 1] as string;
        // Если мы на корневом уровне и есть сохраненный таб, переходим на него
        if (segments.length === 1 && lastTab !== currentTab) {
          // Для index используем корневой путь группы
          const route = lastTab === 'index' ? '/(tabs)' : `/(tabs)/${lastTab}`;
          router.replace(route as any);
        }
      }
    }
    // Небольшая задержка для корректной работы навигации
    const timer = setTimeout(restoreLastTab, 100);
    return () => clearTimeout(timer);
  }, []);

  // Сохраняем текущий таб при изменении
  useEffect(() => {
    if (segments.length > 0) {
      const currentTab = segments[segments.length - 1] as string;
      if (tabs.includes(currentTab as TabName)) {
        saveLastTab(currentTab);
      }
    }
  }, [segments]);

  const handleTabPress = (tabName: string) => {
    closeDrawer();
    // Для index используем корневой путь группы
    const route = tabName === 'index' ? '/(tabs)' : `/(tabs)/${tabName}`;
    router.replace(route as any);
  };

  const handleProfilePress = () => {
    closeDrawer();
    router.push('/profile' as any);
  };

  const currentTab = (segments[segments.length - 1] as string) || 'index';

  return (
    <Drawer
      open={drawerOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
      drawerType="front"
      drawerPosition="left"
      renderDrawerContent={() => (
        <ThemedView style={styles.drawerContent}>
          <ThemedText type="title" style={styles.drawerTitle}>
            Меню
          </ThemedText>
          
          <ThemedView style={styles.drawerTabs}>
          <Pressable
            style={[
              styles.drawerItem,
              currentTab === 'index' && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleTabPress('index')}>
            <IconSymbol size={24} name="figure.strengthtraining.traditional" color={currentTab === 'index' ? colors.tint : colors.text} />
            <ThemedText
              style={[
                styles.drawerLabel,
                currentTab === 'index' && { color: colors.tint, fontWeight: '600' },
              ]}>
              Зал
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.drawerItem,
              currentTab === 'basketball' && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleTabPress('basketball')}>
            <IconSymbol size={24} name="basketball.fill" color={currentTab === 'basketball' ? colors.tint : colors.text} />
            <ThemedText
              style={[
                styles.drawerLabel,
                currentTab === 'basketball' && { color: colors.tint, fontWeight: '600' },
              ]}>
              Баскетбол
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.drawerItem,
              currentTab === 'football' && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleTabPress('football')}>
            <IconSymbol size={24} name="soccerball" color={currentTab === 'football' ? colors.tint : colors.text} />
            <ThemedText
              style={[
                styles.drawerLabel,
                currentTab === 'football' && { color: colors.tint, fontWeight: '600' },
              ]}>
              Футбол
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.drawerItem,
              currentTab === 'hockey' && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleTabPress('hockey')}>
            <IconSymbol size={24} name="figure.skating" color={currentTab === 'hockey' ? colors.tint : colors.text} />
            <ThemedText
              style={[
                styles.drawerLabel,
                currentTab === 'hockey' && { color: colors.tint, fontWeight: '600' },
              ]}>
              Хоккей
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.drawerItem,
              currentTab === 'run' && { backgroundColor: colors.tint + '20' },
            ]}
            onPress={() => handleTabPress('run')}>
            <IconSymbol size={24} name="figure.run" color={currentTab === 'run' ? colors.tint : colors.text} />
            <ThemedText
              style={[
                styles.drawerLabel,
                currentTab === 'run' && { color: colors.tint, fontWeight: '600' },
              ]}>
              Бег
            </ThemedText>
          </Pressable>
          </ThemedView>

          <ThemedView style={styles.drawerFooter}>
            <Pressable
              style={styles.drawerItemProfile}
              onPress={handleProfilePress}>
              <IconSymbol size={24} name="person.fill" color={colors.text} />
              <ThemedText style={styles.drawerLabel}>
                Профиль
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      )}>
      <Slot />
    </Drawer>
  );
}

export default function TabLayout() {
  return (
    <DrawerProvider>
      <TabLayoutContent />
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  drawerTitle: {
    marginBottom: 32,
    fontSize: 24,
  },
  drawerTabs: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  drawerLabel: {
    marginLeft: 16,
    fontSize: 16,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 16,
    paddingBottom: 24,
  },
  drawerItemProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuButton: {
    marginLeft: 16,
    padding: 8,
  },
});
