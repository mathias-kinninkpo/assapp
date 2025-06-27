import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types pour l'état global de l'app
export type ColorScheme = 'light' | 'dark' | 'system';
export type Language = 'fr' | 'en';

interface AppState {
  // Préférences utilisateur
  colorScheme: ColorScheme;
  language: Language;
  
  // État de l'application
  isFirstLaunch: boolean;
  hasSeenOnboarding: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  
  // Navigation et UI
  activeTab: string;
  isNetworkConnected: boolean;
  
  // Actions - Préférences
  setColorScheme: (scheme: ColorScheme) => void;
  setLanguage: (language: Language) => void;
  
  // Actions - État app
  setFirstLaunchComplete: () => void;
  setOnboardingComplete: () => void;
  toggleNotifications: () => void;
  toggleBiometric: () => void;
  
  // Actions - Navigation
  setActiveTab: (tab: string) => void;
  setNetworkStatus: (connected: boolean) => void;
  
  // Helpers
  getSystemColorScheme: () => 'light' | 'dark';
  shouldUseDarkMode: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // État initial
      colorScheme: 'system',
      language: 'fr',
      isFirstLaunch: true,
      hasSeenOnboarding: false,
      notificationsEnabled: true,
      biometricEnabled: false,
      activeTab: 'index',
      isNetworkConnected: true,

      // Définir le schéma de couleurs
      setColorScheme: (scheme: ColorScheme) => {
        set({ colorScheme: scheme });
      },

      // Définir la langue
      setLanguage: (language: Language) => {
        set({ language });
      },

      // Marquer le premier lancement comme terminé
      setFirstLaunchComplete: () => {
        set({ isFirstLaunch: false });
      },

      // Marquer l'onboarding comme terminé
      setOnboardingComplete: () => {
        set({ hasSeenOnboarding: true });
      },

      // Basculer les notifications
      toggleNotifications: () => {
        set(state => ({ notificationsEnabled: !state.notificationsEnabled }));
      },

      // Basculer la biométrie
      toggleBiometric: () => {
        set(state => ({ biometricEnabled: !state.biometricEnabled }));
      },

      // Définir l'onglet actif
      setActiveTab: (tab: string) => {
        set({ activeTab: tab });
      },

      // Définir l'état du réseau
      setNetworkStatus: (connected: boolean) => {
        set({ isNetworkConnected: connected });
      },

      // Helper: Obtenir le schéma système (simulé)
      getSystemColorScheme: () => {
        // En vrai, tu utiliserais useColorScheme() de react-native
        // Ici c'est juste pour l'exemple
        return 'light';
      },

      // Helper: Déterminer si on doit utiliser le mode sombre
      shouldUseDarkMode: () => {
        const { colorScheme } = get();
        
        if (colorScheme === 'system') {
          return get().getSystemColorScheme() === 'dark';
        }
        
        return colorScheme === 'dark';
      },
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persister tout sauf l'état réseau qui est temporaire
      partialize: (state) => ({
        colorScheme: state.colorScheme,
        language: state.language,
        isFirstLaunch: state.isFirstLaunch,
        hasSeenOnboarding: state.hasSeenOnboarding,
        notificationsEnabled: state.notificationsEnabled,
        biometricEnabled: state.biometricEnabled,
        activeTab: state.activeTab,
      }),
    }
  )
);

// Store pour les notifications temporaires (toasts, alertes)
interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    action?: {
      label: string;
      onPress: () => void;
    };
  }>;
  
  // Actions
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newNotification = { ...notification, id };
    
    set(state => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-suppression après la durée spécifiée (défaut: 5s)
    setTimeout(() => {
      get().removeNotification(id);
    }, notification.duration || 5000);
  },

  removeNotification: (id: string) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
  },
}));