import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StatusBar,
  Image,
  Dimensions 
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView, ThemedButton } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';

const { width: screenWidth } = Dimensions.get('window');

// Mapping statique pour l'image de bienvenue
const welcomeImage = () => {
  try {
    return require('../assets/images/welcome-phone.png');
  } catch {
    return null;
  }
};

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const [useImage, setUseImage] = useState(true);

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/firstLogin');
  };

  // Composant d'illustration avec fallback
  const WelcomeIllustration = () => {
    const imageSource = welcomeImage();

    if (imageSource && useImage) {
      return (
        <Image
          source={imageSource}
          style={{
            width: 300,
            height: 300,
            resizeMode: 'contain',
          }}
          onError={() => setUseImage(false)}
        />
      );
    }

    // Fallback avec illustration CSS
    return (
      <View className="items-center">
        {/* Téléphone mockup */}
        <View className="w-32 h-56 bg-white dark:bg-gray-200 rounded-3xl border-4 border-gray-300 items-center justify-center relative shadow-lg">
          {/* Écran du téléphone */}
          <View className="w-28 h-52 bg-gray-100 dark:bg-gray-300 rounded-2xl items-center justify-center">
            {/* Contenu de l'écran */}
            <View className="w-16 h-16 bg-gray-300 dark:bg-gray-400 rounded-xl mb-4 items-center justify-center">
              <View className="w-8 h-8 bg-orange-500 rounded-full" />
            </View>
            <View className="space-y-2">
              <View className="w-20 h-2 bg-orange-400 rounded-full" />
              <View className="w-16 h-2 bg-orange-400 rounded-full" />
            </View>
            <View className="w-16 h-6 bg-orange-500 rounded-lg mt-4" />
          </View>
          
          {/* Encoche du téléphone */}
          <View className="absolute top-1 w-8 h-1 bg-gray-800 rounded-full" />
        </View>
        
        {/* Personnage à côté */}
        <View className="absolute right-0 bottom-8">
          <Text className="text-6xl">👨‍💼</Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedView className="flex-1">
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor="transparent"
        translucent 
      />
      
      {/* Contenu principal */}
      <View 
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}
      >
        {/* Titre principal */}
        <View className="items-center mb-8">
          <Text 
            className="text-4xl font-bold text-center mb-2"
            style={{ color: colors.text }}
          >
            Bienvenue sur
          </Text>
          <Text 
            className="text-4xl font-bold text-center"
            style={{ color: '#7c3aed' }}
          >
            Masanté
          </Text>
        </View>

        {/* Illustration centrale */}
        <View className="w-80 h-80 rounded-3xl bg-white/10 dark:bg-black/10 backdrop-blur-sm items-center justify-center mb-12">
          <WelcomeIllustration />
        </View>

        {/* Boutons d'action */}
        <View className="w-full space-y-4">
          <ThemedButton
            title="S'inscrire"
            variant="primary"
            size="lg"
            onPress={handleSignUp}
            className="w-full"
            style={{
              backgroundColor: '#7c3aed',
              borderRadius: 25,
              paddingVertical: 16,
            }}
          />
          
          <ThemedButton
            title="Se connecter"
            variant="outline"
            size="lg"
            onPress={handleSignIn}
            className="w-full"
            style={{
              borderColor: '#7c3aed',
              borderWidth: 2,
              borderRadius: 25,
              paddingVertical: 16,
              backgroundColor: 'transparent',
            }}
          />
        </View>

        {/* Footer */}
        <View className="absolute bottom-8 items-center">
          <Text 
            className="text-sm text-center"
            style={{ color: colors.textMuted }}
          >
            Adjibola Tech - Assurance Santé
          </Text>
        </View>
      </View>
    </ThemedView>
  );
}