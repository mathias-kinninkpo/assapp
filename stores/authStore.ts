import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types pour l'utilisateur
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
  policyNumber: string;
}

// Interface du store d'authentification
interface AuthState {
  // État
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  firstConnection: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  
  // Helpers
  getFullName: () => string;
  getUserInitials: () => string;
}

// Données simulées pour les utilisateurs existants
const MOCK_USERS: Array<{
  policyNumber: string;
  phone: string;
  email?: string;
  password: string;
  user: User;
}> = [
  {
    policyNumber: 'POL-2024-001',
    phone: '0123456789',
    email: 'jean.adjibola@email.com',
    password: 'test123',
    user: {
      id: '1',
      firstName: 'Dr. Jean',
      lastName: 'Adjibola',
      email: 'jean.adjibola@email.com',
      phone: '0123456789',
      dateOfBirth: '1985-03-15',
      gender: 'M',
      policyNumber: 'POL-2024-001',
    }
  },
  {
    policyNumber: 'POL-2024-002',
    phone: '0987654321',
    email: 'marie.kouassi@email.com',
    password: 'demo456',
    user: {
      id: '2',
      firstName: 'Marie',
      lastName: 'Kouassi',
      email: 'marie.kouassi@email.com',
      phone: '0987654321',
      dateOfBirth: '1990-07-22',
      gender: 'F',
      policyNumber: 'POL-2024-002',
    }
  },
  {
    policyNumber: 'POL-2024-003',
    phone: '+33612345678',
    email: 'ahmed.traore@email.com',
    password: 'adjibola2024',
    user: {
      id: '3',
      firstName: 'Ahmed',
      lastName: 'Traoré',
      email: 'ahmed.traore@email.com',
      phone: '+33612345678',
      dateOfBirth: '1988-11-10',
      gender: 'M',
      policyNumber: 'POL-2024-003',
    }
  }
];

// Données simulées pour les nouveaux utilisateurs (première connexion)
const MOCK_NEW_USERS: Array<{
  policyNumber: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'M' | 'F';
}> = [
  {
    policyNumber: 'POL-2024-004',
    phone: '0555123456',
    email: 'sophie.bernard@email.com',
    firstName: 'Sophie',
    lastName: 'Bernard',
    dateOfBirth: '1992-05-18',
    gender: 'F',
  },
  {
    policyNumber: 'POL-2024-005',
    phone: '+33687654321',
    email: 'karim.diallo@email.com',
    firstName: 'Karim',
    lastName: 'Diallo',
    dateOfBirth: '1987-09-03',
    gender: 'M',
  },
  {
    policyNumber: 'POL-2024-006',
    phone: '0123987654',
    email: 'fatou.sow@email.com',
    firstName: 'Fatou',
    lastName: 'Sow',
    dateOfBirth: '1995-12-12',
    gender: 'F',
  }
];

// Fonction de simulation d'API pour la connexion
const simulateApiCall = async (identifier: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  // Simulation délai réseau
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Nettoyage de l'identifiant
  const cleanIdentifier = identifier.trim();
  
  // Recherche de l'utilisateur
  const mockUser = MOCK_USERS.find(u => 
    u.policyNumber === cleanIdentifier || 
    u.phone === cleanIdentifier ||
    u.email === cleanIdentifier
  );

  if (!mockUser) {
    return { 
      success: false, 
      error: 'Numéro de police, téléphone ou email non trouvé' 
    };
  }

  if (mockUser.password !== password) {
    return { 
      success: false, 
      error: 'Mot de passe incorrect' 
    };
  }

  return { 
    success: true, 
    user: mockUser.user 
  };
};

// Fonction de simulation d'API pour la première connexion
const simulateFirstConnectionApiCall = async (identifier: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  // Simulation délai réseau
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Nettoyage de l'identifiant
  const cleanIdentifier = identifier.trim();
  
  // Vérifier si l'utilisateur existe déjà dans les comptes actifs
  const existingUser = MOCK_USERS.find(u => 
    u.policyNumber === cleanIdentifier || 
    u.phone === cleanIdentifier ||
    u.email === cleanIdentifier
  );

  if (existingUser) {
    return { 
      success: false, 
      error: 'Ce compte existe déjà. Utilisez la connexion normale.' 
    };
  }

  // Rechercher dans les nouveaux utilisateurs
  const newUserData = MOCK_NEW_USERS.find(u => 
    u.policyNumber === cleanIdentifier || 
    u.phone === cleanIdentifier ||
    u.email === cleanIdentifier
  );

  if (!newUserData) {
    return { 
      success: false, 
      error: 'Aucun dossier trouvé avec ces informations. Vérifiez vos données ou contactez le support.' 
    };
  }

  // Créer le nouvel utilisateur avec le mot de passe fourni
  const newUser: User = {
    id: Date.now().toString(), // Simulation d'un ID unique
    firstName: newUserData.firstName,
    lastName: newUserData.lastName,
    email: newUserData.email,
    phone: newUserData.phone,
    dateOfBirth: newUserData.dateOfBirth,
    gender: newUserData.gender,
    policyNumber: newUserData.policyNumber,
  };

  // Dans une vraie app, on sauvegarderait en base de données
  // Ici on simule en ajoutant à notre mock
  MOCK_USERS.push({
    policyNumber: newUserData.policyNumber,
    phone: newUserData.phone,
    email: newUserData.email,
    password: password,
    user: newUser
  });

  return { 
    success: true, 
    user: newUser 
  };
};

// Store Zustand
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Action de connexion
      login: async (identifier: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await simulateApiCall(identifier, password);
          
          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            });
            
            return { success: true };
          } else {
            set({ isLoading: false });
            return { 
              success: false, 
              error: response.error || 'Erreur de connexion' 
            };
          }
        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: 'Erreur réseau - Vérifiez votre connexion' 
          };
        }
      },

      // Action de première connexion
      firstConnection: async (identifier: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await simulateFirstConnectionApiCall(identifier, password);
          
          if (response.success && response.user) {
            set({ isLoading: false });
            return { success: true };
          } else {
            set({ isLoading: false });
            return { 
              success: false, 
              error: response.error || 'Erreur lors de la création du compte' 
            };
          }
        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: 'Erreur réseau - Vérifiez votre connexion' 
          };
        }
      },

      // Action de déconnexion
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Setter pour isLoading
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Helper pour obtenir le nom complet
      getFullName: () => {
        const state = get();
        const user = state.user;
        if (!user) return 'Utilisateur';
        return `${user.firstName} ${user.lastName}`.trim();
      },

      // Helper pour obtenir les initiales
      getUserInitials: () => {
        const state = get();
        const user = state.user;
        if (!user) return 'U';
        const firstInitial = user.firstName.charAt(0).toUpperCase();
        const lastInitial = user.lastName.charAt(0).toUpperCase();
        return `${firstInitial}${lastInitial}`;
      },
    }),
    {
      name: 'auth-storage', // Nom pour AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Persister seulement les données importantes
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper pour vérifier si l'utilisateur est connecté
export const useIsAuthenticated = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated;
};

// Helper pour obtenir l'utilisateur actuel
export const useCurrentUser = () => {
  const user = useAuthStore(state => state.user);
  return user;
};