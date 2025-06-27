import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { VStack, Spacer } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  
  // ✅ Correction : Utilisation simple du store sans sélecteur complexe
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const getFullName = useAuthStore(state => state.getFullName);
  
  // États du formulaire
  const [identifier, setIdentifier] = useState(''); // Numéro police ou téléphone
  const [password, setPassword] = useState('');
  const [identifierType, setIdentifierType] = useState<'policy' | 'phone'>('policy');

  // Détecter automatiquement le type d'identifiant
  const handleIdentifierChange = (text: string) => {
    setIdentifier(text);
    
    // Auto-détection : si ça commence par POL- c'est un numéro de police
    if (text.startsWith('POL-') || text.includes('POL')) {
      setIdentifierType('policy');
    } else if (text.match(/^[0-9+\s-()]+$/)) {
      setIdentifierType('phone');
    } else {
      setIdentifierType('policy'); // Par défaut
    }
  };

  // Connexion avec le store Zustand
  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const result = await login(identifier.trim(), password);
      
      if (result.success) {
        // Succès - redirection explicite
        Alert.alert(
          'Connexion réussie',
          `Bienvenue ${getFullName()} !`,
          [
            {
              text: 'Continuer',
              onPress: () => {
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        // Échec
        Alert.alert(
          'Erreur de connexion',
          result.error || 'Identifiants incorrects'
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Une erreur inattendue s\'est produite'
      );
    }
  };

  // Afficher les identifiants de test
  const showTestCredentials = () => {
    Alert.alert(
      '🧪 Identifiants de test',
      'Compte 1:\nNuméro: POL-2024-001\nMot de passe: test123\n\nCompte 2:\nTéléphone: 0987654321\nMot de passe: demo456\n\nCompte 3:\nTéléphone: +33612345678\nMot de passe: adjibola2024',
      [
        {
          text: 'Utiliser compte 1',
          onPress: () => {
            setIdentifier('POL-2024-001');
            setPassword('test123');
          }
        },
        { text: 'Fermer', style: 'cancel' }
      ]
    );
  };

  // Mot de passe oublié
  const handleForgotPassword = () => {
    Alert.alert(
      'Mot de passe oublié',
      'Contactez notre service client au +33 1 23 45 67 89 pour réinitialiser votre mot de passe.',
      [{ text: 'OK' }]
    );
  };

  // Première connexion - NOUVEAU
  const handleFirstConnection = () => {
    router.push('/firstLogin');
  };

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header avec logo/branding */}
          <View className={`pt-20 pb-12 px-6 ${isDark ? 'bg-slate-800' : 'bg-gradient-to-b from-primary-500 to-primary-600'}`}>
            <View className="items-center">
              {/* Logo placeholder */}
              <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">🏥</Text>
              </View>
              
              <ThemedText 
                type="title" 
                lightColor="#ffffff"
                darkColor="#f8fafc"
                className="mb-2 text-center"
              >
                Adjibola Tech
              </ThemedText>
              
              <ThemedText 
                type="subtitle" 
                lightColor="#bae6fd"
                darkColor="#cbd5e1"
                className="text-center"
              >
                Assurance Santé
              </ThemedText>
            </View>
          </View>

          {/* Formulaire de connexion */}
          <View className="flex-1 px-6 -mt-6">
            <View className="bg-white dark:bg-slate-800 rounded-card p-6 shadow-card">
              <ThemedText type="subtitle" className="mb-6 text-center">
                Connexion à votre espace
              </ThemedText>

              <VStack spacing="lg">
                {/* Champ identifiant */}
                <View>
                  <ThemedText className="font-semibold mb-2">
                    Numéro de police ou téléphone
                  </ThemedText>
                  <TextInput
                    value={identifier}
                    onChangeText={handleIdentifierChange}
                    placeholder="POL-2024-001 ou 0123456789"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                    className="border rounded-medical px-4 py-3 text-base"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <ThemedText type="caption" className="mt-1">
                    {identifierType === 'policy' 
                      ? '📋 Numéro de police détecté' 
                      : '📱 Numéro de téléphone détecté'
                    }
                  </ThemedText>
                </View>

                {/* Champ mot de passe */}
                <View>
                  <ThemedText className="font-semibold mb-2">
                    Mot de passe
                  </ThemedText>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Votre mot de passe"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                    className="border rounded-medical px-4 py-3 text-base"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Bouton de connexion */}
                <ThemedButton
                  title={isLoading ? "Connexion en cours..." : "Se connecter"}
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  onPress={handleLogin}
                />

                {/* Actions secondaires */}
                <View className="flex-row justify-between">
                  <ThemedButton
                    title="Mot de passe oublié ?"
                    variant="ghost"
                    size="sm"
                    onPress={handleForgotPassword}
                  />
                  
                  <ThemedButton
                    title="Première connexion ?"
                    variant="ghost"
                    size="sm"
                    onPress={handleFirstConnection}
                  />
                </View>
              </VStack>
            </View>

            <Spacer size="xl" />

            {/* Aide et informations */}
            <View className="bg-blue-50 dark:bg-blue-900/20 rounded-medical p-4 border border-blue-200 dark:border-blue-800">
              <ThemedText className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                💡 Première connexion ?
              </ThemedText>
              <ThemedText type="caption" className="text-blue-600 dark:text-blue-400 mb-3">
                Si c'est votre première fois, cliquez sur "Première connexion ?" pour définir votre mot de passe avec votre numéro d'assuré.
              </ThemedText>
              
              {__DEV__ && (
                <ThemedButton
                  title="🧪 Voir les identifiants de test"
                  variant="outline"
                  size="sm"
                  onPress={showTestCredentials}
                />
              )}
            </View>

            <Spacer size="lg" />

            {/* Support */}
            <View className="items-center">
              <ThemedText type="caption" className="text-center mb-2">
                Besoin d'aide ?
              </ThemedText>
              <ThemedButton
                title="📞 Contacter le support"
                variant="ghost"
                size="sm"
                onPress={() => Alert.alert(
                  'Support Client',
                  'Appelez-nous au +33 1 23 45 67 89\nDisponible 24h/24, 7j/7',
                  [{ text: 'OK' }]
                )}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}