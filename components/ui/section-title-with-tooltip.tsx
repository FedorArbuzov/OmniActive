import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  tooltipText: string;
};

export function SectionTitleWithTooltip({ title, tooltipText }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const onTooltipPress = () => {
    Alert.alert('Подсказка', tooltipText, [{ text: 'Понятно' }]);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{title}</ThemedText>
      <TouchableOpacity
        onPress={onTooltipPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.iconWrap}>
        <IconSymbol
          name="questionmark.circle"
          size={22}
          color={colors.text + '99'}
        />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    padding: 4,
  },
});
