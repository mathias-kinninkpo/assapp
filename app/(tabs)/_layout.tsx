import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { HealthColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = HealthColors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: colors.card,
          },
          default: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        }),
      }}>
      
      {/* Page d'accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      
      {/* Documents - Nouvelle fonctionnalité */}
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="doc.text.fill" color={color} />
          ),
        }}
      />

    <Tabs.Screen
        name="tracking"
        options={{
          title: 'Suivi',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="doc.text.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="providers"
        options={{
          title: 'Prestataires',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="medical.kit.fill" color={color} />
          ),
        }}
      />
      
       {/* Paramètres */}
       <Tabs.Screen 
        name="setting"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gear.fill" color={color} />
          ),
        }}
      />
      
    </Tabs>
  );
}