/**
 * DocumentsTrackingScreen - Écran de suivi des documents
 * Utilise le composant DocumentTracker avec navigation et intégration complète
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  Alert,
  BackHandler,
  Share,
  Dimensions
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';
import DocumentTracker from '@/components/DocumentTracker';
import { useDocumentStore, useDocuments } from '@/stores/documentStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/appStore';
import type { Document } from '@/services/documentService';

const { width: screenWidth } = Dimensions.get('window');

export default function DocumentsTrackingScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { documents, isLoading, stats } = useDocuments();
  const fetchDocuments = useDocumentStore(state => state.fetchDocuments);
  const markDocumentAsViewed = useDocumentStore(state => state.markDocumentAsViewed);
  const addNotification = useNotificationStore(state => state.addNotification);
  
  // Paramètres de navigation (si on arrive depuis l'envoi)
  const params = useLocalSearchParams();
  const newDocumentId = params.newDocumentId as string;
  const fromUpload = params.fromUpload === 'true';
  
  // États locaux
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  // Charger les documents au montage et focus
  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
    }
  }, [user]);

  // Actualiser quand l'écran prend le focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchDocuments(user.id, true);
      }
    }, [user])
  );

  // Gérer l'arrivée depuis l'upload
  useEffect(() => {
    if (fromUpload && newDocumentId) {
      setShowWelcomeMessage(true);
      
      // Chercher le nouveau document et le marquer comme vu
      const newDoc = documents.find(doc => doc.id === newDocumentId);
      if (newDoc) {
        setSelectedDocument(newDoc);
        markDocumentAsViewed(newDocumentId);
        
        // Notification de bienvenue
        setTimeout(() => {
          addNotification({
            type: 'success',
            title: '🎉 Document reçu !',
            message: `Votre ${newDoc.name} est maintenant en cours de traitement.`,
            duration: 5000
          });
        }, 1000);
      }
      
      // Masquer le message après 3 secondes
      setTimeout(() => setShowWelcomeMessage(false), 3000);
    }
  }, [fromUpload, newDocumentId, documents]);

  // Gestion du refresh
  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await fetchDocuments(user.id, true);
      
      addNotification({
        type: 'info',
        title: '🔄 Actualisé',
        message: 'Liste des documents mise à jour',
        duration: 2000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '❌ Erreur',
        message: 'Impossible d\'actualiser les documents'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Gestion du clic sur un document
  const handleDocumentPress = (document: Document) => {
    setSelectedDocument(document);
    markDocumentAsViewed(document.id);
    
    // Optionnel: Navigation vers une page de détail dédiée
    // router.push(`/documents/detail/${document.id}`);
  };

  // Partager un document
  const handleShareDocument = async (document: Document) => {
    try {
      await Share.share({
        message: `📋 Suivi de document\n\n` +
                `Type: ${document.name}\n` +
                `Numéro: ${document.trackingNumber}\n` +
                `Statut: ${getStatusLabel(document.status)}\n` +
                `Date: ${new Date(document.submittedAt).toLocaleDateString('fr-FR')}\n\n` +
                `Suivez vos documents avec Adjibola Health`
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Helper pour les libellés de statut
  const getStatusLabel = (status: Document['status']) => {
    const labels = {
      uploading: 'Envoi en cours',
      pending: 'En attente',
      processing: 'En traitement', 
      approved: 'Approuvé',
      rejected: 'Rejeté',
      completed: 'Terminé'
    };
    return labels[status] || status;
  };

  // Créer un nouveau document
  const handleCreateNewDocument = () => {
    router.push('/documents/create');
  };

  // Navigation de retour intelligente
  const handleGoBack = () => {
    if (fromUpload) {
      // Retour à l'accueil si on vient d'un upload
      router.replace('/(tabs)/');
    } else {
      // Retour normal
      router.back();
    }
  };

  // Gestion du bouton retour système Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (fromUpload) {
          router.replace('/(tabs)/');
          return true; // Empêche le comportement par défaut
        }
        return false; // Comportement par défaut
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription?.remove();
    }, [fromUpload])
  );

  return (
    <ThemedView className="flex-1">
      {/* Header personnalisé */}
      <View className={`pt-16 pb-4 px-6 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b border-gray-200 dark:border-gray-700`}>
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={handleGoBack}>
            <Text className="text-2xl">
              {fromUpload ? '🏠' : '←'}
            </Text>
          </Pressable>
          
          <View className="flex-1 items-center">
            <ThemedText type="subtitle">
              {fromUpload ? 'Document envoyé !' : 'Mes documents'}
            </ThemedText>
            {stats.total > 0 && (
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {stats.total} document{stats.total > 1 ? 's' : ''} • {stats.pending + stats.processing} en cours
              </Text>
            )}
          </View>
          
          <Pressable onPress={handleCreateNewDocument}>
            <Text className="text-2xl">➕</Text>
          </Pressable>
        </View>

        {/* Message de bienvenue après upload */}
        {showWelcomeMessage && selectedDocument && (
          <View className="bg-green-100 dark:bg-green-900/30 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">🎉</Text>
              <View className="flex-1">
                <Text className="font-bold text-green-800 dark:text-green-200">
                  Document reçu avec succès !
                </Text>
                <Text className="text-green-700 dark:text-green-300 text-sm">
                  Votre {selectedDocument.name} est maintenant en cours de traitement
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions rapides si on vient d'un upload */}
        {fromUpload && (
          <View className="flex-row">
            <ThemedButton
              title="🏠 Retour accueil"
              variant="outline"
              onPress={() => router.replace('/(tabs)/')}
              className="flex-1 mx-3"
            />
            <ThemedButton
              title="➕ Envoyer un autre"
              variant="primary"
              onPress={() => router.push('/documents/create')}
              className="flex-1"
            />
          </View>
        )}
      </View>

      {/* Contenu principal avec DocumentTracker */}
      <View className="flex-1">
        {!user ? (
          // État non connecté
          <View className="flex-1 justify-center items-center p-6">
            <Text className="text-6xl mb-4">🔒</Text>
            <ThemedText type="title" className="text-center mb-2">
              Connexion requise
            </ThemedText>
            <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Connectez-vous pour voir vos documents
            </ThemedText>
            <ThemedButton
              title="Se connecter"
              variant="primary"
              onPress={() => router.push('/auth/login')}
            />
          </View>
        ) : documents.length === 0 && !isLoading ? (
          // État vide - premier document
          <View className="flex-1 justify-center items-center p-6">
            <Text className="text-6xl mb-4">📋</Text>
            <ThemedText type="title" className="text-center mb-2">
              Aucun document envoyé
            </ThemedText>
            <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Envoyez votre premier document pour commencer le suivi
            </ThemedText>
            <ThemedButton
              title="📤 Envoyer un document"
              variant="primary"
              onPress={handleCreateNewDocument}
              className="mb-4"
            />
            <Pressable onPress={() => router.push('/help/documents')}>
              <Text className="text-blue-500 text-sm">
                Comment ça marche ? 📖
              </Text>
            </Pressable>
          </View>
        ) : (
          // DocumentTracker principal
          <DocumentTracker
            mode="full"
            showSearch={true}
            showFilters={true}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onDocumentPress={handleDocumentPress}
          />
        )}
      </View>

      {/* Actions flottantes en bas */}
      {user && documents.length > 0 && (
        <View className="absolute bottom-6 right-6">
          <Pressable
            onPress={handleCreateNewDocument}
            className="bg-blue-500 w-14 h-14 rounded-full justify-center items-center shadow-lg"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Text className="text-white text-2xl">➕</Text>
          </Pressable>
        </View>
      )}

      {/* Bouton de partage si un document est sélectionné */}
      {selectedDocument && !fromUpload && (
        <View className="absolute bottom-6 left-6">
          <Pressable
            onPress={() => handleShareDocument(selectedDocument)}
            className="bg-gray-600 w-12 h-12 rounded-full justify-center items-center shadow-lg"
          >
            <Text className="text-white text-lg">📤</Text>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}