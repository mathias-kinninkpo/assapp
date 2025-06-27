import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthServices, HealthPolicy, Claim } from '@/services/api';

// Types pour les données de santé
interface HealthState {
  // État des polices
  policies: HealthPolicy[];
  activePolicyId: string | null;
  
  // État des réclamations
  claims: Claim[];
  pendingClaimsCount: number;
  
  // État des statistiques
  dashboardStats: {
    totalClaims: number;
    pendingClaims: number;
    totalCoverage: number;
    remainingDeductible: number;
  } | null;
  
  // État de chargement
  isLoadingPolicies: boolean;
  isLoadingClaims: boolean;
  isLoadingStats: boolean;
  
  // Actions - Polices
  loadPolicies: () => Promise<void>;
  setActivePolicy: (policyId: string) => void;
  getActivePolicy: () => HealthPolicy | null;
  
  // Actions - Réclamations
  loadClaims: () => Promise<void>;
  createClaim: (claimData: Partial<Claim>) => Promise<{ success: boolean; error?: string }>;
  updateClaim: (claimId: string, claimData: Partial<Claim>) => Promise<{ success: boolean; error?: string }>;
  
  // Actions - Statistiques
  loadDashboardStats: () => Promise<void>;
  
  // Actions - Nettoyage
  clearData: () => void;
  
  // Helpers
  getCoveragePercentage: () => number;
  getClaimsByStatus: (status: Claim['status']) => Claim[];
  getTotalClaimsAmount: () => number;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      // État initial
      policies: [],
      activePolicyId: null,
      claims: [],
      pendingClaimsCount: 0,
      dashboardStats: null,
      isLoadingPolicies: false,
      isLoadingClaims: false,
      isLoadingStats: false,

