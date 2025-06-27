import React from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ViewStyle, 
  TextStyle, 
  PressableProps,
  ViewProps,
  TextProps,
  StyleProp
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'card' | 'surface';
}

interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'subtitle' | 'caption' | 'error' | 'success';
}

interface ThemedButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'emergency';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Hook pour obtenir la couleur du thème
function useThemedColor(
  props: { light?: string; dark?: string },
  fallback: string
) {
  const { colors, colorScheme } = useTheme();
  return props[colorScheme] || fallback;
}

// Composant View avec thème
export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  variant = 'default',
  className,
  ...otherProps 
}: ThemedViewProps & { className?: string }) {
  const { colors } = useTheme();
  
  const backgroundColor = useThemedColor(
    { light: lightColor, dark: darkColor },
    variant === 'card' ? colors.card :
    variant === 'surface' ? colors.surface :
    colors.background
  );

  const baseClass = variant === 'card' ? 'rounded-card shadow-card' :
                   variant === 'surface' ? 'rounded-medical' : '';

  return (
    <View 
      style={[{ backgroundColor }, style]} 
      className={`${baseClass} ${className || ''}`}
      {...otherProps} 
    />
  );
}

// Composant Text avec thème
export function ThemedText({ 
  style, 
  lightColor, 
  darkColor, 
  type = 'default',
  className,
  ...rest 
}: ThemedTextProps & { className?: string }) {
  const { colors } = useTheme();
  
  const color = useThemedColor(
    { light: lightColor, dark: darkColor },
    type === 'error' ? colors.emergency :
    type === 'success' ? colors.success :
    type === 'caption' ? colors.textMuted :
    colors.text
  );

  const getTypeClasses = () => {
    switch (type) {
      case 'title':
        return 'text-3xl font-bold';
      case 'subtitle':
        return 'text-xl font-semibold';
      case 'caption':
        return 'text-sm';
      case 'error':
        return 'text-base font-medium';
      case 'success':
        return 'text-base font-medium';
      default:
        return 'text-base';
    }
  };

  return (
    <Text
      style={[{ color }, style]}
      className={`${getTypeClasses()} ${className || ''}`}
      {...rest}
    />
  );
}

// Composant Button avec thème
export function ThemedButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  className,
  ...rest
}: ThemedButtonProps & { className?: string }) {
  const { colors } = useTheme();

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500 active:bg-primary-600';
      case 'secondary':
        return 'bg-secondary-500 active:bg-secondary-600';
      case 'outline':
        return `border-2 border-primary-500 bg-transparent active:bg-primary-50 dark:active:bg-primary-900`;
      case 'ghost':
        return 'bg-transparent active:bg-gray-100 dark:active:bg-gray-800';
      case 'emergency':
        return 'bg-red-500 active:bg-red-600';
      default:
        return 'bg-primary-500 active:bg-primary-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 rounded-lg';
      case 'lg':
        return 'px-8 py-4 rounded-xl';
      default:
        return 'px-6 py-3 rounded-medical';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') {
      return colors.primary;
    }
    return colors.textInverse;
  };

  const isDisabled = disabled || loading;
  
  const buttonStyle: ViewStyle = {
    opacity: isDisabled ? 0.5 : 1,
  };

  return (
    <Pressable
      style={[buttonStyle, style]}
      className={`
        ${getVariantClasses()} 
        ${getSizeClasses()} 
        ${isDisabled ? 'opacity-50' : ''} 
        flex-row items-center justify-center
        ${className || ''}
      `}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <Text style={{ color: getTextColor() }} className="text-center font-semibold">
          Chargement...
        </Text>
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text 
            style={{ color: getTextColor() }} 
            className="text-center font-semibold"
          >
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}

// Composant Card spécialisé pour l'assurance santé
export function HealthCard({ 
  children, 
  title, 
  subtitle,
  icon,
  className,
  ...props 
}: { 
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
} & ViewProps) {
  return (
    <ThemedView 
      variant="card" 
      className={`p-4 mb-4 ${className || ''}`}
      {...props}
    >
      {(title || subtitle || icon) && (
        <View className="flex-row items-center mb-3">
          {icon && <View className="mr-3">{icon}</View>}
          <View className="flex-1">
            {title && (
              <ThemedText type="subtitle" className="mb-1">
                {title}
              </ThemedText>
            )}
            {subtitle && (
              <ThemedText type="caption">
                {subtitle}
              </ThemedText>
            )}
          </View>
        </View>
      )}
      {children}
    </ThemedView>
  );
}