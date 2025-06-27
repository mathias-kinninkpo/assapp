import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { HealthColors } from '@/constants/Colors';

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof HealthColors.light;

export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  
  // ✅ Utiliser useMemo pour éviter les re-calculs constants
  const colors = useMemo(() => HealthColors[colorScheme], [colorScheme]);
  
  const isDark = useMemo(() => colorScheme === 'dark', [colorScheme]);
  const isLight = useMemo(() => colorScheme === 'light', [colorScheme]);
  
  // ✅ Mémoriser l'objet retourné pour éviter les re-renders
  return useMemo(() => ({
    colors,
    colorScheme,
    isDark,
    isLight,
    
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
  }), [colors, colorScheme, isDark, isLight]);
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