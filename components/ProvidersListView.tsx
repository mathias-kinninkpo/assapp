/**
 * ProvidersListView - Affichage en liste des prestataires de santé
 * Design moderne avec cartes, recherche et filtres
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { VStack, HStack } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { 
  useProviders, 
  useProvidersSearch, 
  useProvidersLocation,
  useProvidersUtils 
} from '@/stores/providersStore';
import type { Provider } from '@/services/providersService';

const { width: screenWidth } = Dimensions.get('window');

interface ProvidersListViewProps {
  onProviderPress?: (provider: Provider) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showSearchBar?: boolean;
  showFilters?: boolean;
  maxHeight?: number;
}

export const ProvidersListView: React.FC<ProvidersListViewProps> = ({
  onProviderPress,
  onRefresh,
  refreshing = false,
  showSearchBar = true,
  showFilters = true,
  maxHeight
}) => {
  const { colors, isDark } = useTheme();
  const { filteredProviders, isLoading, stats } = useProviders();
  const { userLocation, showNearbyOnly } = useProvidersLocation();
  const { getUniqueTypes, getUniqueCities } = useProvidersUtils();
  
  // États locaux
  const [expandedProviderId, setExpandedProviderId] = useState<number | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Gestion du clic sur un prestataire
  const handleProviderPress = (provider: Provider) => {
    if (onProviderPress) {
      onProviderPress(provider);
    } else {
      // Comportement par défaut : expand/collapse
      setExpandedProviderId(
        expandedProviderId === provider.id ? null : provider.id
      );
    }
  };

  // Actions rapides (appel, email)
  const handleCall = (phone: string) => {
    if (!phone) return;
    
    const cleanPhone = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application téléphone');
    });
  };

  const handleEmail = (email: string) => {
    if (!email) return;
    
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email');
    });
  };

  const handleNavigate = (provider: Provider) => {
    if (!provider.coordinates) {
      Alert.alert('Navigation', 'Coordonnées non disponibles pour ce prestataire');
      return;
    }

    const { latitude, longitude } = provider.coordinates;
    console.log("y aller", longitude, latitude)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    });
  };

  // Composant carte de prestataire
  const ProviderCard = ({ provider }: { provider: Provider }) => {
    const isExpanded = expandedProviderId === provider.id;
    const hasCoordinates = !!provider.coordinates;
    
    // Icône selon le type
    const getProviderIcon = (type: string) => {
      const iconMap: Record<string, string> = {
        'pharmacie': '💊',
        'clinique': '🏥',
        'hopital': '🏨',
        'laboratoire': '🔬',
        'cabinet': '👩‍⚕️',
        'dentiste': '🦷',
        'opticien': '👓'
      };
      
      const key = type.toLowerCase();
      return iconMap[key] || '🩺';
    };

    // Couleur selon le secteur
    const getSectorColor = (sector: string, agreeged: boolean) => {
      if (agreeged) {
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      }
      return sector === 'public' 
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
    };

    return (
      <Pressable
        onPress={() => handleProviderPress(provider)}
        className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        {/* En-tête */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl justify-center items-center mr-3">
              <Text className="text-2xl">{getProviderIcon(provider.provider_type)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                {provider.title}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {provider.provider_type}
              </Text>
            </View>
          </View>
          
          {/* Badges */}
          <View className="items-end">
            <View className={`px-2 py-1 rounded-full ${getSectorColor(provider.sector, provider.agreeged)} mb-1`}>
              <Text className="text-xs font-semibold">
                {provider.agreeged ? '✓ Conventionné' : provider.sector}
              </Text>
            </View>
            {provider.distance_from_user && (
              <Text className="text-xs text-gray-500">
                📍 {provider.distance_from_user.toFixed(1)} km
              </Text>
            )}
          </View>
        </View>

        {/* Adresse */}
        <View className="flex-row items-center mb-3">
          <Text className="text-gray-500 mr-2">📍</Text>
          <Text className="text-gray-700 dark:text-gray-300 flex-1">
            {provider.address}{provider.address && ', '}{provider.city}
          </Text>
        </View>

        {/* Contact rapide */}
        {(provider.phones.length > 0 || provider.emails.length > 0) && (
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row">
              {provider.phones.filter(p => p.phone).slice(0, 1).map((phone, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleCall(phone.phone)}
                  className="bg-green-500 px-3 py-1 rounded-full mr-2"
                >
                  <Text className="text-white text-xs font-semibold">📞 Appeler</Text>
                </Pressable>
              ))}
              
              {provider.emails.slice(0, 1).map((email, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleEmail(email.email)}
                  className="bg-blue-500 px-3 py-1 rounded-full mr-2"
                >
                  <Text className="text-white text-xs font-semibold">✉️ Email</Text>
                </Pressable>
              ))}
            </View>

            {hasCoordinates && (
              <Pressable
                onPress={() => handleNavigate(provider)}
                className="bg-purple-500 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs font-semibold">🧭 Y aller</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Détails expandables */}
        {isExpanded && (
          <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            {/* Tous les contacts */}
            {provider.phones.length > 0 && (
              <View className="mb-3">
                <Text className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📞 Téléphones
                </Text>
                {provider.phones.filter(p => p.phone).map((phone, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleCall(phone.phone)}
                    className="flex-row items-center py-1"
                  >
                    <Text className="text-blue-500 font-medium">{phone.phone}</Text>
                    {phone.whatsapp && (
                      <Text className="ml-2 text-green-500 text-xs">WhatsApp</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {provider.emails.length > 0 && (
              <View className="mb-3">
                <Text className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  ✉️ Emails
                </Text>
                {provider.emails.map((email, index) => (
                  <Pressable
                    key={index}
                    onPress={() => handleEmail(email.email)}
                  >
                    <Text className="text-blue-500 font-medium py-1">{email.email}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Informations complémentaires */}
            <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <VStack spacing="xs">
                <HStack justify="between">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Code</Text>
                  <Text className="font-medium text-sm">{provider.code}</Text>
                </HStack>
                <HStack justify="between">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Secteur</Text>
                  <Text className="font-medium text-sm capitalize">{provider.sector}</Text>
                </HStack>
                {provider.coordinates && (
                  <HStack justify="between">
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">Géolocalisation</Text>
                    <Text className="font-medium text-sm text-green-600">
                      {provider.coordinates.accuracy === 'exact' ? '✅ Précise' : 
                       provider.coordinates.accuracy === 'approximate' ? '📍 Approximative' : 
                       '🏙️ Ville'}
                    </Text>
                  </HStack>
                )}
                {provider.note && (
                  <View>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">Note</Text>
                    <Text className="text-sm">{provider.note}</Text>
                  </View>
                )}
              </VStack>
            </View>
          </View>
        )}

        {/* Indicateur expand/collapse */}
        <View className="items-center mt-2">
          <Text className="text-gray-400 text-xs">
            {isExpanded ? '▲ Moins de détails' : '▼ Plus de détails'}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Composant de statistiques en en-tête
  const StatsHeader = () => {
    if (!stats) return null;

    return (
      <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
        <HStack justify="between" align="center">
          <View>
            <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {filteredProviders.length}
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-sm">
              prestataire{filteredProviders.length > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-semibold text-green-600">
              {stats.conventioned}
            </Text>
            <Text className="text-green-500 text-xs">conventionnés</Text>
          </View>
          
          {showNearbyOnly && userLocation && (
            <View className="items-center">
              <Text className="text-lg font-semibold text-purple-600">📍</Text>
              <Text className="text-purple-500 text-xs">proximité</Text>
            </View>
          )}
        </HStack>
      </View>
    );
  };

  // État de chargement
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center p-6">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Chargement des prestataires...
        </Text>
      </View>
    );
  }

  // État vide
  if (filteredProviders.length === 0) {
    return (
      <ScrollView
        className="flex-1"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <View className="items-center py-12 px-6">
          <Text className="text-6xl mb-4">🔍</Text>
          <Text className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
            Aucun prestataire trouvé
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
            Essayez de modifier vos critères de recherche ou vérifiez votre connexion internet
          </Text>
          {onRefresh && (
            <ThemedButton
              title="🔄 Actualiser"
              variant="outline"
              onPress={onRefresh}
            />
          )}
        </View>
      </ScrollView>
    );
  }

  // Affichage principal
  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 px-4"
        style={maxHeight ? { maxHeight } : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {/* En-tête avec statistiques */}
        <StatsHeader />

        {/* Liste des prestataires */}
        {filteredProviders.map(provider => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}

        {/* Espacement en bas */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

export default ProvidersListView;