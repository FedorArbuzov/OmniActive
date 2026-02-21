import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as api from '@/utils/api';
import { clearAuth, getUserProfile, saveUserProfile, type UserProfile } from '@/utils/storage';
import { router, useFocusEffect } from 'expo-router';
import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

type TabId = 'profile' | 'workout-plans' | 'achievements' | 'referrals' | 'updates';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [checking, setChecking] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<api.ReferralUser[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [achievements, setAchievements] = useState<api.AchievementItem[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [workoutPlans, setWorkoutPlans] = useState<api.CustomWorkoutPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await api.getUserProfile();
      setHeight(p.heightCm != null ? String(p.heightCm) : '');
      setWeight(p.weightKg != null ? String(p.weightKg) : '');
      setAge(p.ageYears != null ? String(p.ageYears) : '');
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      // Fallback на локальное хранилище при ошибке API
      const p = await getUserProfile();
      setHeight(p.heightCm != null ? String(p.heightCm) : '');
      setWeight(p.weightKg != null ? String(p.weightKg) : '');
      setAge(p.ageYears != null ? String(p.ageYears) : '');
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadAchievements = useCallback(async () => {
    if (activeTab !== 'achievements') return;
    setLoadingAchievements(true);
    try {
      const data = await api.getAchievements();
      setAchievements(data);
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error);
      setAchievements([]);
    } finally {
      setLoadingAchievements(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const loadReferralData = useCallback(async () => {
    if (activeTab !== 'referrals') return;
    
    setLoadingReferrals(true);
    try {
      const codeResponse = await api.getMyReferralCode();
      setReferralCode(codeResponse.referral_code);
      
      const referralsResponse = await api.getMyReferrals();
      setReferrals(referralsResponse.referrals);
    } catch (error) {
      console.error('Ошибка загрузки реферальных данных:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные реферальной программы');
    } finally {
      setLoadingReferrals(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const [cloningPlanId, setCloningPlanId] = useState<string | null>(null);

  const loadWorkoutPlans = useCallback(async () => {
    if (activeTab !== 'workout-plans') return;
    setLoadingPlans(true);
    try {
      const data = await api.getCustomWorkoutPlans();
      setWorkoutPlans(data);
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
      setWorkoutPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadWorkoutPlans();
  }, [loadWorkoutPlans]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'workout-plans') {
        loadWorkoutPlans();
      }
    }, [activeTab, loadWorkoutPlans])
  );

  const handleClonePlan = useCallback(async (plan: api.CustomWorkoutPlan) => {
    setCloningPlanId(plan.id);
    try {
      await api.createCustomWorkoutPlan({
        title: `${plan.title} (копия)`,
        description: plan.description || undefined,
        schedule: plan.schedule || [],
      });
      await loadWorkoutPlans();
    } catch (error) {
      console.error('Ошибка копирования плана:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать план');
    } finally {
      setCloningPlanId(null);
    }
  }, [loadWorkoutPlans]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const profile: UserProfile = {
        heightCm: height.trim() ? parseInt(height.trim(), 10) || null : null,
        weightKg: weight.trim() ? parseFloat(weight.trim()) || null : null,
        ageYears: age.trim() ? parseInt(age.trim(), 10) || null : null,
      };
      await api.saveUserProfile(profile);
      Alert.alert('Сохранено', 'Данные профиля сохранены. Они будут использоваться для расчёта затрат калорий.');
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
      // Fallback на локальное хранилище при ошибке API
      try {
        const profile: UserProfile = {
          heightCm: height.trim() ? parseInt(height.trim(), 10) || null : null,
          weightKg: weight.trim() ? parseFloat(weight.trim()) || null : null,
          ageYears: age.trim() ? parseInt(age.trim(), 10) || null : null,
        };
        await saveUserProfile(profile);
        Alert.alert('Сохранено', 'Данные профиля сохранены локально.');
      } catch (fallbackError) {
        Alert.alert('Ошибка', 'Не удалось сохранить данные.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAuth();
      router.replace('/auth' as any);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;
    
    // Формируем текст для копирования
    const referralText = `Присоединяйся к OmniActive по моему реферальному коду: ${referralCode}\n\nИспользуй этот код при регистрации!`;
    
    try {
      // Пытаемся использовать expo-clipboard (нужно установить: npm install expo-clipboard)
      // @ts-ignore - модуль может быть не установлен
      const Clipboard = await import('expo-clipboard');
      // @ts-ignore
      await Clipboard.setStringAsync(referralText);
      Alert.alert('Скопировано!', 'Реферальный код скопирован в буфер обмена');
    } catch (error) {
      console.error('Ошибка копирования (возможно, expo-clipboard не установлен):', error);
      // Fallback: показываем код для ручного копирования
      Alert.alert(
        'Реферальный код',
        `Ваш код: ${referralCode}\n\nСкопируйте его вручную и поделитесь с друзьями!\n\nТекст для отправки:\n${referralText}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleCheckUpdate = async () => {
    // В Expo Go обновления не работают
    if (__DEV__ && !Updates.channel) {
      Alert.alert('Проверка обновлений', 'В режиме разработки (Expo Go) обновления недоступны. Соберите APK и установите его.');
      return;
    }

    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        Alert.alert(
          'Доступно обновление',
          'Загрузить и применить сейчас? Приложение перезапустится.',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Обновить',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert('Проверка обновлений', 'Установлена последняя версия.');
      }
    } catch (error) {
      console.error('Ошибка проверки обновления:', error);
      Alert.alert('Ошибка', `Не удалось проверить обновления: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setChecking(false);
    }
  };

  const updateId = Updates.updateId ?? '—';
  const channel = Updates.channel ?? '—';

  const tabStyle = (tab: TabId) => [
    styles.tab,
    { borderBottomColor: colors.tint },
    activeTab === tab && styles.tabActive,
    activeTab === tab && { borderBottomWidth: 2 },
  ];
  const tabTextStyle = (tab: TabId) => [
    styles.tabText,
    { color: colors.text },
    activeTab === tab && { color: colors.tint, fontWeight: '600' as const },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        horizontal
        style={[styles.tabBarScroll, { borderBottomColor: colors.text + '20' }]}
        contentContainerStyle={styles.tabBarContent}
        showsHorizontalScrollIndicator={true}
      >
        <Pressable style={tabStyle('profile')} onPress={() => setActiveTab('profile')}>
          <ThemedText style={tabTextStyle('profile')} numberOfLines={1}>Профиль</ThemedText>
        </Pressable>
        <Pressable style={tabStyle('workout-plans')} onPress={() => setActiveTab('workout-plans')}>
          <ThemedText style={tabTextStyle('workout-plans')} numberOfLines={1}>Планы тренировок</ThemedText>
        </Pressable>
        <Pressable style={tabStyle('achievements')} onPress={() => setActiveTab('achievements')}>
          <ThemedText style={tabTextStyle('achievements')} numberOfLines={1}>Достижения</ThemedText>
        </Pressable>
        <Pressable style={tabStyle('referrals')} onPress={() => setActiveTab('referrals')}>
          <ThemedText style={tabTextStyle('referrals')} numberOfLines={1}>Реферальная программа</ThemedText>
        </Pressable>
        <Pressable style={tabStyle('updates')} onPress={() => setActiveTab('updates')}>
          <ThemedText style={tabTextStyle('updates')} numberOfLines={1}>Обновления</ThemedText>
        </Pressable>
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {activeTab === 'profile' && (
          <>
            <ThemedText type="title" style={styles.title}>
              Профиль
            </ThemedText>
            <ThemedText style={[styles.description, { color: colors.text + 'b3' }]}>
              Настройки и данные аккаунта
            </ThemedText>

            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Данные для расчёта калорий
              </ThemedText>
              <ThemedText style={[styles.hint, { color: colors.text + 'cc' }]}>
                Рост, вес и возраст нужны для расчёта суточных затрат калорий (в будущем).
              </ThemedText>
              <ThemedText style={[styles.label, { color: colors.text }]}>Рост (см)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
                placeholder="Например: 175"
                placeholderTextColor={colors.text + '60'}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
              <ThemedText style={[styles.label, { color: colors.text }]}>Вес (кг)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
                placeholder="Например: 70"
                placeholderTextColor={colors.text + '60'}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
              <ThemedText style={[styles.label, { color: colors.text }]}>Возраст (лет)</ThemedText>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.text + '40', backgroundColor: colors.background }]}
                placeholder="Например: 30"
                placeholderTextColor={colors.text + '60'}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
              <Button
                title={profileSaving ? 'Сохранение...' : 'Сохранить данные'}
                onPress={saveProfile}
                disabled={profileSaving}
                color={colors.tint}
              />
            </ThemedView>

            <ThemedView style={styles.section}>
              <Button
                title="Выйти из аккаунта"
                onPress={handleLogout}
                color="#ff3b30"
              />
            </ThemedView>
          </>
        )}

        {activeTab === 'workout-plans' && (
          <>
            <ThemedText type="title" style={styles.title}>
              Планы тренировок
            </ThemedText>
            <ThemedText style={[styles.description, { color: colors.text + 'b3' }]}>
              Создавайте свои планы и расставляйте тренировки по дням и времени
            </ThemedText>

            {loadingPlans ? (
              <ActivityIndicator style={styles.loader} size="large" color={colors.tint} />
            ) : (
              <>
                <View style={styles.plansList}>
                  {workoutPlans.map((plan) => (
                    <View
                      key={plan.id}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.text + '25',
                        },
                      ]}
                    >
                      <Pressable
                        style={styles.planCardTouchable}
                        onPress={() => router.push(`/create-plan-workout?id=${plan.id}` as any)}
                      >
                        <ThemedText type="subtitle" style={styles.planCardTitle}>
                          {plan.title}
                        </ThemedText>
                        {plan.description ? (
                          <ThemedText style={[styles.planCardDesc, { color: colors.text + '99' }]} numberOfLines={2}>
                            {plan.description}
                          </ThemedText>
                        ) : null}
                        <ThemedText style={[styles.planCardMeta, { color: colors.text + '80' }]}>
                          {plan.schedule?.length ?? 0} тренировок в неделю
                          {plan.is_public && plan.code ? ` · Код: ${plan.code}` : ''}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.clonePlanBtn, { borderColor: colors.tint }]}
                        onPress={() => handleClonePlan(plan)}
                        disabled={cloningPlanId !== null}
                      >
                        {cloningPlanId === plan.id ? (
                          <ActivityIndicator size="small" color={colors.tint} />
                        ) : (
                          <ThemedText style={[styles.clonePlanBtnText, { color: colors.tint }]}>
                            Создать копию
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Button
                    title="Создать план"
                    onPress={() => router.push('/create-plan-workout' as any)}
                    color={colors.tint}
                  />
                </View>
              </>
            )}
          </>
        )}

        {activeTab === 'achievements' && (
          <>
            <ThemedText type="title" style={styles.title}>
              Достижения
            </ThemedText>
            <ThemedText style={[styles.description, { color: colors.text + 'b3' }]}>
              Выполняйте упражнения и получайте достижения
            </ThemedText>

            {loadingAchievements ? (
              <ActivityIndicator style={styles.loader} size="large" color={colors.tint} />
            ) : (
              <View style={styles.achievementsList}>
                {achievements.map((a) => (
                  <View
                    key={a.id}
                    style={[
                      styles.achievementItem,
                      {
                        backgroundColor: a.achieved ? 'rgba(76, 175, 80, 0.15)' : colors.text + '12',
                        borderColor: a.achieved ? 'rgba(76, 175, 80, 0.5)' : colors.text + '25',
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.achievementName,
                        { color: a.achieved ? '#2E7D32' : colors.text + '99' },
                      ]}>
                      {a.name}
                    </ThemedText>
                    {a.achieved && (
                      <ThemedText style={[styles.achievementBadge, { color: '#2E7D32' }]}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'referrals' && (
          <>
            <ThemedText type="title" style={styles.title}>
              Реферальная программа
            </ThemedText>
            <ThemedText style={[styles.description, { color: colors.text + 'b3' }]}>
              Приглашай друзей и получай бонусы!
            </ThemedText>

            {loadingReferrals ? (
              <ActivityIndicator style={styles.loader} size="large" color={colors.tint} />
            ) : (
              <>
                <ThemedView style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Ваш реферальный код
                  </ThemedText>
                  <ThemedText style={[styles.hint, { color: colors.text + 'cc' }]}>
                    Поделитесь этим кодом с друзьями. Они смогут использовать его при регистрации.
                  </ThemedText>
                  
                  {referralCode && (
                    <>
                      <View style={[styles.referralCodeContainer, { backgroundColor: colors.background, borderColor: colors.tint }]}>
                        <ThemedText style={[styles.referralCode, { color: colors.tint }]}>
                          {referralCode}
                        </ThemedText>
                      </View>
                      
                      <Button
                        title="Скопировать код"
                        onPress={handleCopyReferralCode}
                        color={colors.tint}
                      />
                      
                      <ThemedText style={[styles.hint, { color: colors.text + 'cc', marginTop: 12 }]}>
                        При копировании будет скопирован текст с объяснением и вашим кодом для отправки друзьям.
                      </ThemedText>
                    </>
                  )}
                </ThemedView>

                <ThemedView style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Ваши рефералы ({referrals.length})
                  </ThemedText>
                  
                  {referrals.length === 0 ? (
                    <ThemedText style={[styles.hint, { color: colors.text + 'cc' }]}>
                      Пока никто не использовал ваш реферальный код. Поделитесь кодом с друзьями!
                    </ThemedText>
                  ) : (
                    <View style={styles.referralsList}>
                      {referrals.map((ref) => (
                        <View key={ref.id} style={[styles.referralItem, { borderBottomColor: colors.text + '20' }]}>
                          <ThemedText style={[styles.referralEmail, { color: colors.text }]}>
                            {ref.email}
                          </ThemedText>
                          <ThemedText style={[styles.referralDate, { color: colors.text + '80' }]}>
                            {new Date(ref.created_at).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </ThemedView>
              </>
            )}
          </>
        )}

        {activeTab === 'updates' && (
          <>
            <ThemedText type="title" style={styles.title}>
              Обновления
            </ThemedText>
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                OTA-обновления
              </ThemedText>
              <ThemedText style={[styles.updateInfo, { color: colors.text + 'cc' }]}>
                Канал: {channel}
              </ThemedText>
              <ThemedText style={[styles.updateInfo, { color: colors.text + 'cc' }]}>
                Текущий update ID: {updateId}
              </ThemedText>
              <Button
                title={checking ? 'Проверка...' : 'Проверить обновления'}
                onPress={handleCheckUpdate}
                disabled={checking}
                color={colors.tint}
              />
              {checking && <ActivityIndicator style={styles.loader} size="small" color={colors.tint} />}
            </ThemedView>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarScroll: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 8,
    fontSize: 28,
  },
  description: {
    marginBottom: 32,
    fontSize: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 4,
  },
  updateInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  loader: {
    marginTop: 8,
  },
  referralCodeContainer: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  referralsList: {
    marginTop: 8,
  },
  referralItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  referralEmail: {
    fontSize: 16,
    marginBottom: 4,
  },
  referralDate: {
    fontSize: 14,
  },
  achievementsList: {
    gap: 10,
    marginTop: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  achievementName: {
    fontSize: 16,
    flex: 1,
  },
  achievementBadge: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  plansList: {
    gap: 12,
    marginBottom: 16,
  },
  planCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  planCardTouchable: {
    flex: 1,
  },
  clonePlanBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  clonePlanBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  planCardTitle: {
    marginBottom: 6,
    fontSize: 18,
  },
  planCardDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  planCardMeta: {
    fontSize: 13,
  },
});
