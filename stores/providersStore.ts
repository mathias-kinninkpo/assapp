/**
 * Store Zustand pour la gestion des prestataires de santé
 * Gestion de l'état global des prestataires (récupération, recherche, cache, géolocalisation)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  providersServices, 
  Provider, 
  ProviderSearchFilter, 
  ProviderStats 
} from '../services/providersService';

// Types pour la géolocalisation utilisateur
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
}

// Types pour les modes d'affichage
export type ViewMode = 'list' | 'map';

// Interface du store de prestataires
interface ProvidersState {
  // État des données
  providers: Provider[];
  filteredProviders: Provider[];
  stats: ProviderStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  
  // État des filtres et recherche
  currentFilter: ProviderSearchFilter;
  searchQuery: string;
  selectedTypes: string[];
  selectedCities: string[];
  showOnlyConventioned: boolean;
  
  // État de l'affichage
  viewMode: ViewMode;
  selectedProviderId: number | null;
  
  // État de géolocalisation
  userLocation: UserLocation | null;
  isGeolocating: boolean;
  locationPermissionGranted: boolean;
  showNearbyOnly: boolean;
  proximityRadius: number; // en km
  
  // Actions - Récupération des données
  fetchProviders: (forceRefresh?: boolean) => Promise<void>;
  refreshProviders: () => Promise<void>;
  syncProviders: (forceRefresh?: boolean) => Promise<{ success: boolean; error?: string }>;
  
  // Actions - Recherche et filtrage
  setSearchQuery: (query: string) => void;
  setFilter: (filter: Partial<ProviderSearchFilter>) => void;
  toggleProviderType: (type: string) => void;
  toggleCity: (city: string) => void;
  toggleConventioned: () => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Actions - Affichage
  setViewMode: (mode: ViewMode) => void;
  selectProvider: (providerId: number | null) => void;
  getSelectedProvider: () => Provider | null;
  
  // Actions - Géolocalisation
  setUserLocation: (location: UserLocation | null) => void;
  setLocationPermission: (granted: boolean) => void;
  toggleNearbyOnly: () => void;
  setProximityRadius: (radius: number) => void;
  sortByDistance: () => void;
  
  // Actions - Gestion du cache
  clearCache: () => Promise<void>;
  
  // Helpers
  getProvidersByType: (type: string) => Provider[];
  getProvidersByCity: (city: string) => Provider[];
  getNearbyProviders: (radiusKm?: number) => Provider[];
  getUniqueTypes: () => string[];
  getUniqueCities: () => string[];
  isFilterActive: () => boolean;
  getProviderById: (id: number) => Provider | null;
}

export const useProvidersStore = create<ProvidersState>()(
  persist(
    (set, get) => ({
      // État initial
      providers: [],
      filteredProviders: [],
      stats: null,
      isLoading: false,
      isRefreshing: false,
      lastUpdated: null,
      
      currentFilter: {},
      searchQuery: '',
      selectedTypes: [],
      selectedCities: [],
      showOnlyConventioned: false,
      
      viewMode: 'list',
      selectedProviderId: null,
      
      userLocation: null,
      isGeolocating: false,
      locationPermissionGranted: false,
      showNearbyOnly: false,
      proximityRadius: 10, // 10km par défaut
      
      // Récupérer les prestataires
      fetchProviders: async (forceRefresh = false) => {
        const state = get();
        
        // Éviter les appels multiples
        if (state.isLoading && !forceRefresh) {
          return;
        }

        set({ isLoading: true });

        try {
          const response = await providersServices.sync(forceRefresh);
          
          if (response.success && response.data.length > 0) {
            const stats = providersServices.getStats(response.data);
            
            set({
              providers: response.data,
              stats,
              lastUpdated: new Date().toISOString(),
              isLoading: false
            });
            
            // Appliquer les filtres automatiquement
            get().applyFilters();
            
            console.log(`✅ ${response.data.length} prestataires chargés`);
          } else {
            set({ isLoading: false });
            console.error('❌ Erreur récupération prestataires:', response.error);
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('❌ Erreur fetch prestataires:', error);
        }
      },

      // Rafraîchir les prestataires (pull to refresh)
      refreshProviders: async () => {
        set({ isRefreshing: true });
        
        try {
          await get().fetchProviders(true);
        } finally {
          set({ isRefreshing: false });
        }
      },

      // Synchronisation avec retour de statut
      syncProviders: async (forceRefresh = false) => {
        try {
          const response = await providersServices.sync(forceRefresh);
          
          if (response.success) {
            const stats = providersServices.getStats(response.data);
            
            set({
              providers: response.data,
              stats,
              lastUpdated: new Date().toISOString()
            });
            
            get().applyFilters();
            
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
          };
        }
      },

      // Définir la requête de recherche
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        get().applyFilters();
      },

      // Définir un filtre
      setFilter: (filter: Partial<ProviderSearchFilter>) => {
        const state = get();
        set({ 
          currentFilter: { ...state.currentFilter, ...filter }
        });
        get().applyFilters();
      },

      // Basculer un type de prestataire
      toggleProviderType: (type: string) => {
        const state = get();
        const newTypes = state.selectedTypes.includes(type)
          ? state.selectedTypes.filter(t => t !== type)
          : [...state.selectedTypes, type];
        
        set({ selectedTypes: newTypes });
        get().applyFilters();
      },

      // Basculer une ville
      toggleCity: (city: string) => {
        const state = get();
        const newCities = state.selectedCities.includes(city)
          ? state.selectedCities.filter(c => c !== city)
          : [...state.selectedCities, city];
        
        set({ selectedCities: newCities });
        get().applyFilters();
      },

      // Basculer le filtre conventionné
      toggleConventioned: () => {
        const state = get();
        set({ showOnlyConventioned: !state.showOnlyConventioned });
        get().applyFilters();
      },

      // Effacer tous les filtres
      clearFilters: () => {
        set({
          currentFilter: {},
          searchQuery: '',
          selectedTypes: [],
          selectedCities: [],
          showOnlyConventioned: false,
          showNearbyOnly: false
        });
        get().applyFilters();
      },

      // Appliquer les filtres
      applyFilters: () => {
        const state = get();
        let filtered = [...state.providers];

        // Construire le filtre à partir de l'état
        const filter: ProviderSearchFilter = {
          ...state.currentFilter,
          searchText: state.searchQuery || undefined,
          agreeged: state.showOnlyConventioned ? true : undefined,
          nearLocation: state.showNearbyOnly && state.userLocation ? {
            latitude: state.userLocation.latitude,
            longitude: state.userLocation.longitude,
            radiusKm: state.proximityRadius
          } : undefined
        };

        // Appliquer les filtres de type
        if (state.selectedTypes.length > 0) {
          filtered = filtered.filter(p => 
            state.selectedTypes.some(type => 
              p.provider_type.toLowerCase().includes(type.toLowerCase())
            )
          );
        }

        // Appliquer les filtres de ville
        if (state.selectedCities.length > 0) {
          filtered = filtered.filter(p => 
            state.selectedCities.some(city => 
              p.city.toLowerCase().includes(city.toLowerCase())
            )
          );
        }

        // Appliquer les autres filtres via le service
        filtered = providersServices.filter(filtered, filter);

        set({ filteredProviders: filtered });
        
        console.log(`🔍 Filtres appliqués: ${filtered.length}/${state.providers.length} prestataires`);
      },

      // Définir le mode d'affichage
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      // Sélectionner un prestataire
      selectProvider: (providerId: number | null) => {
        set({ selectedProviderId: providerId });
      },

      // Obtenir le prestataire sélectionné
      getSelectedProvider: () => {
        const state = get();
        if (!state.selectedProviderId) return null;
        return state.providers.find(p => p.id === state.selectedProviderId) || null;
      },

      // Définir la localisation utilisateur
      setUserLocation: (location: UserLocation | null) => {
        set({ userLocation: location, isGeolocating: false });
        
        // Si on a une localisation et que le mode "proche" est activé, appliquer les filtres
        const state = get();
        if (location && state.showNearbyOnly) {
          get().applyFilters();
        }
      },

      // Définir la permission de géolocalisation
      setLocationPermission: (granted: boolean) => {
        set({ locationPermissionGranted: granted });
      },

      // Basculer l'affichage des prestataires proches
      toggleNearbyOnly: () => {
        const state = get();
        set({ showNearbyOnly: !state.showNearbyOnly });
        get().applyFilters();
      },

      // Définir le rayon de proximité
      setProximityRadius: (radius: number) => {
        set({ proximityRadius: radius });
        
        // Si le mode proximité est activé, réappliquer les filtres
        const state = get();
        if (state.showNearbyOnly) {
          get().applyFilters();
        }
      },

      // Trier par distance
      sortByDistance: () => {
        const state = get();
        
        if (!state.userLocation) {
          console.warn('⚠️ Impossible de trier par distance sans localisation utilisateur');
          return;
        }

        const sorted = [...state.filteredProviders]
          .filter(p => p.coordinates) // Seulement ceux avec coordonnées
          .map(p => ({
            ...p,
            distance_from_user: providersServices.calculateDistance(
              state.userLocation!.latitude,
              state.userLocation!.longitude,
              p.coordinates!.latitude,
              p.coordinates!.longitude
            )
          }))
          .sort((a, b) => a.distance_from_user! - b.distance_from_user!);

        set({ filteredProviders: sorted });
      },

      // Nettoyer le cache
      clearCache: async () => {
        try {
          await providersServices.clearCache();
          set({
            providers: [],
            filteredProviders: [],
            stats: null,
            lastUpdated: null
          });
          console.log('🗑️ Cache prestataires nettoyé');
        } catch (error) {
          console.error('❌ Erreur nettoyage cache:', error);
        }
      },

      // Helpers
      getProvidersByType: (type: string) => {
        const state = get();
        return state.providers.filter(p => 
          p.provider_type.toLowerCase().includes(type.toLowerCase())
        );
      },

      getProvidersByCity: (city: string) => {
        const state = get();
        return state.providers.filter(p => 
          p.city.toLowerCase().includes(city.toLowerCase())
        );
      },

      getNearbyProviders: (radiusKm = 10) => {
        const state = get();
        
        if (!state.userLocation) {
          return [];
        }

        return state.providers
          .filter(p => p.coordinates)
          .map(p => ({
            ...p,
            distance_from_user: providersServices.calculateDistance(
              state.userLocation!.latitude,
              state.userLocation!.longitude,
              p.coordinates!.latitude,
              p.coordinates!.longitude
            )
          }))
          .filter(p => p.distance_from_user! <= radiusKm)
          .sort((a, b) => a.distance_from_user! - b.distance_from_user!);
      },

      getUniqueTypes: () => {
        const state = get();
        const types = new Set(state.providers.map(p => p.provider_type));
        return Array.from(types).sort();
      },

      getUniqueCities: () => {
        const state = get();
        const cities = new Set(state.providers.map(p => p.city));
        return Array.from(cities).sort();
      },

      isFilterActive: () => {
        const state = get();
        return !!(
          state.searchQuery ||
          state.selectedTypes.length > 0 ||
          state.selectedCities.length > 0 ||
          state.showOnlyConventioned ||
          state.showNearbyOnly ||
          Object.keys(state.currentFilter).length > 0
        );
      },

      getProviderById: (id: number) => {
        const state = get();
        return state.providers.find(p => p.id === id) || null;
      },
    }),
    {
      name: 'providers-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persister seulement les données importantes (pas les états temporaires)
      partialize: (state) => ({
        providers: state.providers,
        stats: state.stats,
        lastUpdated: state.lastUpdated,
        viewMode: state.viewMode,
        selectedTypes: state.selectedTypes,
        selectedCities: state.selectedCities,
        showOnlyConventioned: state.showOnlyConventioned,
        proximityRadius: state.proximityRadius,
        locationPermissionGranted: state.locationPermissionGranted,
      }),
    }
  )
);

// Hooks utilitaires pour faciliter l'utilisation
export const useProviders = () => {
  const providers = useProvidersStore(state => state.providers);
  const filteredProviders = useProvidersStore(state => state.filteredProviders);
  const isLoading = useProvidersStore(state => state.isLoading);
  const stats = useProvidersStore(state => state.stats);
  const lastUpdated = useProvidersStore(state => state.lastUpdated);
  
  return { 
    providers, 
    filteredProviders, 
    isLoading, 
    stats, 
    lastUpdated,
    count: filteredProviders.length,
    totalCount: providers.length
  };
};

export const useProvidersSearch = () => {
  const searchQuery = useProvidersStore(state => state.searchQuery);
  const selectedTypes = useProvidersStore(state => state.selectedTypes);
  const selectedCities = useProvidersStore(state => state.selectedCities);
  const showOnlyConventioned = useProvidersStore(state => state.showOnlyConventioned);
  const isFilterActive = useProvidersStore(state => state.isFilterActive);
  
  const setSearchQuery = useProvidersStore(state => state.setSearchQuery);
  const toggleProviderType = useProvidersStore(state => state.toggleProviderType);
  const toggleCity = useProvidersStore(state => state.toggleCity);
  const toggleConventioned = useProvidersStore(state => state.toggleConventioned);
  const clearFilters = useProvidersStore(state => state.clearFilters);
  
  return {
    searchQuery,
    selectedTypes,
    selectedCities,
    showOnlyConventioned,
    isFilterActive: isFilterActive(),
    setSearchQuery,
    toggleProviderType,
    toggleCity,
    toggleConventioned,
    clearFilters
  };
};

export const useProvidersView = () => {
  const viewMode = useProvidersStore(state => state.viewMode);
  const selectedProviderId = useProvidersStore(state => state.selectedProviderId);
  const getSelectedProvider = useProvidersStore(state => state.getSelectedProvider);
  const setViewMode = useProvidersStore(state => state.setViewMode);
  const selectProvider = useProvidersStore(state => state.selectProvider);
  
  return {
    viewMode,
    selectedProviderId,
    selectedProvider: getSelectedProvider(),
    setViewMode,
    selectProvider
  };
};

export const useProvidersLocation = () => {
  const userLocation = useProvidersStore(state => state.userLocation);
  const isGeolocating = useProvidersStore(state => state.isGeolocating);
  const locationPermissionGranted = useProvidersStore(state => state.locationPermissionGranted);
  const showNearbyOnly = useProvidersStore(state => state.showNearbyOnly);
  const proximityRadius = useProvidersStore(state => state.proximityRadius);
  
  const setUserLocation = useProvidersStore(state => state.setUserLocation);
  const setLocationPermission = useProvidersStore(state => state.setLocationPermission);
  const toggleNearbyOnly = useProvidersStore(state => state.toggleNearbyOnly);
  const setProximityRadius = useProvidersStore(state => state.setProximityRadius);
  const sortByDistance = useProvidersStore(state => state.sortByDistance);
  const getNearbyProviders = useProvidersStore(state => state.getNearbyProviders);
  
  return {
    userLocation,
    isGeolocating,
    locationPermissionGranted,
    showNearbyOnly,
    proximityRadius,
    setUserLocation,
    setLocationPermission,
    toggleNearbyOnly,
    setProximityRadius,
    sortByDistance,
    getNearbyProviders
  };
};

export const useProvidersUtils = () => {
  const getUniqueTypes = useProvidersStore(state => state.getUniqueTypes);
  const getUniqueCities = useProvidersStore(state => state.getUniqueCities);
  const getProvidersByType = useProvidersStore(state => state.getProvidersByType);
  const getProvidersByCity = useProvidersStore(state => state.getProvidersByCity);
  const getProviderById = useProvidersStore(state => state.getProviderById);
  
  return {
    getUniqueTypes,
    getUniqueCities,
    getProvidersByType,
    getProvidersByCity,
    getProviderById
  };
};