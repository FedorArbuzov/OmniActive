import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

import { ICON_MAPPING, IOS_FALLBACK_NAMES } from './icon-symbol-mapping';

const FALLBACK_SET = new Set<string>(IOS_FALLBACK_NAMES);

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  if (FALLBACK_SET.has(name) && ICON_MAPPING[name]) {
    return (
      <MaterialIcons
        name={ICON_MAPPING[name]}
        size={size}
        color={color}
        style={[{ width: size, height: size }, style]}
      />
    );
  }
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
