/**
 * Configuration API pour l'application d'assurance santé
 * Gestion centralisée des appels API avec interceptors et gestion d'erreurs
 */

// Types de base
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
  }
  
  export interface ApiError {
    message: string;
    status?: number;
    code?: string;
  }
  
  // Configuration de base
  const API_CONFIG = {
    baseURL: __DEV__ 
      ? 'http://localhost:3000/api' // Développement
      : 'https://api.adjibola-health.com', // Production
    timeout: 10000, // 10 secondes
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  };
  
  // Classe API principale
  class HealthApiService {
    private baseURL: string;
    private timeout: number;
    private defaultHeaders: Record<string, string>;
    private authToken: string | null = null;
  
    constructor(config = API_CONFIG) {
      this.baseURL = config.baseURL;
      this.timeout = config.timeout;
      this.defaultHeaders = config.headers;
    }
  
    // Setter pour le token d'authentification
    setAuthToken(token: string | null) {
      this.authToken = token;
    }
  
    // Méthode privée pour construire les headers
    private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
      const headers = { ...this.defaultHeaders };
      
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      
      if (customHeaders) {
        Object.assign(headers, customHeaders);
      }
      
      return headers;
    }
  
    // Méthode privée pour gérer les erreurs
    private handleError(error: any): ApiError {
      if (error.name === 'AbortError') {
        return { message: 'Requête annulée (timeout)', code: 'TIMEOUT' };
      }
      
      if (!error.response) {
        return { 
          message: 'Erreur de réseau - Vérifiez votre connexion internet', 
          code: 'NETWORK_ERROR' 
        };
      }
      
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      switch (status) {
        case 401:
          return { message: 'Session expirée - Veuillez vous reconnecter', status, code: 'UNAUTHORIZED' };
        case 403:
          return { message: 'Accès refusé', status, code: 'FORBIDDEN' };
        case 404:
          return { message: 'Ressource non trouvée', status, code: 'NOT_FOUND' };
        case 500:
          return { message: 'Erreur serveur - Veuillez réessayer plus tard', status, code: 'SERVER_ERROR' };
        default:
          return { message, status, code: 'UNKNOWN_ERROR' };
      }
    }
  
    // Méthode générique pour les requêtes
    private async request<T>(
      endpoint: string, 
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
  
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: this.getHeaders(options.headers as Record<string, string>),
          signal: controller.signal,
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw { 
            response: { 
              status: response.status, 
              data: await response.json().catch(() => ({}))
            } 
          };
        }
  
        const data = await response.json();
        
        return {
          success: true,
          data,
          message: 'Succès'
        };
  
      } catch (error) {
        const apiError = this.handleError(error);
        return {
          success: false,
          data: null as T,
          error: apiError.message,
          message: apiError.message
        };
      }
    }
  
    // Méthodes HTTP
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { method: 'GET' });
    }
  
    async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  
    async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  
    async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  
    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, { method: 'DELETE' });
    }
  }
  
  // Instance globale
  export const api = new HealthApiService();
  
  // Types pour l'assurance santé
  export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: 'M' | 'F';
    policyNumber?: string;
  }
  
  export interface HealthPolicy {
    id: string;
    number: string;
    type: 'basic' | 'premium' | 'family';
    status: 'active' | 'suspended' | 'expired';
    startDate: string;
    endDate: string;
    coverage: string[];
    premium: number;
    deductible: number;
  }
  
  export interface Claim {
    id: string;
    number: string;
    type: 'medical' | 'dental' | 'vision' | 'pharmacy';
    status: 'pending' | 'approved' | 'rejected' | 'paid';
    amount: number;
    submittedDate: string;
    description: string;
    documents: string[];
  }
  
  // Services spécifiques pour l'assurance santé
  export const healthServices = {
    // Authentification
    auth: {
      login: (email: string, password: string) => 
        api.post<{ user: User; token: string }>('/auth/login', { email, password }),
      
      register: (userData: Partial<User> & { password: string }) => 
        api.post<{ user: User; token: string }>('/auth/register', userData),
      
      logout: () => api.post('/auth/logout'),
      
      forgotPassword: (email: string) => 
        api.post('/auth/forgot-password', { email }),
    },
  
    // Utilisateur
    user: {
      getProfile: () => api.get<User>('/user/profile'),
      updateProfile: (data: Partial<User>) => api.put<User>('/user/profile', data),
    },
  
    // Polices d'assurance
    policies: {
      getAll: () => api.get<HealthPolicy[]>('/policies'),
      getById: (id: string) => api.get<HealthPolicy>(`/policies/${id}`),
      update: (id: string, data: Partial<HealthPolicy>) => 
        api.put<HealthPolicy>(`/policies/${id}`, data),
    },
  
    // Réclamations
    claims: {
      getAll: () => api.get<Claim[]>('/claims'),
      getById: (id: string) => api.get<Claim>(`/claims/${id}`),
      create: (data: Partial<Claim>) => api.post<Claim>('/claims', data),
      update: (id: string, data: Partial<Claim>) => 
        api.put<Claim>(`/claims/${id}`, data),
    },
  
    // Statistiques
    stats: {
      getDashboard: () => api.get<{
        totalClaims: number;
        pendingClaims: number;
        totalCoverage: number;
        remainingDeductible: number;
      }>('/stats/dashboard'),
    }
  };
  
  export default api;