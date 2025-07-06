/**
 * Service API pour la gestion des prestataires de santé
 * Intègre géocodage et mise en cache locale OPTIMISÉ
 * Version avec persistance intelligente des coordonnées
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from './api';

// import { BECOTRAC_API_KEY } from '@env';

// Types pour les prestataires
export interface ProviderEmail {
  email: string;
}

export interface ProviderPhone {
  phone: string;
  whatsapp: string | null;
}

export interface ProviderCoordinates {
  latitude: number;
  longitude: number;
  geocoded_at: string;
  geocoding_source: 'api' | 'manual' | 'fallback';
  accuracy?: 'exact' | 'approximate' | 'city_level';
}

export interface Provider {
  id: number;
  title: string;
  provider_type: string;
  emails: ProviderEmail[];
  phones: ProviderPhone[];
  code: string;
  address: string;
  external_code: string;
  city: string;
  country: string | null;
  county: string | null;
  note: string;
  sector: 'privé' | 'public';
  agreeged: boolean;
  // Nouvelles propriétés ajoutées par notre service
  coordinates?: ProviderCoordinates;
  distance_from_user?: number; // en km
  last_updated?: string;
}

export interface ProvidersApiResponse {
  success: boolean;
  data: Omit<Provider, 'coordinates' | 'distance_from_user' | 'last_updated'>[];
}

export interface ProviderSearchFilter {
  type?: string;
  city?: string;
  sector?: 'privé' | 'public';
  agreeged?: boolean;
  searchText?: string;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
  };
}

export interface ProviderStats {
  total: number;
  by_type: Record<string, number>;
  by_city: Record<string, number>;
  by_sector: Record<string, number>;
  conventioned: number;
}

// Configuration du géocodage
const GEOCODING_CONFIG = {
  // Service Nominatim (OpenStreetMap) - gratuit
  nominatimUrl: 'https://nominatim.openstreetmap.org/search',
  // Fallback coordinates pour Cotonou, Bénin
  fallbackCoordinates: {
    latitude: 6.3654,
    longitude: 2.4183,
    city: 'COTONOU'
  },
  // Cache timeout : 90 jours (3 mois) pour les coordonnées
  coordinatesCacheTimeout: 90 * 24 * 60 * 60 * 1000,
  // Cache timeout : 24h pour les données générales
  dataCacheTimeout: 24 * 60 * 60 * 1000,
  // Délai entre requêtes pour respecter les limites de l'API
  requestDelay: 1000
};

// Clés de stockage
const STORAGE_KEYS = {
  providers: 'providers_cache',
  providers_with_coordinates: 'providers_with_coordinates_v2', // Nouvelle clé pour éviter les conflits
  geocoding_cache: 'geocoding_cache_v2',
  geocoding_metadata: 'geocoding_metadata',
  last_sync: 'providers_last_sync',
  last_geocoding_sync: 'providers_last_geocoding_sync'
};

// Interface pour les métadonnées de géocodage
interface GeocodingMetadata {
  total_providers: number;
  geocoded_providers: number;
  last_full_geocoding: string;
  version: string;
}

// Service de géocodage amélioré
class GeocodingService {
  private static cache = new Map<string, ProviderCoordinates>();
  private static isInitialized = false;

  // Initialiser le service (charger tous les caches)
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔧 Initialisation du service de géocodage...');
    await this.loadCache();
    this.isInitialized = true;
    console.log('✅ Service de géocodage initialisé');
  }

  // Charger le cache depuis AsyncStorage
  static async loadCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.geocoding_cache);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = new Map(Object.entries(parsed));
        console.log(`📱 Cache géocodage chargé: ${this.cache.size} entrées`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement cache géocodage:', error);
    }
  }

  // Sauvegarder le cache dans AsyncStorage
  static async saveCache(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      await AsyncStorage.setItem(STORAGE_KEYS.geocoding_cache, JSON.stringify(cacheObject));
      console.log(`💾 Cache géocodage sauvegardé: ${this.cache.size} entrées`);
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde cache géocodage:', error);
    }
  }

  // Créer une clé de cache à partir de l'adresse et ville
  private static createCacheKey(address: string, city: string): string {
    const cleanAddress = address.toLowerCase().trim().replace(/\s+/g, ' ');
    const cleanCity = city.toLowerCase().trim();
    return `${cleanAddress}_${cleanCity}`;
  }

  // Vérifier si les coordonnées en cache sont encore valides
  private static isCacheValid(coordinates: ProviderCoordinates): boolean {
    const cacheAge = Date.now() - new Date(coordinates.geocoded_at).getTime();
    return cacheAge < GEOCODING_CONFIG.coordinatesCacheTimeout;
  }

  // Géocoder une adresse via Nominatim avec cache persistant
  static async geocodeAddress(
    address: string, 
    city: string, 
    country: string = 'Bénin'
  ): Promise<ProviderCoordinates | null> {
    await this.initialize();
    
    const cacheKey = this.createCacheKey(address, city);
    
    // Vérifier le cache d'abord
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      
      if (this.isCacheValid(cached)) {
        console.log(`📍 Cache hit: ${city} -> ${cached.latitude}, ${cached.longitude}`);
        return cached;
      } else {
        console.log(`🗑️ Cache expiré pour: ${city}`);
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Construire la requête de géocodage
      const query = address && address.trim() 
        ? `${address}, ${city}, ${country}`
        : `${city}, ${country}`;

      const url = new URL(GEOCODING_CONFIG.nominatimUrl);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '1');
      url.searchParams.append('countrycodes', 'bj'); // Code pays Bénin

      console.log(`🔍 Géocodage API: ${query}`);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Adjibola-Health-App/1.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const results = await response.json();

      if (results && results.length > 0) {
        const result = results[0];
        const coordinates: ProviderCoordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          geocoded_at: new Date().toISOString(),
          geocoding_source: 'api',
          accuracy: address && address.trim() ? 'approximate' : 'city_level'
        };

        // Mettre en cache
        this.cache.set(cacheKey, coordinates);
        await this.saveCache();

        console.log(`✅ Géocodé: ${city} -> ${coordinates.latitude}, ${coordinates.longitude}`);
        return coordinates;
      } else {
        // Pas de résultat - utiliser fallback si c'est une ville connue
        return this.getFallbackCoordinates(city);
      }
    } catch (error) {
      console.warn(`❌ Erreur géocodage pour "${city}":`, error);
      return this.getFallbackCoordinates(city);
    }
  }

  // Obtenir des coordonnées de fallback avec mise en cache
  private static getFallbackCoordinates(city: string): ProviderCoordinates | null {
    const normalizedCity = city.toLowerCase().trim();
    
    // Coordonnées de fallback pour les principales villes du Bénin
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'cotonou': { lat: 6.3654, lng: 2.4183 },
      'porto-novo': { lat: 6.4969, lng: 2.6283 },
      'parakou': { lat: 9.3372, lng: 2.6303 },
      'djougou': { lat: 9.7086, lng: 1.6706 },
      'bohicon': { lat: 7.1781, lng: 2.0672 },
      'kandi': { lat: 11.1342, lng: 2.9387 },
      'ouidah': { lat: 6.3617, lng: 2.0852 },
      'abomey': { lat: 7.1826, lng: 1.9912 },
      'abomey-calavi': { lat: 6.4421, lng: 2.3569 },
      'lokossa': { lat: 6.6389, lng: 1.7167 },
      'natitingou': { lat: 10.3167, lng: 1.3833 },
      'savalou': { lat: 7.9286, lng: 1.9753 },
      'pobè': { lat: 6.9833, lng: 2.6667 },
      'tchaourou': { lat: 8.8833, lng: 2.6000 }
    };

    const coords = cityCoordinates[normalizedCity];
    if (coords) {
      const fallbackCoords: ProviderCoordinates = {
        latitude: coords.lat,
        longitude: coords.lng,
        geocoded_at: new Date().toISOString(),
        geocoding_source: 'fallback',
        accuracy: 'city_level'
      };

      // Mettre en cache aussi les fallbacks
      const cacheKey = this.createCacheKey('', city);
      this.cache.set(cacheKey, fallbackCoords);
      this.saveCache();

      console.log(`📍 Fallback: ${city} -> ${coords.lat}, ${coords.lng}`);
      return fallbackCoords;
    }

    return null;
  }

  // Obtenir les statistiques du cache
  static getCacheStats(): { size: number; cities: string[] } {
    return {
      size: this.cache.size,
      cities: Array.from(this.cache.keys()).map(key => key.split('_').pop() || '').filter(Boolean)
    };
  }

  // Nettoyer le cache expiré
  static async cleanExpiredCache(): Promise<number> {
    await this.initialize();
    
    let removedCount = 0;
    const now = Date.now();
    
    for (const [key, coordinates] of this.cache.entries()) {
      const cacheAge = now - new Date(coordinates.geocoded_at).getTime();
      if (cacheAge > GEOCODING_CONFIG.coordinatesCacheTimeout) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await this.saveCache();
      console.log(`🗑️ ${removedCount} entrées expirées supprimées du cache`);
    }
    
    return removedCount;
  }

  // Ajouter un délai entre les requêtes
  static async delay(ms: number = GEOCODING_CONFIG.requestDelay): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Vider complètement le cache
  static async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem(STORAGE_KEYS.geocoding_cache);
    console.log('🗑️ Cache géocodage vidé complètement');
  }
}

// Service principal des prestataires OPTIMISÉ
export class ProvidersService {
  private static readonly API_URL = 'https://atlas.becotrac.com/api/providers/';

  // Charger les prestataires avec coordonnées depuis le cache persistant
  static async loadProvidersWithCoordinates(): Promise<Provider[]> {
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.providers_with_coordinates);
      
      if (!cachedData) {
        console.log('📱 Aucun cache de prestataires avec coordonnées trouvé');
        return [];
      }

      const parsed = JSON.parse(cachedData);
      
      if (!parsed.providers || !Array.isArray(parsed.providers)) {
        console.warn('⚠️ Format de cache invalide');
        return [];
      }

      console.log(`📱 ${parsed.providers.length} prestataires avec coordonnées chargés depuis le cache`);
      return parsed.providers;
    } catch (error) {
      console.error('❌ Erreur chargement prestataires avec coordonnées:', error);
      return [];
    }
  }

  // Sauvegarder les prestataires avec coordonnées
  static async saveProvidersWithCoordinates(providers: Provider[]): Promise<void> {
    try {
      const cacheData = {
        providers,
        cached_at: new Date().toISOString(),
        version: '2.0',
        geocoding_stats: GeocodingService.getCacheStats()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.providers_with_coordinates, JSON.stringify(cacheData));
      
      // Sauvegarder aussi les métadonnées
      const metadata: GeocodingMetadata = {
        total_providers: providers.length,
        geocoded_providers: providers.filter(p => p.coordinates).length,
        last_full_geocoding: new Date().toISOString(),
        version: '2.0'
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.geocoding_metadata, JSON.stringify(metadata));
      
      console.log(`💾 ${providers.length} prestataires avec coordonnées sauvegardés`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde prestataires avec coordonnées:', error);
    }
  }

  // Vérifier si on a besoin de re-géocoder
  static async needsGeocodingUpdate(apiProviders: Omit<Provider, 'coordinates' | 'distance_from_user' | 'last_updated'>[]): Promise<boolean> {
    try {
      const cachedProviders = await this.loadProvidersWithCoordinates();
      const metadata = await AsyncStorage.getItem(STORAGE_KEYS.geocoding_metadata);
      
      if (cachedProviders.length === 0) {
        console.log('🔄 Pas de cache de coordonnées -> Géocodage nécessaire');
        return true;
      }

      if (!metadata) {
        console.log('🔄 Pas de métadonnées -> Géocodage nécessaire');
        return true;
      }

      const metaParsed: GeocodingMetadata = JSON.parse(metadata);
      
      // Vérifier si le nombre de prestataires a changé
      if (metaParsed.total_providers !== apiProviders.length) {
        console.log(`🔄 Nombre de prestataires changé: ${metaParsed.total_providers} -> ${apiProviders.length}`);
        return true;
      }

      // Vérifier s'il y a de nouveaux prestataires
      const cachedIds = new Set(cachedProviders.map(p => p.id));
      const newProviders = apiProviders.filter(p => !cachedIds.has(p.id));
      
      if (newProviders.length > 0) {
        console.log(`🔄 ${newProviders.length} nouveaux prestataires détectés`);
        return true;
      }

      // Vérifier si les adresses ont changé
      const addressChanges = apiProviders.some(apiProvider => {
        const cached = cachedProviders.find(c => c.id === apiProvider.id);
        return cached && (cached.address !== apiProvider.address || cached.city !== apiProvider.city);
      });

      if (addressChanges) {
        console.log('🔄 Changements d\'adresses détectés');
        return true;
      }

      console.log('✅ Aucun géocodage nécessaire - Utilisation du cache');
      return false;

    } catch (error) {
      console.error('❌ Erreur vérification géocodage:', error);
      return true; // En cas d'erreur, on re-géocode par sécurité
    }
  }

  // Fusionner les données API avec les coordonnées en cache
  static async mergeWithCachedCoordinates(apiProviders: Omit<Provider, 'coordinates' | 'distance_from_user' | 'last_updated'>[]): Promise<Provider[]> {
    const cachedProviders = await this.loadProvidersWithCoordinates();
    const cachedCoords = new Map(cachedProviders.map(p => [p.id, p.coordinates]).filter(([_, coords]) => coords));

    console.log(`🔗 Fusion des données: ${apiProviders.length} de l'API + ${cachedCoords.size} coordonnées en cache`);

    return apiProviders.map(apiProvider => ({
      ...apiProvider,
      coordinates: cachedCoords.get(apiProvider.id),
      last_updated: new Date().toISOString()
    }));
  }

  // Géocoder uniquement les prestataires qui n'ont pas de coordonnées
  static async geocodeProviders(providers: Provider[]): Promise<Provider[]> {
    console.log('🗺️ Début du géocodage intelligent des prestataires...');
    
    // Initialiser le service de géocodage
    await GeocodingService.initialize();

    const needsGeocodingProviders = providers.filter(p => !p.coordinates);
    const alreadyGeocodedProviders = providers.filter(p => p.coordinates);

    console.log(`📊 État géocodage: ${alreadyGeocodedProviders.length} déjà géocodés, ${needsGeocodingProviders.length} à géocoder`);

    if (needsGeocodingProviders.length === 0) {
      console.log('✅ Tous les prestataires sont déjà géocodés');
      return providers;
    }

    const geocodedProviders: Provider[] = [...alreadyGeocodedProviders];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < needsGeocodingProviders.length; i++) {
      const provider = needsGeocodingProviders[i];
      
      try {
        console.log(`📍 Géocodage ${i + 1}/${needsGeocodingProviders.length}: ${provider.title} (${provider.city})`);

        // Géocoder l'adresse
        const coordinates = await GeocodingService.geocodeAddress(
          provider.address,
          provider.city || 'COTONOU'
        );

        const geocodedProvider: Provider = {
          ...provider,
          coordinates: coordinates || undefined,
          last_updated: new Date().toISOString()
        };

        geocodedProviders.push(geocodedProvider);

        if (coordinates) {
          successCount++;
        } else {
          errorCount++;
          console.warn(`⚠️ Géocodage échoué: ${provider.title}`);
        }

        // Délai entre les requêtes pour respecter les limites de l'API
        if (i < needsGeocodingProviders.length - 1) {
          await GeocodingService.delay();
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur géocodage ${provider.title}:`, error);
        
        // Ajouter le prestataire sans coordonnées
        geocodedProviders.push({
          ...provider,
          last_updated: new Date().toISOString()
        });
      }
    }

    console.log(`🎯 Géocodage terminé: ${successCount} succès, ${errorCount} échecs sur ${needsGeocodingProviders.length} nouveaux`);
    return geocodedProviders;
  }

  // Récupérer les prestataires depuis l'API avec géocodage intelligent
  static async fetchProvidersFromAPI(): Promise<ApiResponse<Provider[]>> {
    try {
      console.log('🔄 Récupération des prestataires depuis l\'API...');
      
      const apiKey = "sk_live_f2b6d845er2v28d9c71a2e493skg5sz66d8";
      if (!apiKey) {
        throw new Error('Clé API manquante (BECOTRAC_API_KEY)');
      }
      
      const response = await fetch(this.API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const apiData: ProvidersApiResponse = await response.json();

      if (!apiData.success || !Array.isArray(apiData.data)) {
        throw new Error('Format de réponse API invalide');
      }

      console.log(`✅ ${apiData.data.length} prestataires récupérés de l'API`);

      // Vérifier si on a besoin de re-géocoder
      const needsGeocodingUpdate = await this.needsGeocodingUpdate(apiData.data);

      let providersWithCoordinates: Provider[];

      if (needsGeocodingUpdate) {
        console.log('🔄 Mise à jour du géocodage nécessaire');
        
        // Fusionner avec les coordonnées existantes
        const mergedProviders = await this.mergeWithCachedCoordinates(apiData.data);
        
        // Géocoder seulement ceux qui n'ont pas de coordonnées
        providersWithCoordinates = await this.geocodeProviders(mergedProviders);
        
        // Sauvegarder le résultat
        await this.saveProvidersWithCoordinates(providersWithCoordinates);
      } else {
        console.log('✅ Utilisation des coordonnées en cache');
        providersWithCoordinates = await this.mergeWithCachedCoordinates(apiData.data);
      }

      // Nettoyer le cache expiré en arrière-plan
      GeocodingService.cleanExpiredCache().catch(console.warn);

      return {
        success: true,
        data: providersWithCoordinates,
        message: `${providersWithCoordinates.length} prestataires traités avec géolocalisation optimisée`
      };

    } catch (error) {
      console.error('❌ Erreur API prestataires:', error);
      
      // Fallback sur les coordonnées en cache
      const cachedProvidersWithCoords = await this.loadProvidersWithCoordinates();
      if (cachedProvidersWithCoords.length > 0) {
        console.log('🔄 Utilisation du cache complet en fallback');
        return {
          success: true,
          data: cachedProvidersWithCoords,
          message: 'API inaccessible - Données depuis le cache complet avec coordonnées'
        };
      }
      
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération'
      };
    }
  }

  // Sauvegarder les prestataires en cache local (ancienne méthode pour compatibilité)
  static async saveToCache(providers: Provider[]): Promise<void> {
    try {
      const cacheData = {
        providers,
        cached_at: new Date().toISOString(),
        version: '1.0'
      };

      await AsyncStorage.setItem(STORAGE_KEYS.providers, JSON.stringify(cacheData));
      await AsyncStorage.setItem(STORAGE_KEYS.last_sync, new Date().toISOString());
      
      // Sauvegarder aussi dans le nouveau format
      await this.saveProvidersWithCoordinates(providers);
      
      console.log(`💾 ${providers.length} prestataires sauvegardés en cache (ancien + nouveau format)`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
    }
  }

  // Charger les prestataires depuis le cache local (ancienne méthode pour compatibilité)
  static async loadFromCache(): Promise<Provider[]> {
    try {
      // Essayer d'abord le nouveau format avec coordonnées
      const providersWithCoords = await this.loadProvidersWithCoordinates();
      if (providersWithCoords.length > 0) {
        return providersWithCoords;
      }

      // Fallback sur l'ancien format
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.providers);
      
      if (!cachedData) {
        return [];
      }

      const parsed = JSON.parse(cachedData);
      
      if (!parsed.providers || !Array.isArray(parsed.providers)) {
        return [];
      }

      console.log(`📱 ${parsed.providers.length} prestataires chargés depuis l'ancien cache`);
      return parsed.providers;
    } catch (error) {
      console.error('❌ Erreur chargement cache:', error);
      return [];
    }
  }

  // Vérifier si le cache est expiré
  static async isCacheExpired(maxAgeHours: number = 24): Promise<boolean> {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.last_sync);
      
      if (!lastSync) {
        return true; // Pas de cache
      }

      const lastSyncDate = new Date(lastSync);
      const now = new Date();
      const diffHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);

      return diffHours > maxAgeHours;
    } catch (error) {
      return true; // En cas d'erreur, considérer comme expiré
    }
  }

  // Synchroniser les données (cache + API si nécessaire) - OPTIMISÉ
  static async syncProviders(forceRefresh: boolean = false): Promise<ApiResponse<Provider[]>> {
    try {
      const cacheExpired = await this.isCacheExpired();
      
      if (!forceRefresh && !cacheExpired) {
        // Utiliser le cache avec coordonnées
        const cachedProviders = await this.loadProvidersWithCoordinates();
        if (cachedProviders.length > 0) {
          console.log(`✅ Utilisation du cache: ${cachedProviders.length} prestataires avec ${cachedProviders.filter(p => p.coordinates).length} géocodés`);
          return {
            success: true,
            data: cachedProviders,
            message: 'Données chargées depuis le cache avec coordonnées'
          };
        }
      }

      // Récupérer depuis l'API avec géocodage intelligent
      const apiResponse = await this.fetchProvidersFromAPI();
      
      if (apiResponse.success && apiResponse.data.length > 0) {
        // Sauvegarder en cache (les deux formats)
        await this.saveToCache(apiResponse.data);
        return apiResponse;
      } else {
        // Fallback sur le cache en cas d'erreur API
        const cachedProviders = await this.loadFromCache();
        if (cachedProviders.length > 0) {
          return {
            success: true,
            data: cachedProviders,
            message: 'API inaccessible - Données depuis le cache'
          };
        }
        
        return apiResponse;
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      return {
        success: false,
        data: [],
        error: 'Erreur lors de la synchronisation des données'
      };
    }
  }

  // Méthodes de recherche et utilitaires (inchangées)
  static filterProviders(providers: Provider[], filter: ProviderSearchFilter): Provider[] {
    let filtered = [...providers];

    if (filter.type) {
      filtered = filtered.filter(p => 
        p.provider_type.toLowerCase().includes(filter.type!.toLowerCase())
      );
    }

    if (filter.city) {
      filtered = filtered.filter(p => 
        p.city.toLowerCase().includes(filter.city!.toLowerCase())
      );
    }

    if (filter.sector) {
      filtered = filtered.filter(p => p.sector === filter.sector);
    }

    if (filter.agreeged !== undefined) {
      filtered = filtered.filter(p => p.agreeged === filter.agreeged);
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.address.toLowerCase().includes(searchLower) ||
        p.provider_type.toLowerCase().includes(searchLower) ||
        p.emails.some(e => e.email.toLowerCase().includes(searchLower))
      );
    }

    if (filter.nearLocation && filter.nearLocation.latitude && filter.nearLocation.longitude) {
      const userLat = filter.nearLocation.latitude;
      const userLng = filter.nearLocation.longitude;
      const radiusKm = filter.nearLocation.radiusKm || 10;

      filtered = filtered
        .filter(p => p.coordinates)
        .map(p => ({
          ...p,
          distance_from_user: this.calculateDistance(
            userLat, userLng,
            p.coordinates!.latitude, p.coordinates!.longitude
          )
        }))
        .filter(p => p.distance_from_user! <= radiusKm)
        .sort((a, b) => a.distance_from_user! - b.distance_from_user!);
    }

    return filtered;
  }

  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static getProviderStats(providers: Provider[]): ProviderStats {
    const stats: ProviderStats = {
      total: providers.length,
      by_type: {},
      by_city: {},
      by_sector: {},
      conventioned: 0
    };

    providers.forEach(provider => {
      stats.by_type[provider.provider_type] = (stats.by_type[provider.provider_type] || 0) + 1;
      stats.by_city[provider.city] = (stats.by_city[provider.city] || 0) + 1;
      stats.by_sector[provider.sector] = (stats.by_sector[provider.sector] || 0) + 1;
      
      if (provider.agreeged) {
        stats.conventioned++;
      }
    });

    return stats;
  }

  // Nettoyer le cache - AMÉLIORÉ
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.providers);
      await AsyncStorage.removeItem(STORAGE_KEYS.providers_with_coordinates);
      await AsyncStorage.removeItem(STORAGE_KEYS.geocoding_cache);
      await AsyncStorage.removeItem(STORAGE_KEYS.geocoding_metadata);
      await AsyncStorage.removeItem(STORAGE_KEYS.last_sync);
      await AsyncStorage.removeItem(STORAGE_KEYS.last_geocoding_sync);
      
      // Nettoyer aussi le cache en mémoire
      await GeocodingService.clearCache();
      
      console.log('🗑️ Cache des prestataires nettoyé complètement (ancien + nouveau format)');
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
    }
  }

  // Obtenir les statistiques du cache et géocodage
  static async getCacheInfo(): Promise<{
    providers_count: number;
    geocoded_count: number;
    cache_size: number;
    last_update: string | null;
    geocoding_stats: any;
  }> {
    try {
      const providers = await this.loadProvidersWithCoordinates();
      const geocodedCount = providers.filter(p => p.coordinates).length;
      const geoStats = GeocodingService.getCacheStats();
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.last_sync);

      return {
        providers_count: providers.length,
        geocoded_count: geocodedCount,
        cache_size: geoStats.size,
        last_update: lastSync,
        geocoding_stats: geoStats
      };
    } catch (error) {
      console.error('❌ Erreur récupération info cache:', error);
      return {
        providers_count: 0,
        geocoded_count: 0,
        cache_size: 0,
        last_update: null,
        geocoding_stats: null
      };
    }
  }
}

// Export des services pour l'utilisation dans l'app - ENRICHI
export const providersServices = {
  // Synchronisation et cache
  sync: (forceRefresh?: boolean) => ProvidersService.syncProviders(forceRefresh),
  loadFromCache: () => ProvidersService.loadFromCache(),
  loadWithCoordinates: () => ProvidersService.loadProvidersWithCoordinates(),
  isCacheExpired: (maxAgeHours?: number) => ProvidersService.isCacheExpired(maxAgeHours),
  clearCache: () => ProvidersService.clearCache(),
  getCacheInfo: () => ProvidersService.getCacheInfo(),
  
  // Recherche et filtrage
  filter: (providers: Provider[], filter: ProviderSearchFilter) => 
    ProvidersService.filterProviders(providers, filter),
  
  // Statistiques
  getStats: (providers: Provider[]) => ProvidersService.getProviderStats(providers),
  
  // Géolocalisation
  calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    ProvidersService.calculateDistance(lat1, lng1, lat2, lng2),

  // Géocodage
  geocoding: {
    initialize: () => GeocodingService.initialize(),
    geocodeAddress: (address: string, city: string, country?: string) => 
      GeocodingService.geocodeAddress(address, city, country),
    getCacheStats: () => GeocodingService.getCacheStats(),
    cleanExpiredCache: () => GeocodingService.cleanExpiredCache(),
    clearCache: () => GeocodingService.clearCache()
  }
};

export default providersServices;