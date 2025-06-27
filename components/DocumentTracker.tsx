/**
 * DocumentTracker - Composant créatif pour le suivi des documents
 * Affichage moderne avec timeline, états visuels et animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  RefreshControl,
  TextInput,
  Alert,
  Animated,
  Modal
} from 'react-native';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';
import { useDocuments, useDocumentSearch } from '@/stores/documentStore';
import { useAuthStore } from '@/stores/authStore';
import type { Document } from '@/services/documentService';

const { width: screenWidth } = Dimensions.get('window');

// Types pour le composant
interface DocumentTrackerProps {
  mode?: 'full' | 'compact' | 'search';
  maxItems?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  onDocumentPress?: (document: Document) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

interface StatusConfig {
  color: string;
  bgColor: string;
  icon: string;
  label: string;
  description: string;
  progress: number;
}

// Configuration des statuts avec design moderne
const STATUS_CONFIG: Record<Document['status'], StatusConfig> = {
  uploading: {
    color: '#3b82f6',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: '⬆️',
    label: 'Envoi en cours',
    description: 'Votre document est en cours d\'envoi...',
    progress: 25
  },
  pending: {
    color: '#f59e0b',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: '⏳',
    label: 'En attente',
    description: 'Document reçu, en attente de traitement',
    progress: 40
  },
  processing: {
    color: '#8b5cf6',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '⚙️',
    label: 'En traitement',
    description: 'Analyse et vérification en cours...',
    progress: 70
  },
  approved: {
    color: '#10b981',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: '✅',
    label: 'Approuvé',
    description: 'Document validé et traité avec succès',
    progress: 100
  },
  rejected: {
    color: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: '❌',
    label: 'Rejeté',
    description: 'Document rejeté - Action requise',
    progress: 100
  },
  completed: {
    color: '#059669',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: '🎉',
    label: 'Terminé',
    description: 'Processus terminé avec succès',
    progress: 100
  }
};

// Types de documents avec icônes
const DOCUMENT_TYPES = {
  feuille_soin: { name: 'Feuille de soins', icon: '🏥', color: '#3b82f6' },
  facture: { name: 'Facture médicale', icon: '💉', color: '#10b981' },
  ordonnance: { name: 'Ordonnance', icon: '💊', color: '#8b5cf6' },
  devis_dentaire: { name: 'Devis dentaire', icon: '🦷', color: '#ec4899' },
  devis_optique: { name: 'Devis optique', icon: '👓', color: '#6366f1' },
  transport: { name: 'Transport médical', icon: '🚑', color: '#ef4444' },
  certificat: { name: 'Certificat médical', icon: '📋', color: '#f59e0b' },
  autre: { name: 'Autre document', icon: '📄', color: '#6b7280' }
};

export const DocumentTracker: React.FC<DocumentTrackerProps> = ({
  mode = 'full',
  maxItems,
  showSearch = true,
  showFilters = true,
  onDocumentPress,
  refreshing = false,
  onRefresh
}) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { documents, isLoading, stats } = useDocuments();
  const { searchResults, currentFilter, searchDocuments, filterDocuments, clearFilters } = useDocumentSearch();
  
  // États locaux
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Document['status'] | 'all'>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // Animation d'entrée
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Documents à afficher selon le mode et les filtres
  const displayDocuments = React.useMemo(() => {
    let docs = searchQuery ? searchResults : documents;
    
    if (selectedFilter !== 'all') {
      docs = docs.filter(doc => doc.status === selectedFilter);
    }
    
    if (maxItems) {
      docs = docs.slice(0, maxItems);
    }
    
    return docs;
  }, [documents, searchResults, searchQuery, selectedFilter, maxItems]);

  // Gestion de la recherche
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchDocuments(query);
    } else {
      clearFilters();
    }
  };

  // Gestion des filtres
  const handleFilterChange = (filter: Document['status'] | 'all') => {
    setSelectedFilter(filter);
    if (filter !== 'all') {
      filterDocuments({ status: filter });
    } else {
      clearFilters();
    }
  };

  // Gestion du clic sur un document
  const handleDocumentPress = (document: Document) => {
    if (onDocumentPress) {
      onDocumentPress(document);
    } else {
      setSelectedDocument(document);
      setShowDetailModal(true);
    }
  };

  // Composant de recherche moderne
  const SearchBar = () => (
    <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center bg-white dark:bg-gray-700 rounded-xl px-4 py-3">
        <Text className="text-xl mr-3">🔍</Text>
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Rechercher par nom, description ou numéro..."
          placeholderTextColor={colors.textSecondary}
          className="flex-1 text-base"
          style={{ color: colors.text }}
        />
        {searchQuery ? (
          <Pressable onPress={() => handleSearch('')}>
            <Text className="text-gray-400 text-lg ml-2">✕</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  // Filtres par statut avec badges modernes
  const StatusFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className="mb-6"
      contentContainerStyle={{ paddingHorizontal: 4 }}
    >
      <Pressable
        onPress={() => handleFilterChange('all')}
        className={`mr-3 px-4 py-2 rounded-full ${
          selectedFilter === 'all' 
            ? 'bg-blue-500' 
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <Text className={`font-semibold ${
          selectedFilter === 'all' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
        }`}>
          Tous ({stats.total})
        </Text>
      </Pressable>
      
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const count = documents.filter(doc => doc.status === status).length;
        if (count === 0) return null;
        
        return (
          <Pressable
            key={status}
            onPress={() => handleFilterChange(status as Document['status'])}
            className={`mr-3 px-4 py-2 rounded-full ${
              selectedFilter === status 
                ? config.bgColor.replace('100', '500').replace('dark:bg-', '').replace('/30', '') 
                : config.bgColor
            }`}
          >
            <Text className={`font-semibold ${
              selectedFilter === status ? 'text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {config.icon} {config.label} ({count})
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // Carte de document avec design moderne et timeline
  const DocumentCard = ({ document }: { document: Document }) => {
    const statusConfig = STATUS_CONFIG[document.status];
    const documentType = DOCUMENT_TYPES[document.type];
    const submitDate = new Date(document.submittedAt);
    const updateDate = new Date(document.updatedAt);
    
    return (
      <Animated.View
        style={{
          opacity: animatedValue,
          transform: [{ translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })}]
        }}
      >
        <Pressable
          onPress={() => handleDocumentPress(document)}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          {/* En-tête avec type et statut */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View 
                className="w-12 h-12 rounded-xl justify-center items-center mr-3"
                style={{ backgroundColor: documentType.color + '20' }}
              >
                <Text className="text-2xl">{documentType.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg text-gray-900 dark:text-white">
                  {document.name}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {document.trackingNumber}
                </Text>
              </View>
            </View>
            
            <View className={`px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
              <View className="flex-row items-center">
                <Text className="mr-1">{statusConfig.icon}</Text>
                <Text 
                  className="text-xs font-semibold"
                  style={{ color: statusConfig.color }}
                >
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Description si disponible */}
          {document.description && (
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              {document.description}
            </Text>
          )}

          {/* Barre de progression moderne */}
          <View className="mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Progression
              </Text>
              <Text className="text-xs font-bold" style={{ color: statusConfig.color }}>
                {statusConfig.progress}%
              </Text>
            </View>
            <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: statusConfig.color,
                  width: `${statusConfig.progress}%`
                }}
              />
            </View>
          </View>

          {/* Timeline des dates */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Envoyé: {submitDate.toLocaleDateString('fr-FR')}
              </Text>
            </View>
            
            {document.processedAt && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Traité: {new Date(document.processedAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
          </View>

          {/* Message de rejet si applicable */}
          {document.status === 'rejected' && document.rejectionReason && (
            <View className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <View className="flex-row items-start">
                <Text className="text-red-500 mr-2">⚠️</Text>
                <Text className="text-red-700 dark:text-red-300 text-sm flex-1">
                  {document.rejectionReason}
                </Text>
              </View>
            </View>
          )}

          {/* Métadonnées techniques */}
          <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-500 dark:text-gray-500">
                📁 {document.fileName} • {Math.round(document.fileSize / 1024)}KB
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-500">
                {document.metadata.captureMethod === 'camera' ? '📸' : 
                 document.metadata.captureMethod === 'gallery' ? '🖼️' : '📑'} 
                {document.metadata.optimized ? ' • Optimisé' : ''}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Modal de détail de document
  const DocumentDetailModal = () => {
    if (!selectedDocument) return null;
    
    const statusConfig = STATUS_CONFIG[selectedDocument.status];
    const documentType = DOCUMENT_TYPES[selectedDocument.type];
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ThemedView className="flex-1">
          {/* Header */}
          <View className="pt-16 pb-4 px-6 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row justify-between items-center">
              <Text className="text-xl font-bold">Détails du document</Text>
              <Pressable onPress={() => setShowDetailModal(false)}>
                <Text className="text-2xl text-gray-500">✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 p-6">
            {/* En-tête détaillé */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg">
              <View className="flex-row items-center mb-4">
                <View 
                  className="w-16 h-16 rounded-2xl justify-center items-center mr-4"
                  style={{ backgroundColor: documentType.color + '20' }}
                >
                  <Text className="text-3xl">{documentType.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedDocument.name}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    {selectedDocument.trackingNumber}
                  </Text>
                  <View className={`mt-2 px-3 py-1 rounded-full ${statusConfig.bgColor} self-start`}>
                    <Text style={{ color: statusConfig.color }} className="font-semibold">
                      {statusConfig.icon} {statusConfig.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              {selectedDocument.description && (
                <Text className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedDocument.description}
                </Text>
              )}

              {/* Progression détaillée */}
              <View className="mb-4">
                <Text className="font-semibold mb-2">Progression du traitement</Text>
                <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View 
                    className="h-full rounded-full"
                    style={{ 
                      backgroundColor: statusConfig.color,
                      width: `${statusConfig.progress}%`
                    }}
                  />
                </View>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {statusConfig.description}
                </Text>
              </View>
            </View>

            {/* Timeline détaillée */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg">
              <Text className="text-lg font-bold mb-4">📅 Historique</Text>
              
              <View className="space-y-4">
                <View className="flex-row items-start">
                  <View className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3" />
                  <View className="flex-1">
                    <Text className="font-semibold">Document envoyé</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">
                      {new Date(selectedDocument.submittedAt).toLocaleString('fr-FR')}
                    </Text>
                  </View>
                </View>

                {selectedDocument.status !== 'pending' && (
                  <View className="flex-row items-start">
                    <View className="w-3 h-3 bg-purple-500 rounded-full mt-2 mr-3" />
                    <View className="flex-1">
                      <Text className="font-semibold">Traitement démarré</Text>
                      <Text className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(selectedDocument.updatedAt).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedDocument.processedAt && (
                  <View className="flex-row items-start">
                    <View 
                      className={`w-3 h-3 rounded-full mt-2 mr-3`}
                      style={{ backgroundColor: statusConfig.color }}
                    />
                    <View className="flex-1">
                      <Text className="font-semibold">
                        {selectedDocument.status === 'approved' ? 'Document approuvé' : 
                         selectedDocument.status === 'rejected' ? 'Document rejeté' : 
                         'Traitement terminé'}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(selectedDocument.processedAt).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Informations techniques */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <Text className="text-lg font-bold mb-4">🔧 Informations techniques</Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Nom du fichier</Text>
                  <Text className="font-medium">{selectedDocument.fileName}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Taille</Text>
                  <Text className="font-medium">{Math.round(selectedDocument.fileSize / 1024)}KB</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Format</Text>
                  <Text className="font-medium">{selectedDocument.mimeType}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Méthode de capture</Text>
                  <Text className="font-medium">
                    {selectedDocument.metadata.captureMethod === 'camera' ? '📸 Appareil photo' : 
                     selectedDocument.metadata.captureMethod === 'gallery' ? '🖼️ Galerie' : '📑 PDF'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Optimisé</Text>
                  <Text className="font-medium">
                    {selectedDocument.metadata.optimized ? '✅ Oui' : '❌ Non'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>
    );
  };

  // Vue compacte pour les widgets
  if (mode === 'compact') {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold">📋 Mes documents</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {displayDocuments.length} document{displayDocuments.length > 1 ? 's' : ''}
          </Text>
        </View>
        
        {displayDocuments.slice(0, 3).map(document => (
          <Pressable
            key={document.id}
            onPress={() => handleDocumentPress(document)}
            className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
          >
            <Text className="text-2xl mr-3">
              {DOCUMENT_TYPES[document.type].icon}
            </Text>
            <View className="flex-1">
              <Text className="font-medium">{document.name}</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {STATUS_CONFIG[document.status].label}
              </Text>
            </View>
            <View 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_CONFIG[document.status].color }}
            />
          </Pressable>
        ))}
        
        {displayDocuments.length > 3 && (
          <Text className="text-center text-sm text-blue-500 mt-2">
            +{displayDocuments.length - 3} autres documents
          </Text>
        )}
      </View>
    );
  }

  // Vue principale complète
  return (
    <ThemedView className="flex-1">
      <ScrollView 
        className="flex-1 p-7"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {/* En-tête avec statistiques */}
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-2">📋 Suivi des documents</Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-4">
            Suivez l'état de vos {stats.total} documents envoyés
          </Text>
          
          {/* Cartes de statistiques */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row space-x-4">
              <View className="bg-amber-100 dark:bg-amber-900/30 rounded-xl p-4 min-w-[120px] mx-2">
                <Text className="text-2xl text-amber-600">⏳</Text>
                <Text className="text-xl font-bold text-amber-800 dark:text-amber-200">
                  {stats.pending}
                </Text>
                <Text className="text-sm text-amber-700 dark:text-amber-300">
                  En attente
                </Text>
              </View>
              <View className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-4 min-w-[120px] mx-2">
                <Text className="text-2xl text-purple-600">⚙️</Text>
                <Text className="text-xl font-bold text-purple-800 dark:text-purple-200">
                  {stats.processing}
                </Text>
                <Text className="text-sm text-purple-700 dark:text-purple-300">
                  En traitement
                </Text>
              </View>
              <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4 min-w-[120px] mx-2">
                <Text className="text-2xl text-green-600">✅</Text>
                <Text className="text-xl font-bold text-green-800 dark:text-green-200">
                  {stats.approved}
                </Text>
                <Text className="text-sm text-green-700 dark:text-green-300">
                  Approuvés
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Barre de recherche */}
        {showSearch && <SearchBar />}

        {/* Filtres par statut */}
        {showFilters && <StatusFilters />}

        {/* Liste des documents */}
        {isLoading ? (
          <View className="items-center py-8">
            <Text className="text-gray-500">Chargement des documents...</Text>
          </View>
        ) : displayDocuments.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-6xl mb-4">📭</Text>
            <Text className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucun document'}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center">
              {searchQuery 
                ? 'Essayez avec d\'autres mots-clés' 
                : 'Vos documents envoyés apparaîtront ici'}
            </Text>
          </View>
        ) : (
          <View>
            {displayDocuments.map(document => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de détail */}
      <DocumentDetailModal />
    </ThemedView>
  );
};

export default DocumentTracker;