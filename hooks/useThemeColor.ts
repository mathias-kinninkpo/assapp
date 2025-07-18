import { useColorScheme } from 'react-native';
import { HealthColors } from '@/constants/Colors';

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof HealthColors.light;

export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = HealthColors[colorScheme];
  
  return {
    colors,
    colorScheme,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
    
    // Helpers pour obtenir des couleurs dynamiques
    getColor: (colorName: keyof ThemeColors) => colors[colorName],
    
    // Classes Tailwind dynamiques
    getTailwindClass: (lightClass: string, darkClass: string) => 
      colorScheme === 'dark' ? darkClass : lightClass,
      
    // Couleurs médicales rapides
    medical: {
      primary: colors.primary,
      emergency: colors.emergency,
      success: colors.success,
      warning: colors.warning,
      info: colors.info,
    }
  };
}

// Hook pour les couleurs de thème (compatible avec l'ancien système)
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemeColors
) {
  const { colors, colorScheme } = useTheme();
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}