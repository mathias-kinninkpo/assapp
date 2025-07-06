/**
 * ProvidersScreen - Page principale des prestataires de santé
 * Toggle entre vue Liste et Carte avec recherche et filtres intégrés
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  BackHandler
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { HStack, VStack } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';

// Import des composants et stores
import ProvidersListView from '@/components/ProvidersListView';
import ProvidersMapView from '@/components/ProvidersMapView';
import { 
  useProvidersStore,
  useProviders, 
  useProvidersSearch, 
  useProvidersView,
  useProvidersLocation,
  useProvidersUtils 
} from '@/stores/providersStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/appStore';
import type { Provider } from '@/services/providersService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProvidersScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  // Store hooks
  const { 
    providers, 
    filteredProviders, 
    isLoading, 
    stats, 
    lastUpdated 
  } = useProviders();
  
  const {
    searchQuery,
    selectedTypes,
    selectedCities,
    showOnlyConventioned,
    isFilterActive,
    setSearchQuery,
    toggleProviderType,
    toggleCity,
    toggleConventioned,
    clearFilters
  } = useProvidersSearch();
  
  const {
    viewMode,
    selectedProviderId,
    selectedProvider,
    setViewMode,
    selectProvider
  } = useProvidersView();
  
  const {
    userLocation,
    showNearbyOnly,
    proximityRadius,
    toggleNearbyOnly,
    setProximityRadius
  } = useProvidersLocation();
  
  const {
    getUniqueTypes,
    getUniqueCities
  } = useProvidersUtils();
  
  // Actions du store
  const fetchProviders = useProvidersStore(state => state.fetchProviders);
  const refreshProviders = useProvidersStore(state => state.refreshProviders);
  const isRefreshing = useProvidersStore(state => state.isRefreshing);
  
  // États locaux pour l'UI
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);

  // Initialisation des données au montage
  useEffect(() => {
    console.log('🚀 Initialisation des prestataires...');
    
    if (providers.length === 0) {
      fetchProviders(false); // Pas de force refresh au démarrage
    }
  }, []);

  // Actualiser quand l'écran prend le focus
  useFocusEffect(
    useCallback(() => {
      // Vérifier si les données sont anciennes (plus de 1 heure)
      if (lastUpdated) {
        const lastUpdate = new Date(lastUpdated);
        const now = new Date();
        const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 1) {
          console.log('📱 Données anciennes, actualisation...');
          fetchProviders(true);
        }
      }
    }, [lastUpdated])
  );

  // Gestion du refresh
  const handleRefresh = async () => {
    try {
      await refreshProviders();
      
      addNotification({
        type: 'success',
        title: '✅ Actualisé',
        message: `${filteredProviders.length} prestataires mis à jour`,
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '❌ Erreur',
        message: 'Impossible d\'actualiser les données'
      });
    }
  };

  // Gestion de la sélection d'un prestataire
  const handleProviderPress = (provider: Provider) => {
    selectProvider(provider.id);
    
    // Afficher une notification avec les infos du prestataire
    addNotification({
      type: 'info',
      title: `📍 ${provider.title}`,
      message: `${provider.provider_type} • ${provider.city}`,
      duration: 4000,
      action: provider.phones.find(p => p.phone) ? {
        label: 'Appeler',
        onPress: () => {
          const phone = provider.phones.find(p => p.phone)?.phone;
          if (phone) {
            const cleanPhone = phone.replace(/\s+/g, '');
            require('react-native').Linking.openURL(`tel:${cleanPhone}`);
          }
        }
      } : undefined
    });
  };

  // Toggle entre Liste et Carte
  const toggleViewMode = () => {
    const newMode = viewMode === 'list' ? 'map' : 'list';
    setViewMode(newMode);
    
    addNotification({
      type: 'info',
      title: `🔄 Vue ${newMode === 'list' ? 'Liste' : 'Carte'}`,
      message: `Affichage des prestataires en ${newMode === 'list' ? 'liste' : 'carte'}`,
      duration: 2000
    });
  };

  // Composant de recherche
  const SearchBar = () => (
    <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mb-4">
      <HStack align="center" spacing="sm">
        <View className="flex-1 flex-row items-center bg-white dark:bg-gray-700 rounded-xl px-4 py-3">
          <Text className="text-xl mr-3">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un prestataire..."
            placeholderTextColor={colors.textSecondary}
            className="flex-1 text-base"
            style={{ color: colors.text }}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-gray-400 text-lg ml-2">✕</Text>
            </Pressable>
          ) : null}
        </View>
        
        <Pressable
          onPress={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`w-12 h-12 rounded-xl justify-center items-center ${
            isFilterActive || showFiltersPanel
              ? 'bg-blue-500' 
              : 'bg-white dark:bg-gray-700'
          }`}
        >
          <Text className={`text-xl ${
            isFilterActive || showFiltersPanel ? 'text-white' : 'text-gray-600'
          }`}>
            🎛️
          </Text>
        </Pressable>
      </HStack>
    </View>
  );

  // Composant des filtres
  const FiltersPanel = () => {
    if (!showFiltersPanel) return null;

    const availableTypes = getUniqueTypes();
    const availableCities = getUniqueCities();

    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-lg">
        <VStack spacing="md">
          {/* En-tête */}
          <HStack justify="between" align="center">
            <Text className="font-bold text-lg">🎛️ Filtres</Text>
            <Pressable onPress={clearFilters}>
              <Text className="text-blue-500 font-medium">Effacer tout</Text>
            </Pressable>
          </HStack>

          {/* Filtres par type */}
          <View>
            <Text className="font-semibold mb-2">Types de prestataires</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack spacing="sm">
                {availableTypes.map(type => (
                  <Pressable
                    key={type}
                    onPress={() => toggleProviderType(type)}
                    className={`px-3 py-2 rounded-full ${
                      selectedTypes.includes(type)
                        ? 'bg-blue-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedTypes.includes(type)
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </ScrollView>
          </View>

          {/* Filtres par ville */}
          <View>
            <Text className="font-semibold mb-2">Villes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack spacing="sm">
                {availableCities.slice(0, 6).map(city => (
                  <Pressable
                    key={city}
                    onPress={() => toggleCity(city)}
                    className={`px-3 py-2 rounded-full ${
                      selectedCities.includes(city)
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedCities.includes(city)
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {city}
                    </Text>
                  </Pressable>
                ))}
              </HStack>
            </ScrollView>
          </View>

          {/* Autres filtres */}
          <HStack justify="between" align="center">
            <View>
              <Text className="font-semibold">Conventionnés uniquement</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Afficher seulement les prestataires conventionnés
              </Text>
            </View>
            <Pressable
              onPress={toggleConventioned}
              className={`w-12 h-6 rounded-full ${
                showOnlyConventioned ? 'bg-green-500' : 'bg-gray-300'
              } justify-center`}
            >
              <View className={`w-5 h-5 bg-white rounded-full ${
                showOnlyConventioned ? 'self-end mr-0.5' : 'self-start ml-0.5'
              }`} />
            </Pressable>
          </HStack>

          {/* Filtre de proximité */}
          {userLocation && (
            <HStack justify="between" align="center">
              <View>
                <Text className="font-semibold">Proximité</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Afficher dans un rayon de {proximityRadius}km
                </Text>
              </View>
              <Pressable
                onPress={toggleNearbyOnly}
                className={`w-12 h-6 rounded-full ${
                  showNearbyOnly ? 'bg-purple-500' : 'bg-gray-300'
                } justify-center`}
              >
                <View className={`w-5 h-5 bg-white rounded-full ${
                  showNearbyOnly ? 'self-end mr-0.5' : 'self-start ml-0.5'
                }`} />
              </Pressable>
            </HStack>
          )}
        </VStack>
      </View>
    );
  };

  // Header avec statistiques et toggle
  const HeaderSection = () => (
    <View className="px-6 pb-4">
      {/* Titre et toggle vue */}
      <HStack justify="between" align="center" className="mb-4">
        <View>
          <Text className="text-2xl font-bold">🩺 Prestataires</Text>
          <Text className="text-gray-600 dark:text-gray-400">
            {filteredProviders.length} sur {providers.length} prestataires
          </Text>
        </View>
        
        <HStack spacing="sm">
          <Pressable
            onPress={toggleViewMode}
            className={`px-4 py-2 rounded-full ${
              viewMode === 'list' 
                ? 'bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <Text className={`font-semibold ${
              viewMode === 'list' 
                ? 'text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              📋 Liste
            </Text>
          </Pressable>
          
          <Pressable
            onPress={toggleViewMode}
            className={`px-4 py-2 rounded-full ${
              viewMode === 'map' 
                ? 'bg-blue-500' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <Text className={`font-semibold ${
              viewMode === 'map' 
                ? 'text-white' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              🗺️ Carte
            </Text>
          </Pressable>
        </HStack>
      </HStack>

      {/* Statistiques rapides */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <HStack spacing="md">
            <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 min-w-[100px]">
              <Text className="text-2xl text-blue-600 font-bold">{stats.total}</Text>
              <Text className="text-blue-500 text-sm">Total</Text>
            </View>
            
            <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 min-w-[100px]">
              <Text className="text-2xl text-green-600 font-bold">{stats.conventioned}</Text>
              <Text className="text-green-500 text-sm">Conventionnés</Text>
            </View>
            
            <View className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-3 min-w-[120px]">
              <Text className="text-2xl text-purple-600 font-bold">
                {Object.keys(stats.by_type).length}
              </Text>
              <Text className="text-purple-500 text-sm">Types</Text>
            </View>
            
            <View className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-3 min-w-[100px]">
              <Text className="text-2xl text-orange-600 font-bold">
                {Object.keys(stats.by_city).length}
              </Text>
              <Text className="text-orange-500 text-sm">Villes</Text>
            </View>
          </HStack>
        </ScrollView>
      )}

      {/* Barre de recherche */}
      {showSearchBar && <SearchBar />}
      
      {/* Panel de filtres */}
      <FiltersPanel />
    </View>
  );

  // Vérification de l'authentification
  if (!user) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-6">
        <Text className="text-6xl mb-4">🔒</Text>
        <ThemedText type="title" className="text-center mb-2">
          Connexion requise
        </ThemedText>
        <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Connectez-vous pour voir les prestataires de santé
        </ThemedText>
        <ThemedButton
          title="Se connecter"
          variant="primary"
          onPress={() => router.push('/login')}
        />
      </ThemedView>
    );
  }

  // État de chargement initial
  if (isLoading && providers.length === 0) {
    return (
      <ThemedView className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-lg font-semibold">Chargement des prestataires...</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
          Récupération et géolocalisation en cours...
        </Text>
      </ThemedView>
    );
  }

  // État vide (aucun prestataire)
  if (!isLoading && providers.length === 0) {
    return (
      <ThemedView className="flex-1">
        <View className="pt-16 pb-4 px-6">
          <Text className="text-2xl font-bold">🩺 Prestataires</Text>
        </View>
        
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-6xl mb-4">🏥</Text>
          <ThemedText type="title" className="text-center mb-2">
            Aucun prestataire disponible
          </ThemedText>
          <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Impossible de charger les données. Vérifiez votre connexion internet.
          </ThemedText>
          <ThemedButton
            title="🔄 Réessayer"
            variant="primary"
            onPress={() => fetchProviders(true)}
          />
        </View>
      </ThemedView>
    );
  }

  // Affichage principal
  return (
    <ThemedView className="flex-1">
      {/* Header fixe */}
      <View className={`pt-16 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b border-gray-200 dark:border-gray-700`}>
        <HeaderSection />
      </View>

      {/* Contenu principal selon le mode */}
      <View className="flex-1">
        {viewMode === 'list' ? (
          <ProvidersListView
            onProviderPress={handleProviderPress}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            showSearchBar={false} // Déjà dans le header
            showFilters={false}   // Déjà dans le header
          />
        ) : (
          <ProvidersMapView
            onProviderPress={handleProviderPress}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            showUserLocation={true}
            showControls={true}
            height={screenHeight - 200} // Ajuster selon le header
          />
        )}
      </View>
    </ThemedView>
  );
}