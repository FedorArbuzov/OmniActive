import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setFirstLaunchComplete } from '@/utils/storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  id: string;
  title: string;
  description: string;
  // Для будущих картинок
  // image?: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Добро пожаловать в OmniActive',
    description:
      'Единое приложение для тренировок, питания и отслеживания активности. Достигайте целей с умом.',
  },
  {
    id: '2',
    title: 'Тренировки',
    description:
      'Создавайте свои программы: зал, баскетбол, футбол, хоккей. Ведите учёт упражнений и прогресса.',
  },
  {
    id: '3',
    title: 'Калории и питание',
    description:
      'Добавляйте блюда, ведите дневник питания и следите за балансом калорий и БЖУ.',
  },
  {
    id: '4',
    title: 'Активность',
    description:
      'Шаги, коэффициент активности и связь с тренировками — всё для точного расчёта затрат энергии.',
  },
  {
    id: '5',
    title: 'Готовы начать?',
    description:
      'Зарегистрируйтесь или войдите, чтобы сохранять данные в облаке и синхронизировать между устройствами.',
  },
];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = async () => {
    if (isLastSlide) {
      await setFirstLaunchComplete();
      router.replace('/auth' as any);
      return;
    }
    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const handleSkip = async () => {
    await setFirstLaunchComplete();
    router.replace('/auth' as any);
  };

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        {/* Здесь будет картинка: <Image source={item.image} style={styles.slideImage} /> */}
        <ThemedText type="title" style={[styles.slideTitle, { color: colors.text }]}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.slideDescription, { color: colors.text + 'cc' }]}>
          {item.description}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? colors.tint : colors.text + '40',
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          {!isLastSlide && (
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: colors.tint }]}
              onPress={handleSkip}>
              <ThemedText style={[styles.buttonTextSecondary, { color: colors.tint }]}>
                Пропустить
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            style={[
              styles.button,
              styles.buttonPrimary,
              { backgroundColor: colors.tint },
              (!currentIndex || isLastSlide) && styles.buttonFull,
            ]}
            onPress={handleNext}>
            <ThemedText style={styles.buttonTextPrimary}>
              {isLastSlide ? 'Начать' : 'Далее'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: 'center',
    maxWidth: 340,
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 24,
  },
  slideDescription: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: 1,
    maxWidth: '100%',
  },
  buttonPrimary: {},
  buttonSecondary: {
    borderWidth: 2,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});
