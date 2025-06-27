import React, { useState } from 'react';
import { ScrollView, View, Alert, Text, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { VStack, HStack } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import "../../global.css"

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { getFullName, user } = useAuthStore();
  
  // État pour les onglets du haut
  const [activeTab, setActiveTab] = useState<'actu' | 'carte'>('actu');
  
  // Navigation vers les différentes fonctionnalités
  const handleNavigation = (feature: string) => {
    switch (feature) {
      case 'documents':
        // ✅ Redirection vers la page d'envoi de documents
        router.push('/documents');
        break;
        
      case 'remboursements':
        Alert.alert(
          '💰 Suivi des remboursements',
          'Fonctionnalité en cours de développement.\nBientôt vous pourrez suivre vos remboursements en temps réel !',
          [{ text: 'OK' }]
        );
        // router.push('/remboursements');
        break;
        
      case 'professionnels':
        Alert.alert(
          '🩺 Trouver un professionnel',
          'Fonctionnalité en cours de développement.\nBientôt vous pourrez rechercher des professionnels de santé !',
          [{ text: 'OK' }]
        );
        // router.push('/professionnels');
        break;
        
      case 'estimation':
        Alert.alert(
          '🧮 Estimation des dépenses',
          'Fonctionnalité en cours de développement.\nBientôt vous pourrez estimer vos dépenses de santé !',
          [{ text: 'OK' }]
        );
        // router.push('/estimation');
        break;
        
      case 'autres':
        Alert.alert(
          '📋 Autres demandes',
          'Section dédiée aux demandes spéciales et services complémentaires.\nEn cours de développement.',
          [{ text: 'OK' }]
        );
        break;
        
      default:
        Alert.alert('Information', 'Fonctionnalité bientôt disponible !');
    }
  };

  // Contenu des onglets
  const renderTabContent = () => {
    if (activeTab === 'actu') {
      return (
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6 mt-4">
          <HStack spacing="sm" align="center">
            <Text className="text-2xl">📰</Text>
            <View className="flex-1">
              <ThemedText className="font-semibold text-blue-700 dark:text-blue-300">
                Actualités de votre assurance
              </ThemedText>
              <ThemedText type="caption" className="text-blue-600 dark:text-blue-400">
                Nouveautés, remboursements, conseils santé...
              </ThemedText>
            </View>
          </HStack>
          
          <View className="mt-3 bg-white dark:bg-gray-800 rounded-xl p-3">
            <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
              🔄 Aucune actualité récente
            </ThemedText>
          </View>
        </View>
      );
    } else {
      return (
        <View className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 mb-6 mt-4">
          <HStack spacing="sm" align="center">
            <Text className="text-2xl">💳</Text>
            <View className="flex-1">
              <ThemedText className="font-semibold text-emerald-700 dark:text-emerald-300">
                Ma carte d'assuré
              </ThemedText>
              <ThemedText type="caption" className="text-emerald-600 dark:text-emerald-400">
                Informations de votre police d'assurance
              </ThemedText>
            </View>
          </HStack>
          
          <View className="mt-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4">
            <VStack spacing="xs">
              <ThemedText style={{ color: '#ffffff' }} className="font-bold text-lg">
                {getFullName()}
              </ThemedText>
              <ThemedText style={{ color: '#d1fae5' }} type="caption">
                N° Police: {user?.policyNumber || 'POL-2024-001'}
              </ThemedText>
              <ThemedText style={{ color: '#d1fae5' }} type="caption">
                Valide jusqu'au 31/12/2025
              </ThemedText>
            </VStack>
          </View>
        </View>
      );
    }
  };

  return (
    <ThemedView className="flex-1">
      {/* Header fixe avec onglets */}
      <View className={`pt-16 pb-6 px-6 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Onglets */}
        <HStack justify="center" spacing="md" className="mb-6">
          <Pressable 
            onPress={() => setActiveTab('actu')}
            className={`flex-row items-center px-4 py-2 rounded-full ${
              activeTab === 'actu' 
                ? 'bg-gray-800 dark:bg-white' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <ThemedText 
              className={`font-semibold ${
                activeTab === 'actu' 
                  ? 'text-black dark:text-gray-800' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Mon actu
            </ThemedText>
            {activeTab === 'actu' && (
              <View className="ml-2 bg-white/20 dark:bg-gray-800/20 rounded-full w-6 h-6 items-center justify-center border border-white/30 dark:border-gray-600/30">
                <ThemedText 
                  type="caption" 
                  className="text-white dark:text-gray-800 font-bold"
                >
                  0
                </ThemedText>
              </View>
            )}
          </Pressable>

          <Pressable 
            onPress={() => setActiveTab('carte')}
            className={`flex-row items-center px-4 py-2 rounded-full ${
              activeTab === 'carte' 
                ? 'bg-red-500' 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <Text className="text-lg mr-2">💳</Text>
            <ThemedText 
              className={`font-semibold ${
                activeTab === 'carte' 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Ma carte
            </ThemedText>
          </Pressable>
        </HStack>

        {/* Titre principal */}
        <ThemedText 
          type="title" 
          className="mb-4"
        >
          Bonjour 👋
        </ThemedText>
        
        <ThemedText 
          type="subtitle" 
          className="text-gray-600 dark:text-gray-300"
        >
          Que souhaitez-vous faire ?
        </ThemedText>
      </View>

      {/* Contenu scrollable */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-6">
          {/* Contenu des onglets */}
          {renderTabContent()}

          {/* Grille des 4 fonctionnalités principales - Design amélioré */}
          <View className="flex-row flex-wrap justify-between">
            
            {/* Carte 1: Envoyer des documents - ACTIVE */}
            <Pressable 
              onPress={() => handleNavigation('documents')}
              className="w-[48%] mb-4"
              style={{ 
                shadowColor: '#dc2626',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8
              }}
            >
              <View className="bg-gradient-to-b from-red-500 to-red-600 rounded-3xl p-6 h-44 justify-center items-center relative overflow-hidden">
                {/* Effet de brillance */}
                <View className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-x-6 -translate-y-6" />
                
                <View className="bg-white/25 rounded-2xl p-4 mb-3 shadow-lg">
                  <Text className="text-4xl">📄</Text>
                </View>
                <ThemedText 
                  className="text-white font-bold text-center text-base leading-5"
                  style={{ color: '#ffffff' }}
                >
                  Envoyer{'\n'}mes factures{'\n'}et devis
                </ThemedText>
                
                {/* Badge "NOUVEAU" */}
                <View className="absolute top-2 right-2 bg-yellow-400 rounded-full px-2 py-1">
                  <ThemedText style={{ color: '#1f2937' }} type="caption" className="font-bold text-xs">
                    ACTIF
                  </ThemedText>
                </View>
              </View>
            </Pressable>

            {/* Carte 2: Suivre les remboursements */}
            <Pressable 
              onPress={() => handleNavigation('remboursements')}
              className="w-[48%] mb-4"
              style={{ 
                shadowColor: '#ec4899',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 6
              }}
            >
              <View className="bg-gradient-to-b from-pink-200 to-pink-300 rounded-3xl p-6 h-44 justify-center items-center relative overflow-hidden">
                <View className="absolute top-0 left-0 w-16 h-16 bg-red-500/10 rounded-full -translate-x-4 -translate-y-4" />
                
                <View className="bg-red-500/20 rounded-2xl p-4 mb-3">
                  <Text className="text-4xl">💰</Text>
                </View>
                <ThemedText 
                  className="text-gray-800 font-bold text-center text-base leading-5"
                  style={{ color: '#1f2937' }}
                >
                  Suivre mes{'\n'}remboursements
                </ThemedText>
                
                {/* Badge "BIENTÔT" */}
                <View className="absolute top-2 right-2 bg-gray-400 rounded-full px-2 py-1">
                  <ThemedText style={{ color: '#ffffff' }} type="caption" className="font-bold text-xs">
                    BIENTÔT
                  </ThemedText>
                </View>
              </View>
            </Pressable>

            {/* Carte 3: Trouver un professionnel */}
            <Pressable 
              onPress={() => handleNavigation('professionnels')}
              className="w-[48%] mb-4"
              style={{ 
                shadowColor: '#f472b6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 6
              }}
            >
              <View className="bg-gradient-to-b from-pink-100 to-pink-200 rounded-3xl p-6 h-44 justify-center items-center relative overflow-hidden">
                <View className="absolute bottom-0 right-0 w-12 h-12 bg-pink-500/10 rounded-full translate-x-2 translate-y-2" />
                
                <View className="bg-pink-500/20 rounded-2xl p-4 mb-3">
                  <Text className="text-4xl">🩺</Text>
                </View>
                <ThemedText 
                  className="text-gray-800 font-bold text-center text-base leading-5"
                  style={{ color: '#1f2937' }}
                >
                  Trouver un{'\n'}professionnel{'\n'}de santé
                </ThemedText>
              </View>
            </Pressable>

            {/* Carte 4: Estimer une dépense */}
            <Pressable 
              onPress={() => handleNavigation('estimation')}
              className="w-[48%] mb-4"
              style={{ 
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 6
              }}
            >
              <View className="bg-gradient-to-b from-emerald-200 to-emerald-300 rounded-3xl p-6 h-44 justify-center items-center relative overflow-hidden">
                <View className="absolute top-0 left-0 w-14 h-14 bg-emerald-500/10 rounded-full -translate-x-3 -translate-y-3" />
                
                <View className="bg-emerald-500/20 rounded-2xl p-4 mb-3">
                  <Text className="text-4xl">🧮</Text>
                </View>
                <ThemedText 
                  className="text-gray-800 font-bold text-center text-base leading-5"
                  style={{ color: '#1f2937' }}
                >
                  Estimer une{'\n'}dépense
                </ThemedText>
              </View>
            </Pressable>
          </View>

          {/* Section "Autres demandes" - Style amélioré */}
          <View className="mt-6">
            <Pressable 
              onPress={() => handleNavigation('autres')}
              className="border-b-2 border-gray-300 dark:border-gray-600 pb-3"
            >
              <ThemedText 
                type="subtitle" 
                className="text-center text-gray-600 dark:text-gray-400 underline font-semibold"
              >
                Autres demandes
              </ThemedText>
            </Pressable>
          </View>

          {/* Message de développement - Style amélioré */}
          <View className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
            <HStack spacing="sm" align="center">
              <Text className="text-2xl">🛠️</Text>
              <View className="flex-1">
                <ThemedText className="font-bold text-yellow-700 dark:text-yellow-300">
                  Mode développement
                </ThemedText>
                <ThemedText type="caption" className="text-yellow-600 dark:text-yellow-400">
                  Fonctionnalité "Envoi de documents" maintenant active !{'\n'}
                  Les autres arrivent bientôt...
                </ThemedText>
              </View>
            </HStack>
          </View>

          {/* Footer avec informations sur l'app */}
          <View className="mt-8 items-center">
            <ThemedText type="caption" className="text-center text-gray-500 dark:text-gray-400">
              Adjibola Tech - Assurance Santé
            </ThemedText>
            <ThemedText type="caption" className="text-center text-gray-400 dark:text-gray-500">
              Version 1.0.0 • Votre santé, notre priorité 💙
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}