/**
 * ProvidersMapView - Affichage cartographique des prestataires de santé
 * Utilise Leaflet avec React Native WebView pour afficher une carte interactive
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  Dimensions,
  ActivityIndicator,
  Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { VStack, HStack } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { 
  useProviders, 
  useProvidersLocation,
  useProvidersView 
} from '@/stores/providersStore';
import type { Provider } from '@/services/providersService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ProvidersMapViewProps {
  onProviderPress?: (provider: Provider) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showUserLocation?: boolean;
  showControls?: boolean;
  height?: number;
}

// Configuration par défaut centrée sur Cotonou, Bénin
const DEFAULT_CENTER = {
  latitude: 6.3654,
  longitude: 2.4183,
  zoom: 12
};

export const ProvidersMapView: React.FC<ProvidersMapViewProps> = ({
  onProviderPress,
  onRefresh,
  refreshing = false,
  showUserLocation = true,
  showControls = true,
  height = screenHeight * 0.7
}) => {
  const { colors, isDark } = useTheme();
  const { filteredProviders, isLoading } = useProviders();
  const { userLocation, setUserLocation } = useProvidersLocation();
  const { selectProvider } = useProvidersView();
  
  // États locaux
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  
  // Ref pour la WebView
  const webViewRef = useRef<WebView>(null);

  // Filtrer les prestataires ayant des coordonnées
  const providersWithCoordinates = filteredProviders.filter(p => p.coordinates);

  // Obtenir l'icône selon le type de prestataire
  const getProviderIcon = (type: string): string => {
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

  // Obtenir la couleur du marqueur selon le secteur
  const getMarkerColor = (provider: Provider): string => {
    if (provider.agreeged) return '#22c55e'; // Vert pour conventionné
    return provider.sector === 'public' ? '#3b82f6' : '#8b5cf6'; // Bleu public, violet privé
  };

  // Générer le HTML de la carte Leaflet
  const generateMapHTML = () => {
    const markers = providersWithCoordinates.map(provider => ({
      id: provider.id,
      lat: provider.coordinates!.latitude,
      lng: provider.coordinates!.longitude,
      title: provider.title,
      type: provider.provider_type,
      address: provider.address,
      city: provider.city,
      icon: getProviderIcon(provider.provider_type),
      color: getMarkerColor(provider),
      agreeged: provider.agreeged,
      sector: provider.sector,
      phone: provider.phones.find(p => p.phone)?.phone || '',
      email: provider.emails[0]?.email || '',
    }));

    const userMarker = userLocation ? {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      isUser: true
    } : null;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Carte des Prestataires</title>
        
        <!-- Leaflet CSS -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
              crossorigin=""/>
        
        <!-- Leaflet JavaScript -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossorigin=""></script>
        
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            #map { 
                height: 100vh; 
                width: 100vw; 
            }
            .custom-popup {
                font-size: 14px;
                line-height: 1.4;
                min-width: 200px;
            }
            .popup-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
                color: #1f2937;
            }
            .popup-type {
                color: #6b7280;
                margin-bottom: 3px;
            }
            .popup-address {
                color: #9ca3af;
                font-size: 12px;
                margin-bottom: 8px;
            }
            .popup-badge {
                display: inline-block;
                background: #22c55e;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                margin-top: 5px;
            }
            .popup-actions {
                margin-top: 8px;
                display: flex;
                gap: 5px;
            }
            .popup-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }
            .popup-btn:hover {
                background: #2563eb;
            }
            .controls {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .control-btn {
                background: white;
                border: 2px solid rgba(0,0,0,0.2);
                border-radius: 4px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 18px;
                box-shadow: 0 1px 5px rgba(0,0,0,0.2);
            }
            .control-btn:hover {
                background: #f9f9f9;
            }
            .leaflet-control-attribution {
                font-size: 10px !important;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <script>
            // Initialiser la carte
            const map = L.map('map').setView([${DEFAULT_CENTER.latitude}, ${DEFAULT_CENTER.longitude}], ${DEFAULT_CENTER.zoom});
            
            // Couches de tuiles
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            });
            
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: '© Esri'
            });
            
            // Ajouter la couche par défaut
            let currentLayer = osmLayer;
            currentLayer.addTo(map);
            
            // Fonction pour basculer les couches
            function toggleMapType() {
                map.removeLayer(currentLayer);
                currentLayer = currentLayer === osmLayer ? satelliteLayer : osmLayer;
                currentLayer.addTo(map);
                
                // Notifier React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapTypeChanged',
                    mapType: currentLayer === osmLayer ? 'osm' : 'satellite'
                }));
            }
            
            // Groupe pour les marqueurs
            const markersGroup = L.layerGroup().addTo(map);
            
            // Marqueur utilisateur
            ${userMarker ? `
            const userIcon = L.divIcon({
                html: '<div style="background: #4285f4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                className: 'user-marker'
            });
            
            L.marker([${userMarker.lat}, ${userMarker.lng}], { icon: userIcon })
                .bindPopup('<div class="custom-popup"><div class="popup-title">📍 Votre position</div></div>')
                .addTo(markersGroup);
            ` : ''}
            
            // Marqueurs des prestataires
            const providers = ${JSON.stringify(markers)};
            
            providers.forEach(provider => {
                // Créer une icône personnalisée
                const customIcon = L.divIcon({
                    html: \`<div style="
                        background: \${provider.color}; 
                        color: white; 
                        width: 35px; 
                        height: 35px; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 18px; 
                        border: 3px solid white; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        cursor: pointer;
                    ">\${provider.icon}</div>\`,
                    iconSize: [35, 35],
                    iconAnchor: [17, 17],
                    className: 'provider-marker'
                });
                
                // Contenu du popup
                const popupContent = \`
                    <div class="custom-popup">
                        <div class="popup-title">\${provider.title}</div>
                        <div class="popup-type">\${provider.type}</div>
                        <div class="popup-address">\${provider.address}, \${provider.city}</div>
                        \${provider.agreeged ? '<span class="popup-badge">✓ Conventionné</span>' : ''}
                        <div class="popup-actions">
                            \${provider.phone ? \`<button class="popup-btn" onclick="callProvider('\${provider.phone}')">📞 Appeler</button>\` : ''}
                            <button class="popup-btn" onclick="selectProvider(\${provider.id})">👁️ Détails</button>
                            <button class="popup-btn" onclick="navigateToProvider(\${provider.lat}, \${provider.lng})">🧭 Y aller</button>
                        </div>
                    </div>
                \`;
                
                const marker = L.marker([provider.lat, provider.lng], { icon: customIcon })
                    .bindPopup(popupContent)
                    .addTo(markersGroup);
                
                // Événement de clic sur le marqueur
                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'markerPressed',
                        providerId: provider.id
                    }));
                });
            });
            
            // Ajuster la vue pour inclure tous les marqueurs
            if (providers.length > 0) {
                const group = new L.featureGroup(markersGroup.getLayers());
                map.fitBounds(group.getBounds().pad(0.1));
            }
            
            // Fonctions globales pour les popups
            window.callProvider = function(phone) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'callProvider',
                    phone: phone
                }));
            };
            
            window.selectProvider = function(providerId) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'selectProvider',
                    providerId: providerId
                }));
            };
            
            window.navigateToProvider = function(lat, lng) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'navigateToProvider',
                    latitude: lat,
                    longitude: lng
                }));
            };
            
            // Fonction pour centrer sur la position utilisateur
            window.centerOnUser = function() {
                ${userMarker ? `
                map.setView([${userMarker.lat}, ${userMarker.lng}], 15);
                ` : `
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'requestLocation'
                }));
                `}
            };
            
            // Créer les contrôles personnalisés
            const controlsHTML = \`
                <div class="controls">
                    <div class="control-btn" onclick="centerOnUser()" title="Ma position">📍</div>
                    <div class="control-btn" onclick="toggleMapType()" title="Type de carte">🗺️</div>
                    ${onRefresh ? '<div class="control-btn" onclick="refreshMap()" title="Actualiser">🔄</div>' : ''}
                </div>
            \`;
            
            document.body.insertAdjacentHTML('beforeend', controlsHTML);
            
            ${onRefresh ? `
            window.refreshMap = function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'refresh'
                }));
            };
            ` : ''}
            
            // Fonction pour mettre à jour la position utilisateur
            window.updateUserLocation = function(lat, lng) {
                // Supprimer l'ancien marqueur utilisateur
                markersGroup.eachLayer(function(layer) {
                    if (layer.options.icon && layer.options.icon.options.className === 'user-marker') {
                        markersGroup.removeLayer(layer);
                    }
                });
                
                // Ajouter le nouveau marqueur
                const userIcon = L.divIcon({
                    html: '<div style="background: #4285f4; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    className: 'user-marker'
                });
                
                L.marker([lat, lng], { icon: userIcon })
                    .bindPopup('<div class="custom-popup"><div class="popup-title">📍 Votre position</div></div>')
                    .addTo(markersGroup);
                
                // Centrer la carte
                map.setView([lat, lng], 15);
            };
            
            // Signaler que la carte est prête
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapReady'
            }));
            
            console.log('Carte Leaflet initialisée avec', providers.length, 'prestataires');
        </script>
    </body>
    </html>
    `;
  };

  // Gestion des messages de la WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          setMapReady(true);
          console.log('🗺️ Carte Leaflet prête');
          break;
          
        case 'markerPressed':
          const provider = providersWithCoordinates.find(p => p.id === data.providerId);
          if (provider) {
            handleMarkerPress(provider);
          }
          break;
          
        case 'selectProvider':
          const selectedProv = providersWithCoordinates.find(p => p.id === data.providerId);
          if (selectedProv) {
            setSelectedProvider(selectedProv);
            setShowProviderModal(true);
          }
          break;
          
        case 'callProvider':
          handleCall(data.phone);
          break;
          
        case 'navigateToProvider':
          handleNavigateToCoordinates(data.latitude, data.longitude);
          break;
          
        case 'requestLocation':
          requestUserLocation();
          break;
          
        case 'refresh':
          if (onRefresh) {
            onRefresh();
          }
          break;
          
        case 'mapTypeChanged':
          setMapType(data.mapType);
          break;
          
        default:
          console.log('Message WebView non géré:', data);
      }
    } catch (error) {
      console.error('Erreur parsing message WebView:', error);
    }
  };

  // Gestion du clic sur un marqueur
  const handleMarkerPress = (provider: Provider) => {
    setSelectedProvider(provider);
    selectProvider(provider.id);
    
    if (onProviderPress) {
      onProviderPress(provider);
    }
  };

  // Actions rapides
  const handleCall = (phone: string) => {
    if (!phone) return;
    
    const cleanPhone = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application téléphone');
    });
  };

  const handleNavigateToCoordinates = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    });
  };

  const handleNavigate = (provider: Provider) => {
    if (!provider.coordinates) return;
    handleNavigateToCoordinates(provider.coordinates.latitude, provider.coordinates.longitude);
  };

  // Demander la géolocalisation utilisateur
  const requestUserLocation = async () => {
    try {
      // Dans une vraie app, utiliser expo-location
      // Pour la démo, on simule
      const mockUserLocation = {
        latitude: 6.3654 + (Math.random() - 0.5) * 0.01,
        longitude: 2.4183 + (Math.random() - 0.5) * 0.01,
        accuracy: 10,
        timestamp: Date.now(),
      };
      
      setUserLocation(mockUserLocation);
      
      // Mettre à jour la carte
      if (webViewRef.current && mapReady) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'updateUserLocation',
          latitude: mockUserLocation.latitude,
          longitude: mockUserLocation.longitude
        }));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  };

  // Mettre à jour la position utilisateur sur la carte
  useEffect(() => {
    if (userLocation && webViewRef.current && mapReady) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateUserLocation',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      }));
    }
  }, [userLocation, mapReady]);

  // Modal de détails du prestataire
  const ProviderModal = () => {
    if (!selectedProvider) return null;

    return (
      <Modal
        visible={showProviderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <ThemedView className="flex-1">
          {/* Header */}
          <View className="pt-16 pb-4 px-6 border-b border-gray-200 dark:border-gray-700">
            <HStack justify="between" align="center">
              <Text className="text-xl font-bold">Détails du prestataire</Text>
              <Pressable onPress={() => setShowProviderModal(false)}>
                <Text className="text-2xl text-gray-500">✕</Text>
              </Pressable>
            </HStack>
          </View>

          <View className="flex-1 p-6">
            {/* En-tête avec type */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg">
              <HStack align="center" spacing="md">
                <View className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl justify-center items-center">
                  <Text className="text-3xl">{getProviderIcon(selectedProvider.provider_type)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedProvider.title}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 mb-2">
                    {selectedProvider.provider_type}
                  </Text>
                  <View className={`self-start px-3 py-1 rounded-full ${
                    selectedProvider.agreeged 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      selectedProvider.agreeged 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedProvider.agreeged ? '✓ Conventionné' : selectedProvider.sector}
                    </Text>
                  </View>
                </View>
              </HStack>
            </View>

            {/* Adresse */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-lg">
              <Text className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📍 Adresse</Text>
              <Text className="text-gray-600 dark:text-gray-400">
                {selectedProvider.address}
                {selectedProvider.address && ', '}
                {selectedProvider.city}
              </Text>
              {selectedProvider.distance_from_user && (
                <Text className="text-sm text-blue-500 mt-1">
                  Distance: {selectedProvider.distance_from_user.toFixed(1)} km
                </Text>
              )}
            </View>

            {/* Actions rapides */}
            <View className="flex-row space-x-3 mb-6">
              {selectedProvider.phones.filter(p => p.phone).slice(0, 1).map((phone, index) => (
                <ThemedButton
                  key={index}
                  title="📞 Appeler"
                  variant="primary"
                  onPress={() => handleCall(phone.phone)}
                  className="flex-1"
                />
              ))}
              
              {selectedProvider.coordinates && (
                <ThemedButton
                  title="🧭 Y aller"
                  variant="outline"
                  onPress={() => handleNavigate(selectedProvider)}
                  className="flex-1"
                />
              )}
            </View>

            {/* Contacts détaillés */}
            {(selectedProvider.phones.length > 0 || selectedProvider.emails.length > 0) && (
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                <Text className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  📞 Contacts
                </Text>
                
                <VStack spacing="sm">
                  {selectedProvider.phones.filter(p => p.phone).map((phone, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleCall(phone.phone)}
                      className="flex-row items-center py-2"
                    >
                      <Text className="text-blue-500 font-medium flex-1">{phone.phone}</Text>
                      {phone.whatsapp && (
                        <Text className="text-green-500 text-xs">WhatsApp</Text>
                      )}
                    </Pressable>
                  ))}
                  
                  {selectedProvider.emails.map((email, index) => (
                    <Pressable
                      key={index}
                      onPress={() => Linking.openURL(`mailto:${email.email}`)}
                      className="py-2"
                    >
                      <Text className="text-blue-500 font-medium">{email.email}</Text>
                    </Pressable>
                  ))}
                </VStack>
              </View>
            )}
          </View>
        </ThemedView>
      </Modal>
    );
  };

  // État de chargement
  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ height }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Chargement de la carte...
        </Text>
      </View>
    );
  }

  // Aucun prestataire avec coordonnées
  if (providersWithCoordinates.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-6" style={{ height }}>
        <Text className="text-6xl mb-4">🗺️</Text>
        <Text className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
          Aucune donnée cartographique
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Les prestataires n'ont pas encore été géolocalisés
        </Text>
        {onRefresh && (
          <ThemedButton
            title="🔄 Actualiser"
            variant="outline"
            onPress={onRefresh}
          />
        )}
      </View>
    );
  }

  // Affichage principal de la carte
  return (
    <View className="flex-1" style={{ height }}>
      {/* Carte Leaflet via WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={{ flex: 1 }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="mt-4 text-gray-600 dark:text-gray-400">
              Chargement de la carte Leaflet...
            </Text>
          </View>
        )}
        onLoadEnd={() => {
          console.log('🗺️ WebView chargée');
        }}
        onError={(error) => {
          console.error('❌ Erreur WebView:', error);
        }}
      />

      {/* Compteur en bas */}
      <View className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg">
        <Text className="font-semibold text-gray-700 dark:text-gray-300">
          📍 {providersWithCoordinates.length} prestataire{providersWithCoordinates.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Indicateur de type de carte */}
      {mapReady && (
        <View className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-full px-3 py-1 shadow-lg">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {mapType === 'osm' ? '🗺️ OpenStreetMap' : '🛰️ Satellite'}
          </Text>
        </View>
      )}

      {/* Modal de détails */}
      <ProviderModal />
    </View>
  );
};

export default ProvidersMapView;