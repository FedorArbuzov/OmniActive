import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * SF Symbol name → Material Icons name.
 * Used on Android/Web and as fallback on iOS when the SF Symbol is not available.
 */
export const ICON_MAPPING: Record<string, MaterialIconName> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'line.3.horizontal': 'menu',
  'person.fill': 'person',
  'figure.run': 'directions-run',
  'figure.walk': 'directions-walk',
  'fork.knife': 'restaurant',
  'figure.strengthtraining.traditional': 'fitness-center',
  'basketball.fill': 'sports-basketball',
  'soccerball': 'sports-soccer',
  'figure.skating': 'sports-hockey',
  'questionmark.circle': 'help-outline',
};

/** SF Symbol names that may be missing on older iOS — use MaterialIcons on iOS for these. */
export const IOS_FALLBACK_NAMES = [
  'figure.strengthtraining.traditional',
  'basketball.fill',
  'soccerball',
  'figure.skating',
] as const;
