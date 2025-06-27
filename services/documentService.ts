/**
 * Service API pour la gestion des documents d'assurance santé
 * Simulation des appels API en attendant le backend
 */

import { api, ApiResponse } from './api';

// Types pour les documents
export interface Document {
  id: string;
  type: 'feuille_soin' | 'facture' | 'ordonnance' | 'devis_dentaire' | 'devis_optique' | 'transport' | 'certificat' | 'autre';
  name: string;
  description?: string;
  fileUri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  trackingNumber: string;
  status: 'uploading' | 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  submittedAt: string;
  updatedAt: string;
  processedAt?: string;
  rejectionReason?: string;
  metadata: {
    captureMethod: 'camera' | 'gallery' | 'pdf';
    originalDimensions?: { width: number; height: number };
    croppedDimensions?: { width: number; height: number };
    optimized: boolean;
  };
}

export interface DocumentUploadPayload {
  type: Document['type'];
  name: string;
  description?: string;
  fileUri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata: Document['metadata'];
}

export interface DocumentStatusUpdate {
  id: string;
  status: Document['status'];
  processedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface DocumentStats {
  total: number;
  pending: number;
  processing: number;
  approved: number;
  rejected: number;
  completed: number;
}

// Données simulées pour les tests
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc_1',
    type: 'feuille_soin',
    name: 'Feuille de soins',
    description: 'Consultation généraliste du 15/06/2025',
    fileUri: 'file://mock/feuille_soin_001.pdf',
    fileName: 'feuille_soin_001.pdf',
    fileSize: 245760,
    mimeType: 'application/pdf',
    userId: '1',
    trackingNumber: 'DOC-2025-001',
    status: 'approved',
    submittedAt: '2025-06-15T10:30:00Z',
    updatedAt: '2025-06-16T14:20:00Z',
    processedAt: '2025-06-16T14:20:00Z',
    metadata: {
      captureMethod: 'camera',
      originalDimensions: { width: 1080, height: 1440 },
      croppedDimensions: { width: 800, height: 1200 },
      optimized: true
    }
  },
  {
    id: 'doc_2',
    type: 'ordonnance',
    name: 'Ordonnance',
    description: 'Prescription antibiotiques',
    fileUri: 'file://mock/ordonnance_002.pdf',
    fileName: 'ordonnance_002.pdf',
    fileSize: 189432,
    mimeType: 'application/pdf',
    userId: '1',
    trackingNumber: 'DOC-2025-002',
    status: 'processing',
    submittedAt: '2025-06-20T08:15:00Z',
    updatedAt: '2025-06-20T08:15:00Z',
    metadata: {
      captureMethod: 'gallery',
      originalDimensions: { width: 1200, height: 1600 },
      croppedDimensions: { width: 900, height: 1300 },
      optimized: true
    }
  },
  {
    id: 'doc_3',
    type: 'facture',
    name: 'Facture médicale',
    description: 'Consultation spécialiste cardiologie',
    fileUri: 'file://mock/facture_003.pdf',
    fileName: 'facture_003.pdf',
    fileSize: 156789,
    mimeType: 'application/pdf',
    userId: '1',
    trackingNumber: 'DOC-2025-003',
    status: 'pending',
    submittedAt: '2025-06-22T16:45:00Z',
    updatedAt: '2025-06-22T16:45:00Z',
    metadata: {
      captureMethod: 'pdf',
      optimized: false
    }
  }
];

// Simulation du délai réseau
const simulateNetworkDelay = (min = 500, max = 2000) => {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Génération d'un numéro de suivi unique
const generateTrackingNumber = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `DOC-${year}-${timestamp}${random}`;
};

// Service de documents
export class DocumentService {
  private static documents = [...MOCK_DOCUMENTS];

  // Obtenir tous les documents de l'utilisateur
  static async getUserDocuments(userId: string): Promise<ApiResponse<Document[]>> {
    await simulateNetworkDelay();
    
    try {
      const userDocuments = this.documents
        .filter(doc => doc.userId === userId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      
      return {
        success: true,
        data: userDocuments,
        message: 'Documents récupérés avec succès'
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: 'Erreur lors de la récupération des documents'
      };
    }
  }

  // Obtenir un document par ID
  static async getDocumentById(documentId: string): Promise<ApiResponse<Document>> {
    await simulateNetworkDelay();
    
    try {
      const document = this.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return {
          success: false,
          data: null as any,
          error: 'Document non trouvé'
        };
      }
      
      return {
        success: true,
        data: document,
        message: 'Document trouvé'
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: 'Erreur lors de la récupération du document'
      };
    }
  }

  // Rechercher des documents par numéro de suivi
  static async getDocumentByTrackingNumber(trackingNumber: string): Promise<ApiResponse<Document>> {
    await simulateNetworkDelay();
    
    try {
      const document = this.documents.find(doc => 
        doc.trackingNumber.toLowerCase() === trackingNumber.toLowerCase()
      );
      
      if (!document) {
        return {
          success: false,
          data: null as any,
          error: 'Aucun document trouvé avec ce numéro de suivi'
        };
      }
      
      return {
        success: true,
        data: document,
        message: 'Document trouvé'
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: 'Erreur lors de la recherche'
      };
    }
  }

