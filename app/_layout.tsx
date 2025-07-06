import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, onboardingCompleted } = useAuthStore();
  const [isAppReady, setIsAppReady] = useState(false);
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Attendre que les fonts et l'état d'auth soient prêts
  useEffect(() => {
    if (loaded) {
      setTimeout(() => {
        setIsAppReady(true);
      }, 500);
    }
  }, [loaded]);

  // Gestion de la navigation - SIMPLIFIÉE pour éviter la redirection automatique
  useEffect(() => {
    if (!isAppReady) return;

    const inAuthGroup = segments[0] === '(tabs)';

    // Seulement rediriger si utilisateur connecté et pas dans l'app
    if (isAuthenticated && !inAuthGroup) {
      router.replace('/(tabs)');
    }
    // Sinon, laisser l'utilisateur naviguer manuellement
    else if (!isAuthenticated && !onboardingCompleted && segments.length === 0) {
      // Seulement au tout premier lancement → onboarding
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isAppReady, segments]);

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
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="firstLogin" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}