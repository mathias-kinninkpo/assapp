import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { VStack, Spacer } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';

export default function FirstConnectionScreen() {
  const { colors, isDark } = useTheme();
  
  const firstConnection = useAuthStore(state => state.firstConnection);
  const isLoading = useAuthStore(state => state.isLoading);
  
  // États du formulaire
  const [identifier, setIdentifier] = useState(''); // Numéro assuré, téléphone ou email
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [identifierType, setIdentifierType] = useState<'policy' | 'phone' | 'email'>('policy');

  // Détecter automatiquement le type d'identifiant
  const handleIdentifierChange = (text: string) => {
    setIdentifier(text);
    
    if (text.includes('@')) {
      setIdentifierType('email');
    } else if (text.startsWith('POL-') || text.includes('POL')) {
      setIdentifierType('policy');
    } else if (text.match(/^[0-9+\s-()]+$/)) {
      setIdentifierType('phone');
    } else {
      setIdentifierType('policy'); // Par défaut
    }
  };

  // Validation du mot de passe
  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    return {
      isValid: minLength && hasNumber && hasLetter,
      errors: {
        minLength,
        hasNumber,
        hasLetter
      }
    };
  };

  // Gestion de la première connexion
  const handleFirstConnection = async () => {
    if (!identifier.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert(
        'Mot de passe invalide',
        'Le mot de passe doit contenir au moins 6 caractères, une lettre et un chiffre'
      );
      return;
    }

    try {
      const result = await firstConnection(identifier.trim(), password);
      
      if (result.success) {
        Alert.alert(
          'Compte créé avec succès !',
          'Votre mot de passe a été défini. Vous pouvez maintenant vous connecter.',
          [
            {
              text: 'Se connecter',
              onPress: () => {
                router.replace('/login');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Erreur',
          result.error || 'Impossible de créer le compte'
        );
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        'Une erreur inattendue s\'est produite'
      );
    }
  };

  const getIdentifierIcon = () => {
    switch (identifierType) {
      case 'email': return '📧';
      case 'phone': return '📱';
      default: return '📋';
    }
  };

  const getIdentifierLabel = () => {
    switch (identifierType) {
      case 'email': return 'Email détecté';
      case 'phone': return 'Numéro de téléphone détecté';
      default: return 'Numéro de police détecté';
    }
  };

  const passwordValidation = validatePassword(password);

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
          {/* Header */}
          <View className={`pt-20 pb-12 px-6 ${isDark ? 'bg-slate-800' : 'bg-gradient-to-b from-primary-500 to-primary-600'}`}>
            <View className="items-center">
              <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">🆕</Text>
              </View>
              
              <ThemedText 
                type="title" 
                lightColor="#ffffff"
                darkColor="#f8fafc"
                className="mb-2 text-center"
              >
                Première connexion
              </ThemedText>
              
              <ThemedText 
                type="subtitle" 
                lightColor="#bae6fd"
                darkColor="#cbd5e1"
                className="text-center"
              >
                Définissez votre mot de passe
              </ThemedText>
            </View>
          </View>

          {/* Formulaire */}
          <View className="flex-1 px-6 -mt-6">
            <View className="bg-white dark:bg-slate-800 rounded-card p-6 shadow-card">
              <ThemedText type="subtitle" className="mb-6 text-center">
                Créer votre compte
              </ThemedText>

              <VStack spacing="lg">
                {/* Champ identifiant */}
                <View>
                  <ThemedText className="font-semibold mb-2">
                    Numéro d'assuré
                  </ThemedText>
                  <TextInput
                    value={identifier}
                    onChangeText={handleIdentifierChange}
                    placeholder="POL-2024-001"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                    className="border rounded-medical px-4 py-3 text-base"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={identifierType === 'email' ? 'email-address' : 'default'}
                  />
                  <ThemedText type="caption" className="mt-1">
                    {getIdentifierIcon()} {getIdentifierLabel()}
                  </ThemedText>
                </View>

                {/* Champ nouveau mot de passe */}
                <View>
                  <ThemedText className="font-semibold mb-2">
                    Nouveau mot de passe
                  </ThemedText>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Créez votre mot de passe"
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
                  
                  {/* Indicateurs de validation du mot de passe */}
                  {password.length > 0 && (
                    <View className="mt-2">
                      <ThemedText type="caption" className={`${passwordValidation.errors.minLength ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.errors.minLength ? '✅' : '❌'} Au moins 6 caractères
                      </ThemedText>
                      <ThemedText type="caption" className={`${passwordValidation.errors.hasLetter ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.errors.hasLetter ? '✅' : '❌'} Au moins une lettre
                      </ThemedText>
                      <ThemedText type="caption" className={`${passwordValidation.errors.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.errors.hasNumber ? '✅' : '❌'} Au moins un chiffre
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Champ confirmation mot de passe */}
                <View>
                  <ThemedText className="font-semibold mb-2">
                    Confirmer le mot de passe
                  </ThemedText>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirmez votre mot de passe"
                    placeholderTextColor={colors.placeholder}
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: confirmPassword && password !== confirmPassword ? colors.error : colors.border,
                    }}
                    className="border rounded-medical px-4 py-3 text-base"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  
                  {confirmPassword && password !== confirmPassword && (
                    <ThemedText type="caption" className="text-red-600 mt-1">
                      ❌ Les mots de passe ne correspondent pas
                    </ThemedText>
                  )}
                  
                  {confirmPassword && password === confirmPassword && password && (
                    <ThemedText type="caption" className="text-green-600 mt-1">
                      ✅ Les mots de passe correspondent
                    </ThemedText>
                  )}
                </View>

                {/* Bouton de création */}
                <ThemedButton
                  title={isLoading ? "Création en cours..." : "Créer mon compte"}
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  onPress={handleFirstConnection}
                />

                {/* Retour à la connexion */}
                <ThemedButton
                  title="← Retour à la connexion"
                  variant="ghost"
                  onPress={() => router.back()}
                />
              </VStack>
            </View>

            <Spacer size="xl" />

            {/* Informations importantes */}
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-medical p-4 border border-amber-200 dark:border-amber-800">
              <ThemedText className="font-semibold text-amber-700 dark:text-amber-300 mb-2">
                ⚠️ Important
              </ThemedText>
              <ThemedText type="caption" className="text-amber-600 dark:text-amber-400 mb-2">
                • Utilisez les informations exactes de votre dossier d'assurance
              </ThemedText>
              <ThemedText type="caption" className="text-amber-600 dark:text-amber-400 mb-2">
                • Votre mot de passe doit être sécurisé et facile à retenir
              </ThemedText>
              <ThemedText type="caption" className="text-amber-600 dark:text-amber-400">
                • En cas de problème, contactez notre support au +33 1 23 45 67 89
              </ThemedText>
            </View>

            <Spacer size="lg" />

            {/* Support */}
            <View className="items-center">
              <ThemedText type="caption" className="text-center mb-2">
                Besoin d'aide pour votre première connexion ?
              </ThemedText>
              <ThemedButton
                title="📞 Contacter le support"
                variant="ghost"
                size="sm"
                onPress={() => Alert.alert(
                  'Support Client',
                  'Notre équipe peut vous aider à configurer votre compte.\n\nAppelez-nous au +33 1 23 45 67 89\nDisponible 24h/24, 7j/7',
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