  // Uploader un nouveau document
  static async uploadDocument(payload: DocumentUploadPayload, userId: string): Promise<ApiResponse<Document>> {
    await simulateNetworkDelay(1000, 3000); // Upload plus long
    
    try {
      // Simulation d'erreur aléatoire (5% de chance)
      if (Math.random() < 0.05) {
        throw new Error('Erreur de serveur lors de l\'upload');
      }

      const newDocument: Document = {
        id: `doc_${Date.now()}`,
        ...payload,
        userId,
        trackingNumber: generateTrackingNumber(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Ajouter à la collection simulée
      this.documents.unshift(newDocument);
      
      // Simuler le traitement automatique après un délai
      setTimeout(() => {
        this.simulateAutomaticProcessing(newDocument.id);
      }, 5000);

      return {
        success: true,
        data: newDocument,
        message: 'Document envoyé avec succès'
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'envoi du document'
      };
    }
  }

  // Simulation du traitement automatique
  private static async simulateAutomaticProcessing(documentId: string) {
    const document = this.documents.find(doc => doc.id === documentId);
    if (!document) return;

    // Passer en "processing"
    document.status = 'processing';
    document.updatedAt = new Date().toISOString();

    // Attendre un délai simulé
    setTimeout(() => {
      // 80% de chance d'approbation, 20% de rejet
      const isApproved = Math.random() > 0.2;
      
      if (isApproved) {
        document.status = 'approved';
        document.processedAt = new Date().toISOString();
      } else {
        document.status = 'rejected';
        document.rejectionReason = 'Document illisible - Veuillez reprendre la photo avec un meilleur éclairage';
        document.processedAt = new Date().toISOString();
      }
      
      document.updatedAt = new Date().toISOString();
    }, Math.random() * 10000 + 5000); // 5-15 secondes
  }

  // Obtenir les statistiques des documents
  static async getDocumentStats(userId: string): Promise<ApiResponse<DocumentStats>> {
    await simulateNetworkDelay();
    
    try {
      const userDocuments = this.documents.filter(doc => doc.userId === userId);
      
      const stats: DocumentStats = {
        total: userDocuments.length,
        pending: userDocuments.filter(doc => doc.status === 'pending').length,
        processing: userDocuments.filter(doc => doc.status === 'processing').length,
        approved: userDocuments.filter(doc => doc.status === 'approved').length,
        rejected: userDocuments.filter(doc => doc.status === 'rejected').length,
        completed: userDocuments.filter(doc => doc.status === 'completed').length,
      };
      
      return {
        success: true,
        data: stats,
        message: 'Statistiques récupérées'
      };
    } catch (error) {
      return {
        success: false,
        data: {
          total: 0,
          pending: 0,
          processing: 0,
          approved: 0,
          rejected: 0,
          completed: 0
        },
        error: 'Erreur lors de la récupération des statistiques'
      };
    }
  }

  // Supprimer un document
  static async deleteDocument(documentId: string): Promise<ApiResponse<boolean>> {
    await simulateNetworkDelay();
    
    try {
      const index = this.documents.findIndex(doc => doc.id === documentId);
      
      if (index === -1) {
        return {
          success: false,
          data: false,
          error: 'Document non trouvé'
        };
      }
      
      this.documents.splice(index, 1);
      
      return {
        success: true,
        data: true,
        message: 'Document supprimé avec succès'
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: 'Erreur lors de la suppression'
      };
    }
  }

  // Marquer un document comme lu/vu
  static async markDocumentAsViewed(documentId: string): Promise<ApiResponse<boolean>> {
    await simulateNetworkDelay(200, 500);
    
    try {
      const document = this.documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return {
          success: false,
          data: false,
          error: 'Document non trouvé'
        };
      }
      
      document.updatedAt = new Date().toISOString();
      
      return {
        success: true,
        data: true,
        message: 'Document marqué comme vu'
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: 'Erreur lors de la mise à jour'
      };
    }
  }
}

// Export des services pour l'utilisation dans l'app
export const documentServices = {
  // Récupération
  getUserDocuments: (userId: string) => DocumentService.getUserDocuments(userId),
  getDocumentById: (documentId: string) => DocumentService.getDocumentById(documentId),
  getDocumentByTrackingNumber: (trackingNumber: string) => DocumentService.getDocumentByTrackingNumber(trackingNumber),
  getDocumentStats: (userId: string) => DocumentService.getDocumentStats(userId),
  
  // Upload et gestion
  uploadDocument: (payload: DocumentUploadPayload, userId: string) => DocumentService.uploadDocument(payload, userId),
  deleteDocument: (documentId: string) => DocumentService.deleteDocument(documentId),
  markAsViewed: (documentId: string) => DocumentService.markDocumentAsViewed(documentId),
};

export default documentServices;