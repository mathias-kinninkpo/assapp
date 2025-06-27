/**
 * Store Zustand pour la gestion des documents
 * Gestion de l'état global des documents (envoi, suivi, cache)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentServices, Document, DocumentUploadPayload, DocumentStats } from './../services/documentService';

// Types pour le store
export interface DocumentUploadProgress {
  documentId: string;
  progress: number; // 0-100
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface DocumentFilter {
  type?: Document['type'];
  status?: Document['status'];
  dateFrom?: string;
  dateTo?: string;
  searchText?: string;
}

// Interface du store de documents
interface DocumentState {
  // État des documents
  documents: Document[];
  stats: DocumentStats;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  
  // Uploads en cours
  uploads: DocumentUploadProgress[];
  
  // Filtres et recherche
  currentFilter: DocumentFilter;
  searchResults: Document[];
  
  // Cache et performances
  selectedDocumentId: string | null;
  
  // Actions - Récupération des données
  fetchDocuments: (userId: string, force?: boolean) => Promise<void>;
  fetchDocumentStats: (userId: string) => Promise<void>;
  refreshDocuments: (userId: string) => Promise<void>;
  
  // Actions - Upload de documents
  uploadDocument: (payload: DocumentUploadPayload, userId: string) => Promise<{ success: boolean; documentId?: string; error?: string }>;
  updateUploadProgress: (documentId: string, progress: number, status?: DocumentUploadProgress['status']) => void;
  removeUpload: (documentId: string) => void;
  
  // Actions - Recherche et filtrage
  searchDocuments: (query: string) => void;
  filterDocuments: (filter: DocumentFilter) => void;
  clearFilters: () => void;
  
  // Actions - Suivi des documents
  trackDocument: (trackingNumber: string) => Promise<{ success: boolean; document?: Document; error?: string }>;
  getDocumentById: (documentId: string) => Document | null;
  selectDocument: (documentId: string | null) => void;
  
  // Actions - Gestion des documents
  deleteDocument: (documentId: string) => Promise<{ success: boolean; error?: string }>;
  markDocumentAsViewed: (documentId: string) => Promise<void>;
  
  // Helpers
  getDocumentsByStatus: (status: Document['status']) => Document[];
  getDocumentsByType: (type: Document['type']) => Document[];
  getRecentDocuments: (limit?: number) => Document[];
  hasActiveUploads: () => boolean;
  getUploadProgress: (documentId: string) => DocumentUploadProgress | null;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      // État initial
      documents: [],
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        completed: 0
      },
      isLoading: false,
      isRefreshing: false,
      lastUpdated: null,
      uploads: [],
      currentFilter: {},
      searchResults: [],
      selectedDocumentId: null,

      // Récupérer les documents
      fetchDocuments: async (userId: string, force = false) => {
        const state = get();
        
        // Éviter les appels multiples si pas forcé et récent
        if (!force && state.documents.length > 0 && state.lastUpdated) {
          const lastUpdate = new Date(state.lastUpdated);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
          
          if (diffMinutes < 5) { // Cache valide pendant 5 minutes
            return;
          }
        }

        set({ isLoading: true });

        try {
          const response = await documentServices.getUserDocuments(userId);
          
          if (response.success) {
            set({
              documents: response.data,
              lastUpdated: new Date().toISOString(),
              isLoading: false
            });
            
            // Fetch stats en parallèle
            get().fetchDocumentStats(userId);
          } else {
            set({ isLoading: false });
            console.error('Erreur récupération documents:', response.error);
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Erreur fetch documents:', error);
        }
      },

      // Récupérer les statistiques
      fetchDocumentStats: async (userId: string) => {
        try {
          const response = await documentServices.getDocumentStats(userId);
          
          if (response.success) {
            set({ stats: response.data });
          }
        } catch (error) {
          console.error('Erreur fetch stats:', error);
        }
      },

      // Rafraîchir les documents (pull to refresh)
      refreshDocuments: async (userId: string) => {
        set({ isRefreshing: true });
        
        try {
          await get().fetchDocuments(userId, true);
        } finally {
          set({ isRefreshing: false });
        }
      },

      // Upload d'un document
      uploadDocument: async (payload: DocumentUploadPayload, userId: string) => {
        const tempDocumentId = `temp_${Date.now()}`;
        
        // Ajouter le progrès d'upload
        set(state => ({
          uploads: [...state.uploads, {
            documentId: tempDocumentId,
            progress: 0,
            status: 'preparing'
          }]
        }));

        try {
          // Simuler la progression de préparation
          get().updateUploadProgress(tempDocumentId, 10, 'preparing');
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Démarrer l'upload
          get().updateUploadProgress(tempDocumentId, 30, 'uploading');
          
          const response = await documentServices.uploadDocument(payload, userId);
          
          if (response.success) {
            // Upload réussi
            get().updateUploadProgress(tempDocumentId, 100, 'completed');
            
            // Ajouter le nouveau document à la liste
            set(state => ({
              documents: [response.data, ...state.documents]
            }));
            
            // Mettre à jour les stats
            get().fetchDocumentStats(userId);
            
            // Nettoyer l'upload après un délai
            setTimeout(() => {
              get().removeUpload(tempDocumentId);
            }, 2000);
            
            return { 
              success: true, 
              documentId: response.data.id 
            };
          } else {
            // Erreur d'upload
            get().updateUploadProgress(tempDocumentId, 0, 'error');
            
            return { 
              success: false, 
              error: response.error || 'Erreur lors de l\'envoi' 
            };
          }
        } catch (error) {
          get().updateUploadProgress(tempDocumentId, 0, 'error');
          
          return { 
            success: false, 
            error: 'Erreur réseau lors de l\'envoi' 
          };
        }
      },

      // Mettre à jour le progrès d'upload
      updateUploadProgress: (documentId: string, progress: number, status?: DocumentUploadProgress['status']) => {
        set(state => ({
          uploads: state.uploads.map(upload =>
            upload.documentId === documentId
              ? { ...upload, progress, ...(status && { status }) }
              : upload
          )
        }));
      },

      // Supprimer un upload
      removeUpload: (documentId: string) => {
        set(state => ({
          uploads: state.uploads.filter(upload => upload.documentId !== documentId)
        }));
      },

      // Rechercher des documents
      searchDocuments: (query: string) => {
        const state = get();
        
        if (!query.trim()) {
          set({ searchResults: [], currentFilter: { ...state.currentFilter, searchText: undefined } });
          return;
        }

        const filteredDocuments = state.documents.filter(doc =>
          doc.name.toLowerCase().includes(query.toLowerCase()) ||
          doc.description?.toLowerCase().includes(query.toLowerCase()) ||
          doc.trackingNumber.toLowerCase().includes(query.toLowerCase())
        );

        set({ 
          searchResults: filteredDocuments,
          currentFilter: { ...state.currentFilter, searchText: query }
        });
      },

      // Filtrer les documents
      filterDocuments: (filter: DocumentFilter) => {
        set({ currentFilter: filter });
        
        const state = get();
        let filteredDocuments = [...state.documents];

        // Filtrer par type
        if (filter.type) {
          filteredDocuments = filteredDocuments.filter(doc => doc.type === filter.type);
        }

        // Filtrer par statut
        if (filter.status) {
          filteredDocuments = filteredDocuments.filter(doc => doc.status === filter.status);
        }

        // Filtrer par date
        if (filter.dateFrom) {
          filteredDocuments = filteredDocuments.filter(doc => 
            new Date(doc.submittedAt) >= new Date(filter.dateFrom!)
          );
        }

        if (filter.dateTo) {
          filteredDocuments = filteredDocuments.filter(doc => 
            new Date(doc.submittedAt) <= new Date(filter.dateTo!)
          );
        }

        set({ searchResults: filteredDocuments });
      },

      // Effacer les filtres
      clearFilters: () => {
        set({ 
          currentFilter: {},
          searchResults: []
        });
      },

      // Suivre un document par numéro
      trackDocument: async (trackingNumber: string) => {
        try {
          const response = await documentServices.getDocumentByTrackingNumber(trackingNumber);
          
          if (response.success) {
            return { 
              success: true, 
              document: response.data 
            };
          } else {
            return { 
              success: false, 
              error: response.error || 'Document non trouvé' 
            };
          }
        } catch (error) {
          return { 
            success: false, 
            error: 'Erreur lors de la recherche' 
          };
        }
      },

      // Obtenir un document par ID
      getDocumentById: (documentId: string) => {
        const state = get();
        return state.documents.find(doc => doc.id === documentId) || null;
      },

      // Sélectionner un document
      selectDocument: (documentId: string | null) => {
        set({ selectedDocumentId: documentId });
      },

      // Supprimer un document
      deleteDocument: async (documentId: string) => {
        try {
          const response = await documentServices.deleteDocument(documentId);
          
          if (response.success) {
            // Retirer de la liste locale
            set(state => ({
              documents: state.documents.filter(doc => doc.id !== documentId),
              selectedDocumentId: state.selectedDocumentId === documentId ? null : state.selectedDocumentId
            }));
            
            return { success: true };
          } else {
            return { 
              success: false, 
              error: response.error || 'Erreur lors de la suppression' 
            };
          }
        } catch (error) {
          return { 
            success: false, 
            error: 'Erreur réseau lors de la suppression' 
          };
        }
      },

      // Marquer un document comme vu
      markDocumentAsViewed: async (documentId: string) => {
        try {
          await documentServices.markAsViewed(documentId);
          
          // Mettre à jour localement
          set(state => ({
            documents: state.documents.map(doc =>
              doc.id === documentId
                ? { ...doc, updatedAt: new Date().toISOString() }
                : doc
            )
          }));
        } catch (error) {
          console.error('Erreur mark as viewed:', error);
        }
      },

      // Helpers
      getDocumentsByStatus: (status: Document['status']) => {
        const state = get();
        return state.documents.filter(doc => doc.status === status);
      },

      getDocumentsByType: (type: Document['type']) => {
        const state = get();
        return state.documents.filter(doc => doc.type === type);
      },

      getRecentDocuments: (limit = 5) => {
        const state = get();
        return state.documents
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          .slice(0, limit);
      },

      hasActiveUploads: () => {
        const state = get();
        return state.uploads.some(upload => 
          upload.status === 'preparing' || 
          upload.status === 'uploading' || 
          upload.status === 'processing'
        );
      },

      getUploadProgress: (documentId: string) => {
        const state = get();
        return state.uploads.find(upload => upload.documentId === documentId) || null;
      },
    }),
    {
      name: 'documents-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persister seulement les données importantes (pas les uploads temporaires)
      partialize: (state) => ({
        documents: state.documents,
        stats: state.stats,
        lastUpdated: state.lastUpdated,
        currentFilter: state.currentFilter,
        selectedDocumentId: state.selectedDocumentId,
      }),
    }
  )
);

// Hooks utilitaires pour faciliter l'utilisation
export const useDocuments = () => {
  const documents = useDocumentStore(state => state.documents);
  const isLoading = useDocumentStore(state => state.isLoading);
  const stats = useDocumentStore(state => state.stats);
  return { documents, isLoading, stats };
};

export const useDocumentUpload = () => {
  const uploads = useDocumentStore(state => state.uploads);
  const uploadDocument = useDocumentStore(state => state.uploadDocument);
  const hasActiveUploads = useDocumentStore(state => state.hasActiveUploads);
  return { uploads, uploadDocument, hasActiveUploads: hasActiveUploads() };
};

export const useDocumentSearch = () => {
  const searchResults = useDocumentStore(state => state.searchResults);
  const currentFilter = useDocumentStore(state => state.currentFilter);
  const searchDocuments = useDocumentStore(state => state.searchDocuments);
  const filterDocuments = useDocumentStore(state => state.filterDocuments);
  const clearFilters = useDocumentStore(state => state.clearFilters);
  
  return {
    searchResults,
    currentFilter,
    searchDocuments,
    filterDocuments,
    clearFilters
  };
};