      // Charger les polices
      loadPolicies: async () => {
        set({ isLoadingPolicies: true });
        
        try {
          const response = await healthServices.policies.getAll();
          
          if (response.success && response.data) {
            const policies = response.data;
            const activePolicy = policies.find(p => p.status === 'active');
            
            set({
              policies,
              activePolicyId: activePolicy?.id || null,
              isLoadingPolicies: false,
            });
          } else {
            // Données de fallback pour le développement
            const mockPolicies: HealthPolicy[] = [
              {
                id: '1',
                number: 'POL-2024-001',
                type: 'premium',
                status: 'active',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                coverage: ['médecine générale', 'spécialistes', 'hospitalisation', 'pharmacie'],
                premium: 120,
                deductible: 50,
              }
            ];
            
            set({
              policies: mockPolicies,
              activePolicyId: mockPolicies[0].id,
              isLoadingPolicies: false,
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des polices:', error);
          set({ isLoadingPolicies: false });
        }
      },

      // Définir la police active
      setActivePolicy: (policyId: string) => {
        set({ activePolicyId: policyId });
      },

      // Obtenir la police active
      getActivePolicy: () => {
        const { policies, activePolicyId } = get();
        return policies.find(p => p.id === activePolicyId) || null;
      },

      // Charger les réclamations
      loadClaims: async () => {
        set({ isLoadingClaims: true });
        
        try {
          const response = await healthServices.claims.getAll();
          
          if (response.success && response.data) {
            const claims = response.data;
            const pendingCount = claims.filter(c => c.status === 'pending').length;
            
            set({
              claims,
              pendingClaimsCount: pendingCount,
              isLoadingClaims: false,
            });
          } else {
            // Données de fallback pour le développement
            const mockClaims: Claim[] = [
              {
                id: '1',
                number: 'CLM-2024-001',
                type: 'medical',
                status: 'approved',
                amount: 85.50,
                submittedDate: '2024-01-15',
                description: 'Consultation médecin généraliste',
                documents: [],
              },
              {
                id: '2',
                number: 'CLM-2024-002',
                type: 'pharmacy',
                status: 'pending',
                amount: 23.80,
                submittedDate: '2024-01-20',
                description: 'Médicaments sur ordonnance',
                documents: [],
              }
            ];
            
            set({
              claims: mockClaims,
              pendingClaimsCount: 1,
              isLoadingClaims: false,
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des réclamations:', error);
          set({ isLoadingClaims: false });
        }
      },

      // Créer une réclamation
      createClaim: async (claimData) => {
        try {
          const response = await healthServices.claims.create(claimData);
          
          if (response.success && response.data) {
            const newClaim = response.data;
            const currentClaims = get().claims;
            
            set({
              claims: [newClaim, ...currentClaims],
              pendingClaimsCount: get().pendingClaimsCount + 1,
            });
            
            return { success: true };
          } else {
            return { 
              success: false, 
              error: response.error || 'Erreur lors de la création' 
            };
          }
        } catch (error) {
          return { 
            success: false, 
            error: 'Erreur réseau - Vérifiez votre connexion' 
          };
        }
      },

      // Mettre à jour une réclamation
      updateClaim: async (claimId, claimData) => {
        try {
          const response = await healthServices.claims.update(claimId, claimData);
          
          if (response.success && response.data) {
            const updatedClaim = response.data;
            const currentClaims = get().claims;
            
            const newClaims = currentClaims.map(claim =>
              claim.id === claimId ? updatedClaim : claim
            );
            
            const pendingCount = newClaims.filter(c => c.status === 'pending').length;
            
            set({
              claims: newClaims,
              pendingClaimsCount: pendingCount,
            });
            
            return { success: true };
          } else {
            return { 
              success: false, 
              error: response.error || 'Erreur lors de la mise à jour' 
            };
          }
        } catch (error) {
          return { 
            success: false, 
            error: 'Erreur réseau - Vérifiez votre connexion' 
          };
        }
      },

      // Charger les statistiques du tableau de bord
      loadDashboardStats: async () => {
        set({ isLoadingStats: true });
        
        try {
          const response = await healthServices.stats.getDashboard();
          
          if (response.success && response.data) {
            set({
              dashboardStats: response.data,
              isLoadingStats: false,
            });
          } else {
            // Données de fallback
            set({
              dashboardStats: {
                totalClaims: 12,
                pendingClaims: 2,
                totalCoverage: 1500,
                remainingDeductible: 25,
              },
              isLoadingStats: false,
            });
          }
        } catch (error) {
          console.error('Erreur lors du chargement des stats:', error);
          set({ isLoadingStats: false });
        }
      },

      // Nettoyer toutes les données (déconnexion)
      clearData: () => {
        set({
          policies: [],
          activePolicyId: null,
          claims: [],
          pendingClaimsCount: 0,
          dashboardStats: null,
          isLoadingPolicies: false,
          isLoadingClaims: false,
          isLoadingStats: false,
        });
      },

      // Helper: Calculer le pourcentage de couverture restante
      getCoveragePercentage: () => {
        const stats = get().dashboardStats;
        if (!stats || stats.totalCoverage === 0) return 0;
        
        const used = stats.totalClaims;
        const total = stats.totalCoverage;
        const remaining = Math.max(0, total - used);
        
        return Math.round((remaining / total) * 100);
      },

      // Helper: Obtenir les réclamations par statut
      getClaimsByStatus: (status: Claim['status']) => {
        return get().claims.filter(claim => claim.status === status);
      },

      // Helper: Calculer le montant total des réclamations
      getTotalClaimsAmount: () => {
        return get().claims.reduce((total, claim) => total + claim.amount, 0);
      },
    }),
    {
      name: 'health-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persister seulement les données importantes (pas les états de chargement)
      partialize: (state) => ({
        policies: state.policies,
        activePolicyId: state.activePolicyId,
        claims: state.claims,
        pendingClaimsCount: state.pendingClaimsCount,
        dashboardStats: state.dashboardStats,
      }),
    }
  )
);