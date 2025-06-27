import React, { useState, useEffect, useRef } from 'react';
import { 
  ScrollView, 
  View, 
  Alert, 
  Text, 
  Pressable, 
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import Pdf from 'react-native-pdf';
import { ThemedView, ThemedText, ThemedButton } from '@/components/ui/ThemedComponents';
import { useTheme } from '@/hooks/useTheme';

// =================== INTÉGRATION MODULAIRE ===================
// Import des stores et services (nouveau)
import { useDocumentStore, useDocumentUpload } from '@/stores/documentStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/appStore';
import type { Document } from '@/services/documentService';

// Hook personnalisé pour l'intégration API (modulaire)
const useDocumentAPI = () => {
  const { user } = useAuthStore();
  const { uploadDocument, hasActiveUploads } = useDocumentUpload();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const sendDocumentToAPI = async (
    documentType: string,
    fileUri: string,
    fileName: string,
    captureMethod: 'camera' | 'gallery' | 'pdf',
    description?: string
  ): Promise<{ success: boolean; document?: Document; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    try {
      // Obtenir la taille du fichier
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

      // Préparer le payload
      const payload = {
        type: documentType as Document['type'],
        name: getDocumentTypeName(documentType),
        description,
        fileUri,
        fileName,
        fileSize,
        mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        metadata: {
          captureMethod,
          optimized: captureMethod !== 'pdf'
        }
      };

      // Envoyer via le store
      const result = await uploadDocument(payload, user.id);
      
      if (result.success) {
        // Notification de succès
        addNotification({
          type: 'success',
          title: '✅ Document envoyé !',
          message: `Votre ${getDocumentTypeName(documentType)} a été envoyé avec succès.`
        });
        
        return { success: true, document: undefined }; // Le document sera dans le store
      } else {
        // Notification d'erreur
        addNotification({
          type: 'error',
          title: '❌ Erreur d\'envoi',
          message: result.error || 'Impossible d\'envoyer le document'
        });
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = 'Erreur lors de l\'envoi du document';
      addNotification({
        type: 'error',
        title: '❌ Erreur',
        message: errorMessage
      });
      
      return { success: false, error: errorMessage };
    }
  };

  return {
    sendDocumentToAPI,
    hasActiveUploads
  };
};

// Helper pour obtenir le nom du type de document (extrait pour modularité)
const getDocumentTypeName = (docTypeId: string): string => {
  return DOCUMENT_TYPES.find(t => t.id === docTypeId)?.name || 'Document';
};

// =================== LOGIQUE MÉTIER INCHANGÉE ===================

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Types de documents selon le cahier des charges (INCHANGÉ)
const DOCUMENT_TYPES = [
  { id: 'feuille_soin', name: 'Feuille de soins', icon: '🏥', color: 'bg-blue-500' },
  { id: 'facture', name: 'Facture médicale', icon: '💉', color: 'bg-green-500' },
  { id: 'ordonnance', name: 'Ordonnance', icon: '💊', color: 'bg-purple-500' },
  { id: 'devis_dentaire', name: 'Devis dentaire', icon: '🦷', color: 'bg-pink-500' },
  { id: 'devis_optique', name: 'Devis optique', icon: '👓', color: 'bg-indigo-500' },
  { id: 'transport', name: 'Transport médical', icon: '🚑', color: 'bg-red-500' },
  { id: 'certificat', name: 'Certificat médical', icon: '📋', color: 'bg-orange-500' },
  { id: 'autre', name: 'Autre document', icon: '📄', color: 'bg-gray-500' },
];

type StepType = 'type' | 'method' | 'capture' | 'crop' | 'convert' | 'preview';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

export default function DocumentsScreen() {
  const { colors, isDark } = useTheme();
  
  // =================== INTÉGRATION API (nouveau mais non-intrusif) ===================
  const { sendDocumentToAPI, hasActiveUploads } = useDocumentAPI();
  
  // =================== ÉTATS EXISTANTS (INCHANGÉS) ===================
  const [currentStep, setCurrentStep] = useState<StepType>('type');
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [captureMethod, setCaptureMethod] = useState<'camera' | 'gallery' | 'pdf'>('camera');
  const [capturedImage, setCapturedImage] = useState<string>('');
  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [croppedImage, setCroppedImage] = useState<string>('');
  const [finalPdfUri, setFinalPdfUri] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // États pour le recadrage (INCHANGÉS)
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 100, width: 250, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string>('');
  
  // États pour les permissions (INCHANGÉS)
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  
  // Refs (INCHANGÉS)
  const panRef = useRef<any>(null);
  
  // =================== LOGIQUE EXISTANTE (INCHANGÉE) ===================
  
  // Demander les permissions au montage (INCHANGÉ)
  useEffect(() => {
    (async () => {
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === 'granted');
    })();
  }, []);

  // Fonction de capture avec ImagePicker (INCHANGÉE)
  const handleCameraCapture = async () => {
    console.log('=== DÉBUT CAPTURE AVEC IMAGE PICKER ===');
    
    setIsProcessing(true);
    
    try {
      // Demander la permission caméra
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission requise', 'Accès à la caméra nécessaire');
        setIsProcessing(false);
        return;
      }

      // Lancer la caméra avec ImagePicker - SANS contraintes de recadrage
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false, // Supprimé pour permettre le recadrage custom
        quality: 0.9,
        exif: false,
      });

      console.log('Résultat caméra ImagePicker:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedPhoto = result.assets[0];
        setCapturedImage(capturedPhoto.uri);
        
        // Obtenir les dimensions de l'image
        Image.getSize(capturedPhoto.uri, (width, height) => {
          console.log('Dimensions de l\'image capturée:', { width, height });
          setImageDimensions({ width, height });
          // Initialiser la zone de recadrage au centre avec des valeurs sûres
          const minDimension = Math.min(width, height);
          const cropWidth = Math.max(100, minDimension * 0.6);
          const cropHeight = Math.max(100, minDimension * 0.8);
          const initialCrop = {
            x: Math.max(0, (width - cropWidth) / 2),
            y: Math.max(0, (height - cropHeight) / 2),
            width: Math.min(cropWidth, width - 50),
            height: Math.min(cropHeight, height - 50)
          };
          console.log('Zone de recadrage initiale:', initialCrop);
          setCropArea(initialCrop);
          setCurrentStep('crop');
        }, (error) => {
          console.error('Erreur lors de l\'obtention des dimensions:', error);
          Alert.alert('Erreur', 'Impossible d\'analyser l\'image');
        });
        
        console.log('✅ Photo capturée avec succès:', capturedPhoto.uri);
      } else {
        console.log('Capture annulée par l\'utilisateur');
      }
    } catch (error) {
      console.error('❌ Erreur capture ImagePicker:', error);
      Alert.alert(
        'Erreur de capture', 
        'Impossible de prendre la photo. Voulez-vous utiliser la galerie ?',
        [
          { text: 'Réessayer', onPress: () => {} },
          { text: 'Galerie', onPress: handleGalleryPick },
          { text: 'Retour', onPress: () => setCurrentStep('method') }
        ]
      );
    } finally {
      setIsProcessing(false);
      console.log('=== FIN CAPTURE ===');
    }
  };

  // Fonction de sélection galerie (INCHANGÉE)
  const handleGalleryPick = async () => {
    if (!hasGalleryPermission) {
      Alert.alert('Permission requise', 'Accès à la galerie nécessaire');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false, // Supprimé pour permettre le recadrage custom
        quality: 0.9,
      });

      console.log('Résultat galerie:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setCapturedImage(selectedImage.uri);
        
        // Obtenir les dimensions de l'image
        Image.getSize(selectedImage.uri, (width, height) => {
          console.log('Dimensions de l\'image sélectionnée:', { width, height });
          setImageDimensions({ width, height });
          // Initialiser la zone de recadrage au centre avec des valeurs sûres
          const minDimension = Math.min(width, height);
          const cropWidth = Math.max(100, minDimension * 0.6);
          const cropHeight = Math.max(100, minDimension * 0.8);
          const initialCrop = {
            x: Math.max(0, (width - cropWidth) / 2),
            y: Math.max(0, (height - cropHeight) / 2),
            width: Math.min(cropWidth, width - 50),
            height: Math.min(cropHeight, height - 50)
          };
          console.log('Zone de recadrage initiale (galerie):', initialCrop);
          setCropArea(initialCrop);
          setCurrentStep('crop');
        }, (error) => {
          console.error('Erreur lors de l\'obtention des dimensions (galerie):', error);
          Alert.alert('Erreur', 'Impossible d\'analyser l\'image sélectionnée');
        });
      }
    } catch (error) {
      console.error('Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction de sélection PDF (INCHANGÉE)
  const handlePdfPick = async () => {
    setIsProcessing(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('Résultat PDF:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedDocument = result.assets[0];
        setSelectedPdf(selectedDocument.uri);
        setFinalPdfUri(selectedDocument.uri);
        setCurrentStep('preview');
      }
    } catch (error) {
      console.error('Erreur sélection PDF:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction de recadrage de l'image (INCHANGÉE)
  const handleCropImage = async () => {
    if (!capturedImage) {
      console.error('❌ Pas d\'image capturée');
      return;
    }

    console.log('🔍 === DÉBUT DEBUG RECADRAGE ===');
    console.log('Image URI:', capturedImage);
    console.log('Dimensions image:', imageDimensions);
    console.log('Zone de recadrage:', cropArea);

    setIsProcessing(true);
    try {
      // Validation des dimensions avant recadrage
      if (!imageDimensions || imageDimensions.width <= 0 || imageDimensions.height <= 0) {
        console.error('❌ Dimensions d\'image invalides:', imageDimensions);
        Alert.alert('Erreur', 'Dimensions de l\'image invalides. Veuillez reprendre la photo.');
        setCurrentStep('capture');
        return;
      }

      if (!cropArea || cropArea.width <= 0 || cropArea.height <= 0) {
        console.error('❌ Zone de recadrage invalide:', cropArea);
        Alert.alert('Erreur', 'Zone de recadrage trop petite. Veuillez agrandir la zone.');
        return;
      }

      // Vérifier que la zone de recadrage est dans les limites
      if (cropArea.x < 0 || cropArea.y < 0 || 
          cropArea.x + cropArea.width > imageDimensions.width ||
          cropArea.y + cropArea.height > imageDimensions.height) {
        console.error('❌ Zone de recadrage hors limites:', {
          cropArea,
          imageDimensions,
          outOfBounds: {
            x: cropArea.x < 0,
            y: cropArea.y < 0,
            width: cropArea.x + cropArea.width > imageDimensions.width,
            height: cropArea.y + cropArea.height > imageDimensions.height
          }
        });
        Alert.alert('Erreur', 'Zone de recadrage hors des limites de l\'image.');
        return;
      }

      // Calculer les coordonnées de recadrage en PIXELS ABSOLUS
      let cropX = Math.round(cropArea.x);
      let cropY = Math.round(cropArea.y);
      let cropWidth = Math.round(cropArea.width);
      let cropHeight = Math.round(cropArea.height);

      console.log('Paramètres en pixels absolus:', { cropX, cropY, cropWidth, cropHeight });

      // Validation stricte des valeurs en pixels
      if (cropX < 0 || cropY < 0) {
        console.error('❌ Coordonnées négatives:', { cropX, cropY });
        Alert.alert('Erreur', 'Position de recadrage invalide.');
        return;
      }

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.error('❌ Dimensions invalides:', { cropWidth, cropHeight });
        Alert.alert('Erreur', 'Taille de recadrage invalide.');
        return;
      }

      if (cropX + cropWidth > imageDimensions.width || cropY + cropHeight > imageDimensions.height) {
        console.error('❌ Zone dépasse les limites:', { 
          totalX: cropX + cropWidth, 
          totalY: cropY + cropHeight,
          maxX: imageDimensions.width,
          maxY: imageDimensions.height
        });
        Alert.alert('Erreur', 'Zone de recadrage dépasse les limites.');
        return;
      }

      // Forcer des valeurs minimales sécurisées
      cropWidth = Math.max(10, cropWidth);
      cropHeight = Math.max(10, cropHeight);
      
      // Ajuster si nécessaire pour rester dans les limites
      if (cropX + cropWidth > imageDimensions.width) {
        cropWidth = imageDimensions.width - cropX;
      }
      if (cropY + cropHeight > imageDimensions.height) {
        cropHeight = imageDimensions.height - cropY;
      }

      console.log('Paramètres finaux de recadrage EN PIXELS:', { 
        originX: cropX, 
        originY: cropY, 
        width: cropWidth, 
        height: cropHeight
      });

      // Tenter le recadrage avec optimisation pour le PDF
      console.log('🔧 Appel de manipulateAsync...');
      const manipResult = await manipulateAsync(
        capturedImage,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropWidth,
              height: cropHeight,
            },
          },
          // Optimisation automatique pour le PDF
          { resize: { width: 1000 } }
        ],
        { 
          compress: 0.8, 
          format: SaveFormat.JPEG 
        }
      );
      
      console.log('✅ Image recadrée et optimisée avec succès:', manipResult.uri);
      setCroppedImage(manipResult.uri);
      
      // Passer directement à la conversion PDF
      setCurrentStep('convert');
      
    } catch (error: any) {
      console.error('❌ Erreur recadrage détaillée:', {
        error: error.message,
        stack: error.stack,
        imageDimensions,
        cropArea,
        capturedImage
      });
      
      Alert.alert(
        'Erreur de recadrage', 
        `Impossible de recadrer l'image.\n\nDétails: ${error.message}\n\nVoulez-vous reprendre la photo ?`,
        [
          { text: 'Reprendre photo', onPress: () => setCurrentStep('capture') },
          { text: 'Réessayer', onPress: () => {} }
        ]
      );
    } finally {
      setIsProcessing(false);
      console.log('🔍 === FIN DEBUG RECADRAGE ===');
    }
  };

  // Fonction de conversion en PDF (INCHANGÉE)
  const convertToPdf = async () => {
    if (!croppedImage) return;

    setIsProcessing(true);
    try {
      console.log('Conversion en PDF de:', croppedImage);
      
      // Créer le HTML pour le PDF avec l'image optimisée
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: white;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <img src="${croppedImage}" alt="Document ${DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.name}" />
          </body>
        </html>
      `;

      // Générer le PDF avec format A4
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612, // A4 width in points
        height: 792, // A4 height in points
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      console.log('PDF généré:', uri);
      setFinalPdfUri(uri);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Erreur conversion PDF:', error);
      Alert.alert('Erreur', 'Impossible de convertir en PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-conversion après recadrage (INCHANGÉ)
  useEffect(() => {
    if (currentStep === 'convert' && croppedImage) {
      convertToPdf();
    }
  }, [currentStep, croppedImage]);

  // Gestion du drag pour le recadrage (INCHANGÉE)
  const handlePanGesture = (event: any) => {
    const { translationX, translationY, state } = event.nativeEvent;
    
    if (state === State.ACTIVE && isDragging) {
      let newCropArea = { ...cropArea };
      
      // Calculer les dimensions d'affichage de l'image à l'écran
      const displayWidth = screenWidth - 80;
      const displayHeight = Math.min(400, displayWidth * (imageDimensions.height / imageDimensions.width));
      
      // Facteurs de conversion entre l'affichage et l'image réelle
      const scaleX = imageDimensions.width / displayWidth;
      const scaleY = imageDimensions.height / displayHeight;
      
      // Convertir les translations d'écran vers les coordonnées de l'image
      const deltaX = translationX * scaleX;
      const deltaY = translationY * scaleY;
      
      switch (dragHandle) {
        case 'move':
          // Déplacement : contraindre dans les limites de l'image
          newCropArea.x = Math.max(0, Math.min(imageDimensions.width - cropArea.width, cropArea.x + deltaX * 0.3));
          newCropArea.y = Math.max(0, Math.min(imageDimensions.height - cropArea.height, cropArea.y + deltaY * 0.3));
          break;
          
        case 'resize-se':
          // Redimensionnement coin bas-droit
          const newWidthSE = Math.max(50, cropArea.width + deltaX * 0.3);
          const newHeightSE = Math.max(50, cropArea.height + deltaY * 0.3);
          
          newCropArea.width = Math.min(newWidthSE, imageDimensions.width - cropArea.x);
          newCropArea.height = Math.min(newHeightSE, imageDimensions.height - cropArea.y);
          break;
          
        case 'resize-sw':
          // Redimensionnement coin bas-gauche
          const deltaWidthSW = -deltaX * 0.3;
          const newXSW = Math.max(0, cropArea.x - deltaWidthSW);
          const newWidthSWFinal = Math.max(50, cropArea.width + deltaWidthSW);
          
          if (newXSW + newWidthSWFinal <= imageDimensions.width) {
            newCropArea.x = newXSW;
            newCropArea.width = newWidthSWFinal;
          }
          
          const newHeightSW = Math.max(50, cropArea.height + deltaY * 0.3);
          newCropArea.height = Math.min(newHeightSW, imageDimensions.height - cropArea.y);
          break;
          
        case 'resize-ne':
          // Redimensionnement coin haut-droit
          const newWidthNE = Math.max(50, cropArea.width + deltaX * 0.3);
          newCropArea.width = Math.min(newWidthNE, imageDimensions.width - cropArea.x);
          
          const deltaHeightNE = -deltaY * 0.3;
          const newYNE = Math.max(0, cropArea.y - deltaHeightNE);
          const newHeightNEFinal = Math.max(50, cropArea.height + deltaHeightNE);
          
          if (newYNE + newHeightNEFinal <= imageDimensions.height) {
            newCropArea.y = newYNE;
            newCropArea.height = newHeightNEFinal;
          }
          break;
          
        case 'resize-nw':
          // Redimensionnement coin haut-gauche
          const deltaWidthNW = -deltaX * 0.3;
          const deltaHeightNW = -deltaY * 0.3;
          
          const newXNW = Math.max(0, cropArea.x - deltaWidthNW);
          const newYNW = Math.max(0, cropArea.y - deltaHeightNW);
          const newWidthNWFinal = Math.max(50, cropArea.width + deltaWidthNW);
          const newHeightNWFinal = Math.max(50, cropArea.height + deltaHeightNW);
          
          if (newXNW + newWidthNWFinal <= imageDimensions.width && 
              newYNW + newHeightNWFinal <= imageDimensions.height) {
            newCropArea.x = newXNW;
            newCropArea.y = newYNW;
            newCropArea.width = newWidthNWFinal;
            newCropArea.height = newHeightNWFinal;
          }
          break;
      }
      
      // Validation finale : s'assurer que la zone reste dans les limites
      newCropArea.x = Math.max(0, Math.min(imageDimensions.width - newCropArea.width, newCropArea.x));
      newCropArea.y = Math.max(0, Math.min(imageDimensions.height - newCropArea.height, newCropArea.y));
      newCropArea.width = Math.max(50, Math.min(imageDimensions.width - newCropArea.x, newCropArea.width));
      newCropArea.height = Math.max(50, Math.min(imageDimensions.height - newCropArea.y, newCropArea.height));
      
      setCropArea(newCropArea);
    }
    
    if (state === State.END) {
      setIsDragging(false);
      setDragHandle('');
    }
  };

  // =================== INTÉGRATION API - Envoi final (seule modification) ===================
  const handleSendDocument = async () => {
    const documentToSend = finalPdfUri || croppedImage;
    if (!documentToSend) {
      Alert.alert('Erreur', 'Aucun document à envoyer');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Envoi du document:', documentToSend, selectedDocType);
      
      // Générer le nom de fichier
      const timestamp = Date.now();
      const fileName = captureMethod === 'pdf' 
        ? `${selectedDocType}_${timestamp}.pdf`
        : `${selectedDocType}_${timestamp}.pdf`;
      
      // Utiliser l'API intégrée
      const result = await sendDocumentToAPI(
        selectedDocType,
        documentToSend,
        fileName,
        captureMethod,
        `${getDocumentTypeName(selectedDocType)} du ${new Date().toLocaleDateString('fr-FR')}`
      );
      
      if (result.success) {
        // Succès - L'API a déjà géré la notification
        Alert.alert(
          '✅ Document envoyé !',
          `Votre ${getDocumentTypeName(selectedDocType)} a été envoyé avec succès.\n\nVous pouvez suivre son traitement depuis l'onglet "Mes documents".`,
          [
            {
              text: 'Retour à l\'accueil',
              onPress: () => router.back()
            },
            {
              text: 'Envoyer un autre',
              onPress: () => {
                // Reset de l'état pour un nouvel envoi
                setCurrentStep('type');
                setCapturedImage('');
                setCroppedImage('');
                setSelectedPdf('');
                setFinalPdfUri('');
                setSelectedDocType('');
              }
            }
          ]
        );
      } else {
        // Erreur - L'API a déjà géré la notification
        Alert.alert(
          'Erreur d\'envoi', 
          result.error || 'Impossible d\'envoyer le document. Veuillez réessayer.',
          [
            { text: 'Réessayer', onPress: () => {} },
            { text: 'Retour', onPress: () => setCurrentStep('preview') }
          ]
        );
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      Alert.alert('Erreur', 'Erreur inattendue lors de l\'envoi du document');
    } finally {
      setIsProcessing(false);
    }
  };

  // =================== RENDU - LOGIQUE INCHANGÉE ===================

  // Rendu selon l'étape actuelle (INCHANGÉ)
  const renderContent = () => {
    switch (currentStep) {
      case 'type':
        return renderDocumentTypeSelection();
      case 'method':
        return renderCaptureMethodSelection();
      case 'capture':
        return renderCameraInterface();
      case 'crop':
        return renderCropInterface();
      case 'convert':
        return renderPdfConverter();
      case 'preview':
        return renderPreview();
      default:
        return renderDocumentTypeSelection();
    }
  };

  // Sélection du type de document (INCHANGÉ)
  const renderDocumentTypeSelection = () => (
    <ScrollView className="flex-1 px-6 pt-6">
      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">📄</Text>
        <ThemedText type="title" className="text-center mb-2">
          Type de document
        </ThemedText>
        <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
          Sélectionnez le type de document à envoyer
        </ThemedText>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {DOCUMENT_TYPES.map((docType) => (
          <Pressable
            key={docType.id}
            onPress={() => {
              setSelectedDocType(docType.id);
              setCurrentStep('method');
            }}
            className="w-[48%] mb-4"
          >
            <View className={`${docType.color} rounded-2xl p-4 h-24 justify-center items-center shadow-lg`}>
              <Text className="text-2xl mb-1">{docType.icon}</Text>
              <ThemedText 
                className="text-white font-semibold text-center text-sm"
                style={{ color: '#ffffff' }}
              >
                {docType.name}
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  // Sélection de la méthode de capture (INCHANGÉ)
  const renderCaptureMethodSelection = () => (
    <ScrollView className="flex-1 p-6">
      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">
          {DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.icon}
        </Text>
        <ThemedText type="title" className="text-center mb-2">
          Comment souhaitez-vous ajouter votre document ?
        </ThemedText>
        <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
          {DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.name}
        </ThemedText>
      </View>

      <View className="mb-8">
        {/* Option Caméra */}
        <Pressable
          onPress={() => {
            setCaptureMethod('camera');
            setCurrentStep('capture');
          }}
          className="bg-blue-500 rounded-2xl p-6 shadow-lg mb-4"
        >
          <View className="flex-row items-center">
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Text className="text-3xl">📸</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                Scanner avec l'appareil photo
              </Text>
              <Text className="text-blue-100 text-sm">
                Capture avec recadrage personnalisé
              </Text>
            </View>
            <Text className="text-white text-2xl">→</Text>
          </View>
        </Pressable>

        {/* Option Galerie */}
        <Pressable
          onPress={() => {
            setCaptureMethod('gallery');
            handleGalleryPick();
          }}
          className="bg-purple-500 rounded-2xl p-6 shadow-lg mb-4"
        >
          <View className="flex-row items-center">
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Text className="text-3xl">🖼️</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                Choisir depuis la galerie
              </Text>
              <Text className="text-purple-100 text-sm">
                Sélectionner une photo avec recadrage
              </Text>
            </View>
            <Text className="text-white text-2xl">→</Text>
          </View>
        </Pressable>

        {/* Option PDF */}
        <Pressable
          onPress={() => {
            setCaptureMethod('pdf');
            handlePdfPick();
          }}
          className="bg-green-500 rounded-2xl p-6 shadow-lg"
        >
          <View className="flex-row items-center">
            <View className="bg-white/20 rounded-full p-3 mr-4">
              <Text className="text-3xl">📑</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                Sélectionner un PDF existant
              </Text>
              <Text className="text-green-100 text-sm">
                Choisir un document PDF déjà préparé
              </Text>
            </View>
            <Text className="text-white text-2xl">→</Text>
          </View>
        </Pressable>
      </View>

      <ThemedButton
        title="← Retour"
        variant="ghost"
        onPress={() => setCurrentStep('type')}
      />
    </ScrollView>
  );

  // Interface caméra simplifiée (INCHANGÉ)
  const renderCameraInterface = () => {
    return (
      <View className="flex-1 p-6">
        <View className="items-center mb-8">
          <Text className="text-6xl mb-4">📸</Text>
          <ThemedText type="title" className="text-center mb-2">
            Prendre une photo
          </ThemedText>
          <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
            Puis recadrer selon vos besoins
          </ThemedText>
        </View>

        <View className="mb-8">
          {/* Bouton caméra principal */}
          <Pressable
            onPress={handleCameraCapture}
            disabled={isProcessing}
            className={`rounded-2xl p-6 shadow-lg mb-4 ${
              isProcessing ? 'bg-gray-400' : 'bg-blue-500'
            }`}
          >
            <View className="flex-row items-center justify-center">
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 12 }} />
                  <Text className="text-white font-bold text-lg">
                    Ouverture de l'appareil photo...
                  </Text>
                </>
              ) : (
                <>
                  <View className="bg-white/20 rounded-full p-3 mr-4">
                    <Text className="text-3xl">📸</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">
                      Prendre une photo
                    </Text>
                    <Text className="text-blue-100 text-sm">
                      Capture directe avec recadrage libre
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Pressable>

          {/* Option galerie alternative */}
          <Pressable
            onPress={handleGalleryPick}
            disabled={isProcessing}
            className="bg-purple-500 rounded-2xl p-6 shadow-lg"
          >
            <View className="flex-row items-center justify-center">
              <View className="bg-white/20 rounded-full p-3 mr-4">
                <Text className="text-3xl">🖼️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">
                  Choisir depuis la galerie
                </Text>
                <Text className="text-purple-100 text-sm">
                  Sélectionner une photo existante
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Conseils pour la photo */}
        <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-start">
            <Text className="text-2xl mr-3">💡</Text>
            <View className="flex-1">
              <Text className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Conseils pour une bonne capture
              </Text>
              <Text className="text-yellow-700 dark:text-yellow-300 text-sm">
                • Assurez-vous que le document est bien éclairé{'\n'}
                • Tenez votre téléphone bien droit{'\n'}
                • Évitez les reflets et les ombres{'\n'}
                • Capturez tout le document dans le cadre{'\n'}
                • Vous pourrez recadrer précisément ensuite
              </Text>
            </View>
          </View>
        </View>

        <ThemedButton
          title="← Retour"
          variant="ghost"
          onPress={() => setCurrentStep('method')}
        />
      </View>
    );
  };

  // Interface de recadrage personnalisé (INCHANGÉ)
  const renderCropInterface = () => (
    <GestureHandlerRootView className="flex-1">
      <ScrollView className="flex-1 p-6">
        <ThemedText type="title" className="text-center mb-6">
          Recadrer votre document
        </ThemedText>

        {/* Instructions */}
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-start">
            <Text className="text-2xl mr-3">✂️</Text>
            <View className="flex-1">
              <Text className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Instructions de recadrage
              </Text>
              <Text className="text-blue-700 dark:text-blue-300 text-sm">
                • Déplacez le cadre en touchant à l'intérieur{'\n'}
                • Redimensionnez en tirant les coins{'\n'}
                • Ajustez pour capturer tout le document{'\n'}
                • Le PDF sera généré automatiquement
              </Text>
            </View>
          </View>
        </View>

        {/* Zone de recadrage avec image */}
        <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mb-6">
          <View className="relative">
            {capturedImage && (
              <>
                <Image 
                  source={{ uri: capturedImage }}
                  style={{ 
                    width: screenWidth - 80, 
                    height: (screenWidth - 80) * (imageDimensions.height / imageDimensions.width || 1),
                    maxHeight: 400
                  }}
                  resizeMode="contain"
                />
                
                {/* Overlay de recadrage */}
                <PanGestureHandler
                  ref={panRef}
                  onGestureEvent={handlePanGesture}
                  onHandlerStateChange={handlePanGesture}
                >
                  <View 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    {/* Zone de recadrage */}
                    <View
                      style={{
                        position: 'absolute',
                        left: (cropArea.x / imageDimensions.width) * (screenWidth - 80),
                        top: (cropArea.y / imageDimensions.height) * ((screenWidth - 80) * (imageDimensions.height / imageDimensions.width)),
                        width: (cropArea.width / imageDimensions.width) * (screenWidth - 80),
                        height: (cropArea.height / imageDimensions.height) * ((screenWidth - 80) * (imageDimensions.height / imageDimensions.width)),
                        borderWidth: 2,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      }}
                    >
                      {/* Poignées de redimensionnement */}
                      <Pressable
                        style={{
                          position: 'absolute',
                          top: -8,
                          left: -8,
                          width: 16,
                          height: 16,
                          backgroundColor: '#3b82f6',
                          borderRadius: 8,
                        }}
                        onPressIn={() => {
                          setIsDragging(true);
                          setDragHandle('resize-nw');
                        }}
                      />
                      <Pressable
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 16,
                          height: 16,
                          backgroundColor: '#3b82f6',
                          borderRadius: 8,
                        }}
                        onPressIn={() => {
                          setIsDragging(true);
                          setDragHandle('resize-ne');
                        }}
                      />
                      <Pressable
                        style={{
                          position: 'absolute',
                          bottom: -8,
                          left: -8,
                          width: 16,
                          height: 16,
                          backgroundColor: '#3b82f6',
                          borderRadius: 8,
                        }}
                        onPressIn={() => {
                          setIsDragging(true);
                          setDragHandle('resize-sw');
                        }}
                      />
                      <Pressable
                        style={{
                          position: 'absolute',
                          bottom: -8,
                          right: -8,
                          width: 16,
                          height: 16,
                          backgroundColor: '#3b82f6',
                          borderRadius: 8,
                        }}
                        onPressIn={() => {
                          setIsDragging(true);
                          setDragHandle('resize-se');
                        }}
                      />
                      
                      {/* Zone de déplacement */}
                      <Pressable
                        style={{
                          flex: 1,
                          margin: 8,
                        }}
                        onPressIn={() => {
                          setIsDragging(true);
                          setDragHandle('move');
                        }}
                      >
                        <View className="flex-1 justify-center items-center">
                          <Text className="text-white bg-blue-500 px-2 py-1 rounded text-xs">
                            Déplacer
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                </PanGestureHandler>
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="mb-8">
          {isProcessing ? (
            <View className="items-center py-6">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="mt-4 text-base font-semibold text-blue-600">
                Recadrage en cours...
              </Text>
            </View>
          ) : (
            <>
              <ThemedButton
                title="✂️ Valider et convertir en PDF"
                variant="primary"
                onPress={handleCropImage}
                className="mb-4"
              />
              <ThemedButton
                title="🔄 Recommencer"
                variant="outline"
                onPress={() => setCurrentStep('capture')}
                className="mb-2"
              />
              <ThemedButton
                title="← Retour"
                variant="ghost"
                onPress={() => setCurrentStep('method')}
              />
            </>
          )}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );

  // Interface de conversion PDF (INCHANGÉ)
  const renderPdfConverter = () => (
    <View className="flex-1 p-6 justify-center items-center">
      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">📄</Text>
        <ThemedText type="title" className="text-center mb-2">
          Conversion en PDF
        </ThemedText>
        <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
          Génération de votre document PDF en cours...
        </ThemedText>
      </View>

      <View className="items-center py-8">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-6 text-lg font-semibold text-blue-600">
          Conversion en PDF...
        </Text>
        <Text className="mt-2 text-sm text-gray-600 text-center">
          Optimisation de votre document{'\n'}
          Cela peut prendre quelques secondes
        </Text>
      </View>

      {/* Aperçu de l'image en cours de traitement */}
      {croppedImage && (
        <View className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 mt-8">
          <Image 
            source={{ uri: croppedImage }}
            className="w-full h-40 rounded-xl"
            resizeMode="cover"
          />
          <Text className="text-center text-sm text-gray-600 mt-2">
            Image optimisée • Prête pour PDF
          </Text>
        </View>
      )}
    </View>
  );

  // Prévisualisation finale (MODIFIÉ - indicateur uploads actifs)
  const renderPreview = () => (
    <ScrollView className="flex-1 p-6">
      <View className="items-center mb-6">
        <Text className="text-6xl mb-4">✅</Text>
        <ThemedText type="title" className="text-center mb-2">
          Vérification finale
        </ThemedText>
        <ThemedText type="caption" className="text-center text-gray-600 dark:text-gray-400">
          Votre document PDF est prêt à être envoyé
        </ThemedText>
      </View>

      {/* Indicateur d'uploads actifs (NOUVEAU - non-intrusif) */}
      {hasActiveUploads && (
        <View className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 8 }} />
            <Text className="text-amber-800 dark:text-amber-200 font-medium">
              Un envoi est en cours...
            </Text>
          </View>
        </View>
      )}

      {/* Récapitulatif (INCHANGÉ) */}
      <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6">
        <View className="flex-row items-center mb-3">
          <Text className="text-2xl mr-3">📋</Text>
          <Text className="font-semibold text-lg">Récapitulatif</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600">Type de document</Text>
          <Text className="text-sm font-semibold">
            {DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.name}
          </Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600">Méthode</Text>
          <Text className="text-sm font-semibold">
            {captureMethod === 'camera' ? '📸 Scanner' : 
             captureMethod === 'gallery' ? '🖼️ Galerie' : '📑 PDF'}
          </Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600">Format final</Text>
          <Text className="text-sm font-semibold">📄 PDF optimisé</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Statut</Text>
          <Text className="text-sm font-semibold text-green-600">✅ Prêt à envoyer</Text>
        </View>
      </View>

      {/* Prévisualisation PDF complète (INCHANGÉ) */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 shadow-lg">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold">📄 Aperçu du PDF</Text>
          <View className="flex-row items-center">
            <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
            <Text className="text-sm text-green-600 font-medium">PDF généré</Text>
          </View>
        </View>
        
        {captureMethod === 'pdf' && selectedPdf ? (
          // PDF existant sélectionné
          <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 items-center">
            <Text className="text-4xl mb-3">📑</Text>
            <Text className="font-semibold text-lg mb-2">Document PDF sélectionné</Text>
            <Text className="text-sm text-gray-600 text-center mb-3">
              PDF original prêt à être envoyé
            </Text>
            <View className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full">
              <Text className="text-xs text-gray-600 dark:text-gray-300">
                {selectedPdf.split('/').pop()?.substring(0, 20)}...
              </Text>
            </View>
          </View>
        ) : finalPdfUri ? (
          // PDF généré à partir d'image
          <View className="bg-white dark:bg-gray-700 rounded-xl overflow-hidden">
            {/* En-tête du PDF */}
            <View className="bg-gray-50 dark:bg-gray-600 px-4 py-3 border-b border-gray-200 dark:border-gray-500">
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold text-gray-800 dark:text-gray-200">
                  {DOCUMENT_TYPES.find(t => t.id === selectedDocType)?.name}.pdf
                </Text>
                <Text className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-500 px-2 py-1 rounded">
                  A4
                </Text>
              </View>
            </View>
            
            {/* Contenu du PDF */}
            <View className="p-4">
              {croppedImage && (
                <View className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <Image 
                    source={{ uri: croppedImage }}
                    style={{ 
                      width: '100%', 
                      height: 250,
                      borderRadius: 6
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              {/* Métadonnées du PDF */}
              <View className="mt-4 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  📊 Propriétés du document
                </Text>
                <View className="space-y-1">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Format :</Text>
                    <Text className="text-xs font-medium">PDF/A4</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Qualité :</Text>
                    <Text className="text-xs font-medium">Haute définition</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Optimisation :</Text>
                    <Text className="text-xs font-medium text-green-600">✓ Activée</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // État d'erreur
          <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 items-center">
            <Text className="text-4xl mb-3">⚠️</Text>
            <Text className="font-semibold text-lg mb-2">Document en préparation</Text>
            <Text className="text-sm text-gray-600 text-center">
              La génération du PDF n'est pas encore terminée
            </Text>
          </View>
        )}
      </View>

      {/* Actions finales (INCHANGÉ sauf le bouton principal utilise maintenant l'API) */}
      <View className="mb-8">
        {isProcessing ? (
          <View className="items-center py-6">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-base font-semibold text-blue-600">
              Envoi en cours...
            </Text>
            <Text className="mt-2 text-sm text-gray-600">
              Transmission sécurisée de votre document
            </Text>
          </View>
        ) : (
          <>
            <ThemedButton
              title="📤 Envoyer le document"
              variant="primary"
              onPress={handleSendDocument}
              className="mb-4"
            />
            {captureMethod !== 'pdf' && croppedImage && (
              <ThemedButton
                title="✂️ Recadrer à nouveau"
                variant="outline"
                onPress={() => setCurrentStep('crop')}
                className="mb-2"
              />
            )}
            <ThemedButton
              title="← Retour au début"
              variant="ghost"
              onPress={() => {
                setCurrentStep('type');
                setCapturedImage('');
                setCroppedImage('');
                setSelectedPdf('');
                setFinalPdfUri('');
                setSelectedDocType('');
              }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <ThemedView className="flex-1">
      {/* Header avec progression (INCHANGÉ) */}
      <View className={`pt-16 pb-4 px-6 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b border-gray-200 dark:border-gray-700`}>
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={() => router.back()}>
            <Text className="text-2xl">←</Text>
          </Pressable>
          <ThemedText type="subtitle">Envoyer un document</ThemedText>
          <View className="w-8" />
        </View>
        
        {/* Indicateur de progression */}
        <View className="flex-row justify-center items-center">
          {(['type', 'method', 'capture', 'crop', 'convert', 'preview'] as StepType[]).map((step, index) => (
            <View
              key={step}
              className={`w-2 h-2 rounded-full mx-1 ${
                ['type', 'method', 'capture', 'crop', 'convert', 'preview'].indexOf(currentStep) >= index
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Contenu principal (INCHANGÉ) */}
      <View className="flex-1">
        {renderContent()}
      </View>
    </ThemedView>
  );
}