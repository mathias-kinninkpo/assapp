import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [isAppReady, setIsAppReady] = useState(false);
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Attendre que les fonts et l'état d'auth soient prêts
  useEffect(() => {
    if (loaded) {
      // Petit délai pour laisser Zustand se rehydrater depuis AsyncStorage
      setTimeout(() => {
        setIsAppReady(true);
      }, 500); // Augmenté à 500ms pour être sûr
    }
  }, [loaded]);

  // Écran de chargement pendant que l'app s'initialise
  if (!isAppReady) {
    return (
      <View className="flex-1 justify-center items-center bg-primary-500">
        <Text className="text-4xl mb-4">🏥</Text>
        <Text className="text-white text-lg font-semibold">Adjibola Tech</Text>
        <Text className="text-blue-100 text-sm">Assurance Santé</Text>
        <Text className="text-blue-200 text-xs mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* ✅ Toujours définir toutes les routes mais avec initialRouteName conditionnel */}
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            // Empêcher le retour vers login si connecté
            gestureEnabled: !isAuthenticated,
          }} 
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}