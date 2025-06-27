import { useAppStore } from './appStore';
import { useAuthStore } from './authStore';
import { useHealthStore } from './healthStore';

// Export de tous les stores Zustand
export { useAuthStore } from './authStore';
export { useHealthStore } from './healthStore';
export { useAppStore, useNotificationStore } from './appStore';

// Types utiles
export type { ColorScheme, Language } from './appStore';

// Hook combiné pour récupérer l'état complet de l'app
export const useAppData = () => {
  const auth = useAuthStore();
  const health = useHealthStore();
  const app = useAppStore();
  
  return {
    auth,
    health,
    app,
    
    // Helpers globaux
    isReady: !auth.isLoading && !health.isLoadingPolicies,
    needsOnboarding: app.isFirstLaunch || !app.hasSeenOnboarding,
    isFullyAuthenticated: auth.isAuthenticated ,
  };
};

// Hook pour initialiser les données au démarrage
export const useInitializeApp = () => {
  const { loadPolicies, loadClaims, loadDashboardStats } = useHealthStore();
  const { isAuthenticated } = useAuthStore();
  const { setFirstLaunchComplete } = useAppStore();
  
  const initializeData = async () => {
    // Marquer le premier lancement comme terminé
    setFirstLaunchComplete();
    
    // Si l'utilisateur est connecté, charger ses données
    if (isAuthenticated) {
      await Promise.all([
        loadPolicies(),
        loadClaims(),
        loadDashboardStats(),
      ]);
    }
  };
  
  return { initializeData };
};