// Version simplifiée du store pour commencer
// Tu peux créer ce fichier SI tu veux utiliser Zustand
// Sinon, la page de paramètres fonctionne avec useState

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorScheme = 'light' | 'dark' | 'system';
export type Language = 'fr' | 'en';

interface SimpleAppState {
  // Paramètres de base
  colorScheme: ColorScheme;
  language: Language;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  
  // Actions
  setColorScheme: (scheme: ColorScheme) => void;
  setLanguage: (language: Language) => void;
  toggleNotifications: () => void;
  toggleBiometric: () => void;
}

export const useSimpleAppStore = create<SimpleAppState>()(
  persist(
    (set) => ({
      // État initial
      colorScheme: 'system',
      language: 'fr',
      notificationsEnabled: true,
      biometricEnabled: false,

      // Actions
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setLanguage: (language) => set({ language }),
      toggleNotifications: () => set((state) => ({ 
        notificationsEnabled: !state.notificationsEnabled 
      })),
      toggleBiometric: () => set((state) => ({ 
        biometricEnabled: !state.biometricEnabled 
      })),
    }),
    {
      name: 'simple-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/*
export const useSimpleAppStore = () => {
  const [settings, setSettings] = useState({
    colorScheme: 'system' as ColorScheme,
    language: 'fr' as Language,
    notificationsEnabled: true,
    biometricEnabled: false,
  });

  return {
    ...settings,
    setColorScheme: (scheme: ColorScheme) => 
      setSettings(prev => ({ ...prev, colorScheme: scheme })),
    setLanguage: (language: Language) => 
      setSettings(prev => ({ ...prev, language })),
    toggleNotifications: () => 
      setSettings(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled })),
    toggleBiometric: () => 
      setSettings(prev => ({ ...prev, biometricEnabled: !prev.biometricEnabled })),
  };
};
*/