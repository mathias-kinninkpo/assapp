import React, { useState } from 'react';
import { ScrollView, View, Text, Switch, Alert, Pressable } from 'react-native';
import { ThemedView, ThemedText, ThemedButton, HealthCard } from '@/components/ui/ThemedComponents';
import { VStack, HStack, Spacer } from '@/components/ui/Spacing';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { colors, isDark, colorScheme } = useTheme();
  const { logout, getFullName, user } = useAuthStore();
  
  // États locaux pour les paramètres (sera remplacé par Zustand plus tard)
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    Alert.alert(
      'Thème modifié',
      `Thème "${theme}" sélectionné. Cette fonctionnalité sera bientôt active !`,
      [{ text: 'OK' }]
    );
  };

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    Alert.alert(
      'Notifications',
      `Notifications ${!notificationsEnabled ? 'activées' : 'désactivées'}`,
      [{ text: 'OK' }]
    );
  };

  const handleBiometricToggle = () => {
    setBiometricEnabled(!biometricEnabled);
    Alert.alert(
      'Authentification biométrique',
      `Biométrie ${!biometricEnabled ? 'activée' : 'désactivée'}`,
      [{ text: 'OK' }]
    );
  };

  const handleLanguageChange = () => {
    const newLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
    Alert.alert(
      'Langue modifiée',
      `Langue changée vers ${newLang === 'fr' ? 'Français' : 'English'}`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
           
            Alert.alert('Déconnexion', 'Vous avez été déconnecté avec succès');
          }
        },
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support Client',
      'Contactez notre équipe :\n\n📞 +33 1 23 45 67 89\n📧 support@adjibola-health.com\n\nDisponible 24h/24, 7j/7',
      [{ text: 'OK' }]
    );
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className={`pt-16 pb-6 px-6 ${isDark ? 'bg-slate-800' : 'bg-primary-500'}`}>
          <ThemedText 
            type="title" 
            lightColor="#ffffff"
            darkColor="#f8fafc"
            className="mb-2"
          >
            Paramètres
          </ThemedText>
          <ThemedText 
            type="caption" 
            lightColor="#bae6fd"
            darkColor="#cbd5e1"
          >
            Personnalisez votre expérience
          </ThemedText>
        </View>

        <View className="px-6 -mt-2">
          {/* Informations utilisateur connecté */}
          <HealthCard
            title="Utilisateur connecté"
            subtitle="Informations de votre compte"
            icon={<Text className="text-2xl">👤</Text>}
          >
            <VStack spacing="sm">
              <InfoRow label="Nom" value={getFullName()} />
              <InfoRow label="Email" value={user?.email || 'Non renseigné'} />
              <InfoRow label="Téléphone" value={user?.phone || 'Non renseigné'} />
              <InfoRow label="Police N°" value={user?.policyNumber || 'Non renseigné'} />
            </VStack>
          </HealthCard>

          {/* Apparence */}
          <HealthCard
            title="Apparence"
            subtitle="Personnalisez l'affichage de l'application"
            icon={<Text className="text-2xl">🎨</Text>}
          >
            <VStack spacing="md">
              <View>
                <ThemedText className="font-semibold mb-3">Thème</ThemedText>
                <VStack spacing="sm">
                  <ThemeOption
                    title="Clair"
                    description="Thème clair en permanence"
                    icon="☀️"
                    selected={selectedTheme === 'light'}
                    onPress={() => handleThemeChange('light')}
                  />
                  <ThemeOption
                    title="Sombre"
                    description="Thème sombre en permanence"
                    icon="🌙"
                    selected={selectedTheme === 'dark'}
                    onPress={() => handleThemeChange('dark')}
                  />
                  <ThemeOption
                    title="Automatique"
                    description="Suit les paramètres du système"
                    icon="🔄"
                    selected={selectedTheme === 'system'}
                    onPress={() => handleThemeChange('system')}
                  />
                </VStack>
              </View>
              
              <View className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <HStack justify="between" align="center">
                  <View className="flex-1">
                    <ThemedText className="font-semibold">Langue</ThemedText>
                    <ThemedText type="caption">
                      {language === 'fr' ? 'Français' : 'English'}
                    </ThemedText>
                  </View>
                  <ThemedButton
                    title={language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                    variant="outline"
                    size="sm"
                    onPress={handleLanguageChange}
                  />
                </HStack>
              </View>
            </VStack>
          </HealthCard>

          {/* Notifications */}
          <HealthCard
            title="Notifications"
            subtitle="Gérez vos alertes et rappels"
            icon={<Text className="text-2xl">🔔</Text>}
          >
            <VStack spacing="md">
              <SettingToggle
                title="Notifications push"
                description="Recevez des alertes importantes"
                enabled={notificationsEnabled}
                onToggle={handleNotificationToggle}
              />
              
              <View className="opacity-50">
                <SettingToggle
                  title="Rappels de médicaments"
                  description="Bientôt disponible"
                  enabled={false}
                  onToggle={() => {}}
                  disabled
                />
              </View>
              
              <View className="opacity-50">
                <SettingToggle
                  title="Rappels de rendez-vous"
                  description="Bientôt disponible"
                  enabled={false}
                  onToggle={() => {}}
                  disabled
                />
              </View>
            </VStack>
          </HealthCard>

          {/* Sécurité */}
          <HealthCard
            title="Sécurité"
            subtitle="Protégez votre compte et vos données"
            icon={<Text className="text-2xl">🔒</Text>}
          >
            <VStack spacing="md">
              <SettingToggle
                title="Authentification biométrique"
                description="Utilisez votre empreinte ou Face ID"
                enabled={biometricEnabled}
                onToggle={handleBiometricToggle}
              />
              
              <ThemedButton
                title="Changer le mot de passe"
                variant="outline"
                onPress={() => Alert.alert('Changement de mot de passe', 'Fonctionnalité en cours de développement')}
              />
            </VStack>
          </HealthCard>

          {/* Support */}
          <HealthCard
            title="Support & Aide"
            subtitle="Besoin d'assistance ?"
            icon={<Text className="text-2xl">💬</Text>}
          >
            <VStack spacing="sm">
              <ThemedButton
                title="Contacter le support"
                variant="outline"
                leftIcon={<Text className="text-lg">📞</Text>}
                onPress={handleSupport}
              />
              
              <ThemedButton
                title="FAQ"
                variant="ghost"
                onPress={() => Alert.alert('FAQ', 'Section FAQ en cours de développement')}
              />
              
              <ThemedButton
                title="Conditions d'utilisation"
                variant="ghost"
                onPress={() => Alert.alert('CGU', 'Conditions d\'utilisation en cours de rédaction')}
              />
            </VStack>
          </HealthCard>

          {/* Informations de l'app */}
          <HealthCard
            title="À propos"
            icon={<Text className="text-2xl">ℹ️</Text>}
          >
            <VStack spacing="sm">
              <InfoRow label="Version" value="1.0.0" />
              <InfoRow label="Build" value="2024.01.001" />
              <InfoRow label="Développeur" value="Adjibola Tech" />
              <InfoRow label="Support" value="24h/24, 7j/7" />
            </VStack>
            
            <Spacer size="md" />
            
            <ThemedText type="caption" className="text-center">
              © 2024 Adjibola Tech. Tous droits réservés.
            </ThemedText>
          </HealthCard>

          {/* Déconnexion */}
          <HealthCard className="border border-red-200 dark:border-red-800">
            <ThemedButton
              title="Se déconnecter"
              variant="emergency"
              onPress={handleLogout}
            />
          </HealthCard>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// Composant pour les options de thème
interface ThemeOptionProps {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}

function ThemeOption({ title, description, icon, selected, onPress }: ThemeOptionProps) {
  const { colors } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      className={`p-3 rounded-lg border-2 ${
        selected 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <HStack spacing="sm" align="center">
        <Text className="text-lg">{icon}</Text>
        <View className="flex-1">
          <ThemedText className="font-semibold">{title}</ThemedText>
          <ThemedText type="caption">{description}</ThemedText>
        </View>
        {selected && <Text className="text-primary-500 text-lg">✓</Text>}
      </HStack>
    </Pressable>
  );
}

// Composant pour les toggles de paramètres
interface SettingToggleProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function SettingToggle({ title, description, enabled, onToggle, disabled }: SettingToggleProps) {
  return (
    <HStack justify="between" align="center">
      <View className="flex-1 mr-4">
        <ThemedText className={`font-semibold ${disabled ? 'opacity-50' : ''}`}>
          {title}
        </ThemedText>
        <ThemedText type="caption" className={disabled ? 'opacity-50' : ''}>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
        thumbColor={enabled ? '#ffffff' : '#f3f4f6'}
      />
    </HStack>
  );
}

// Composant pour afficher des informations
interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <HStack justify="between" align="center">
      <ThemedText type="caption">{label}</ThemedText>
      <ThemedText className="font-semibold">{value}</ThemedText>
    </HStack>
  );
}