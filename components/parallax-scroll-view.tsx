import type { PropsWithChildren, ReactElement } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedRef,
    useAnimatedStyle,
    useScrollOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useDrawer } from '@/contexts/drawer-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 250;
const TOP_BAR_HEIGHT = 56;

type Props = PropsWithChildren<{
  headerImage?: ReactElement | null;
  headerBackgroundColor?: { dark: string; light: string } | null;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const { openDrawer } = useDrawer();
  const hasCover = headerImage != null && headerBackgroundColor != null;

  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (!hasCover) return {};
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor, flex: 1 }}
      scrollEventThrottle={16}>
      {hasCover ? (
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor![colorScheme] },
            headerAnimatedStyle,
          ]}>
          {headerImage}
          <Pressable
            onPress={openDrawer}
            style={styles.menuButton}>
            <IconSymbol size={28} name="line.3.horizontal" color={colors.text} />
          </Pressable>
        </Animated.View>
      ) : (
        <ThemedView style={[styles.topBar, { backgroundColor }]}>
          <Pressable
            onPress={openDrawer}
            style={[styles.menuButton, styles.menuButtonCompact]}>
            <IconSymbol size={28} name="line.3.horizontal" color={colors.text} />
          </Pressable>
        </ThemedView>
      )}
      <ThemedView style={styles.content}>{children}</ThemedView>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    padding: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  topBar: {
    height: TOP_BAR_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  menuButtonCompact: {
    position: 'relative',
    top: 0,
    left: 0,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
