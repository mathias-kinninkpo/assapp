import React, { useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useNotificationStore } from '@/stores';
import { ThemedView, ThemedText } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';

export function NotificationToast() {
  const { notifications, removeNotification } = useNotificationStore();
  const { colors } = useTheme();

  if (notifications.length === 0) return null;

  return (
    <View className="absolute top-16 left-4 right-4 z-50">
      {notifications.map((notification : any) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </View>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    action?: {
      label: string;
      onPress: () => void;
    };
  };
  onRemove: () => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const { colors } = useTheme();
  const slideAnim = new Animated.Value(-100);

  useEffect(() => {
    // Animation d'entrée
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  const getTypeColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-500',
          icon: '✅',
          textColor: colors.textInverse,
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          icon: '❌',
          textColor: colors.textInverse,
        };
      case 'warning':
        return {
          bg: 'bg-orange-500',
          icon: '⚠️',
          textColor: colors.textInverse,
        };
      case 'info':
        return {
          bg: 'bg-blue-500',
          icon: 'ℹ️',
          textColor: colors.textInverse,
        };
      default:
        return {
          bg: 'bg-gray-500',
          icon: 'ℹ️',
          textColor: colors.textInverse,
        };
    }
  };

  const typeColors = getTypeColors();

  return (
    <Animated.View
      style={{ transform: [{ translateY: slideAnim }] }}
      className={`${typeColors.bg} rounded-lg p-4 mb-2 shadow-lg`}
    >
      <View className="flex-row items-start">
        <Text className="text-lg mr-3">{typeColors.icon}</Text>
        
        <View className="flex-1">
          <Text
            style={{ color: typeColors.textColor }}
            className="font-semibold text-base mb-1"
          >
            {notification.title}
          </Text>
          
          <Text
            style={{ color: typeColors.textColor }}
            className="text-sm opacity-90"
          >
            {notification.message}
          </Text>
          
          {notification.action && (
            <Pressable
              onPress={notification.action.onPress}
              className="mt-2 self-start"
            >
              <Text
                style={{ color: typeColors.textColor }}
                className="font-semibold underline"
              >
                {notification.action.label}
              </Text>
            </Pressable>
          )}
        </View>
        
        <Pressable onPress={onRemove} className="ml-2">
          <Text style={{ color: typeColors.textColor }} className="text-lg">
            ×
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}