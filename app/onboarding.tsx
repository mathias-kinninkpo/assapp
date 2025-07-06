import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  Pressable,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ThemedView, ThemedButton } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  backgroundColor: string;
  darkBackgroundColor: string;
}

const onboardingData: OnboardingSlide[] = [
  {
    id: 1,
    title: "Bienvenue sur",
    subtitle: "Masanté",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus lacinia libero ut metus convallis tempor. Vestibulum consequat, mattis consequat",
    backgroundColor: "#f8fafc",
    darkBackgroundColor: "#1e293b"
  },
  {
    id: 2,
    title: "Couverture santé",
    subtitle: "simplifiée",
    description: "Des soins accessibles en quelques clics. Consultez, déclarez et suivez vos remboursements sans stress.",
    backgroundColor: "#f0f9ff",
    darkBackgroundColor: "#0c4a6e"
  },
  {
    id: 3,
    title: "Sécurité &",
    subtitle: "confidentialité",
    description: "Vos données sont entre de bonnes mains. Sécurisation des informations médicales selon les normes les plus strictes.",
    backgroundColor: "#fefce8",
    darkBackgroundColor: "#365314"
  }
];

// Mapping statique des images (optionnel)
const imageAssets = {
  'onboarding-1': require('../assets/images/onboarding-1.png'),
  'onboarding-2': require('../assets/images/onboarding-2.png'),
  'onboarding-3': require('../assets/images/onboarding-3.png'),
};

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setOnboardingCompleted } = useAuthStore();

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentSlide(slideIndex);
  };

  const goToSlide = (slideIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: slideIndex * screenWidth,
      animated: true,
    });
    setCurrentSlide(slideIndex);
  };

  // Navigation manuelle avec bouton suivant
  const handleNext = () => {
    if (currentSlide < onboardingData.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      // Dernière page → aller vers welcome
      setOnboardingCompleted(true);
      router.replace('/welcome');
    }
  };

  // Bouton passer (optionnel)
  const handleSkip = () => {
    setOnboardingCompleted(true);
    router.replace('/welcome');
  };

  // Composant d'illustration avec fallback emoji
  const IllustrationComponent = ({ slide, index }: { slide: OnboardingSlide; index: number }) => {
    const [useImage, setUseImage] = useState(true);

    // Essayer de charger l'image statiquement
    const getImageSource = () => {
      try {
        switch (index) {
          case 0:
            return imageAssets['onboarding-1'];
          case 1:
            return imageAssets['onboarding-2'];
          case 2:
            return imageAssets['onboarding-3'];
          default:
            return null;
        }
      } catch {
        return null;
      }
    };

    const imageSource = getImageSource();

    if (imageSource && useImage) {
      return (
        <Image
          source={imageSource}
          style={{
            width: 280,
            height: 280,
            resizeMode: 'contain',
          }}
          onError={() => setUseImage(false)}
        />
      );
    }

    // Fallback avec les illustrations emoji/CSS
    return (
      <View className="items-center">
        {index === 0 && (
          <View className="items-center">
            <View className="flex-row mb-8">
              <Text className="text-8xl mr-4">🏥</Text>
              <View className="items-center justify-center">
                <Text className="text-4xl mb-2">👨‍⚕️</Text>
                <Text className="text-4xl">👩‍⚕️</Text>
              </View>
            </View>
            <View className="w-16 h-16 bg-orange-500 rounded-full items-center justify-center">
              <Text className="text-3xl">❤️</Text>
            </View>
          </View>
        )}
        
        {index === 1 && (
          <View className="items-center">
            <View className="flex-row mb-8 items-end">
              <View className="w-20 h-24 bg-yellow-200 rounded-lg mr-4 items-center justify-center">
                <Text className="text-lg">📋</Text>
              </View>
              <View className="w-16 h-32 bg-orange-200 rounded-lg mr-4 items-center justify-center">
                <Text className="text-lg">📋</Text>
              </View>
              <View className="w-12 h-20 bg-pink-200 rounded-lg items-center justify-center">
                <Text className="text-lg">📋</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-5xl mr-4">👨‍💼</Text>
              <Text className="text-5xl">♿</Text>
            </View>
          </View>
        )}
        
        {index === 2 && (
          <View className="items-center">
            <View className="w-32 h-48 bg-orange-500 rounded-3xl items-center justify-center mb-8 relative">
              <Text className="text-4xl mb-4">📱</Text>
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center absolute bottom-4">
                <Text className="text-lg">✅</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">🔒</Text>
              <View className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-1">
                <Text className="text-xs">━━━</Text>
              </View>
            </View>
          </View>
        )}
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
      
      {/* Header avec bouton Skip - optionnel */}
      <View className="absolute top-16 right-6 z-10">
        <Pressable
          onPress={handleSkip}
          className="bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm rounded-full px-4 py-2"
        >
          <Text className="text-gray-600 dark:text-gray-300 font-semibold">
            Passer
          </Text>
        </Pressable>
      </View>

      {/* Contenu principal avec ScrollView horizontal */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
        scrollEnabled={false} // Désactiver le scroll manuel - navigation uniquement par boutons
      >
        {onboardingData.map((slide, index) => (
          <View
            key={slide.id}
            style={{ 
              width: screenWidth,
              backgroundColor: isDark ? slide.darkBackgroundColor : slide.backgroundColor
            }}
            className="flex-1 justify-between items-center px-8 py-20"
          >
            {/* Illustration en haut */}
            <View className="flex-1 justify-center items-center">
              <View className="w-80 h-80 rounded-3xl bg-white/10 dark:bg-black/10 backdrop-blur-sm items-center justify-center">
                <IllustrationComponent slide={slide} index={index} />
              </View>
            </View>

            {/* Contenu textuel en bas */}
            <View className="w-full items-center">
              {/* Indicateurs de progression */}
              <View className="flex-row mb-8">
                {onboardingData.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    className={`w-3 h-3 rounded-full mx-1 ${
                      dotIndex === currentSlide
                        ? 'bg-purple-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </View>

              {/* Titre */}
              <View className="items-center mb-6">
                <Text 
                  className="text-4xl font-bold text-center mb-2"
                  style={{ color: colors.text }}
                >
                  {slide.title}
                </Text>
                <Text 
                  className="text-4xl font-bold text-center"
                  style={{ color: '#7c3aed' }}
                >
                  {slide.subtitle}
                </Text>
              </View>

              {/* Description */}
              <Text 
                className="text-center text-lg leading-6 mb-8 px-4"
                style={{ color: colors.textSecondary }}
              >
                {slide.description}
              </Text>

              {/* Bouton suivant avec flèche Lucide */}
              <View className="w-full px-4">
                <Pressable
                  onPress={handleNext}
                  className="w-16 h-16 rounded-full items-center justify-center self-center"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <ChevronRight 
                    size={28} 
                    color="#ffffff" 
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}