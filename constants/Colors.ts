/**
 * Couleurs pour l'application d'assurance santé Adjibola Tech
 * Optimisées pour la confiance, la sérénité et la clarté médicale
 */

export const HealthColors = {
  light: {
    // Couleurs principales
    primary: '#0ea5e9',        // Bleu confiance
    primaryLight: '#38bdf8',   // Bleu clair
    primaryDark: '#0284c7',    // Bleu foncé
    
    secondary: '#22c55e',      // Vert santé
    secondaryLight: '#4ade80', // Vert clair
    secondaryDark: '#16a34a',  // Vert foncé
    
    accent: '#eab308',         // Orange/jaune attention
    
    // Couleurs médicales spécifiques
    emergency: '#ef4444',      // Rouge urgence
    warning: '#f97316',        // Orange attention
    success: '#22c55e',        // Vert succès
    info: '#0ea5e9',          // Bleu info
    
    // Arrière-plans
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    surface: '#ffffff',
    card: '#ffffff',
    
    // Textes
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textInverse: '#ffffff',
    
    // Bordures et séparateurs
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    divider: '#e2e8f0',
    
    // États
    disabled: '#94a3b8',
    placeholder: '#94a3b8',
    
    // Navigation
    tabIconDefault: '#64748b',
    tabIconSelected: '#0ea5e9',
    tint: '#0ea5e9',
    icon: '#64748b',
  },
  
  dark: {
    // Couleurs principales (plus douces en mode sombre)
    primary: '#38bdf8',        // Bleu plus doux
    primaryLight: '#7dd3fc',   // Bleu très clair
    primaryDark: '#0ea5e9',    // Bleu standard
    
    secondary: '#4ade80',      // Vert plus doux
    secondaryLight: '#86efac', // Vert clair
    secondaryDark: '#22c55e',  // Vert standard
    
    accent: '#fde047',         // Jaune plus doux
    
    // Couleurs médicales adaptées au sombre
    emergency: '#f87171',      // Rouge plus doux
    warning: '#fb923c',        // Orange plus doux
    success: '#4ade80',        // Vert plus doux
    info: '#38bdf8',          // Bleu plus doux
    
    // Arrière-plans sombres
    background: '#0f172a',     // Très sombre
    backgroundSecondary: '#1e293b', // Sombre secondaire
    surface: '#1e293b',        // Surface sombre
    card: '#334155',           // Cartes sombres
    
    // Textes pour mode sombre
    text: '#f8fafc',           // Blanc cassé
    textSecondary: '#cbd5e1',  // Gris clair
    textMuted: '#94a3b8',      // Gris moyen
    textInverse: '#1e293b',    // Sombre pour contraste
    
    // Bordures et séparateurs sombres
    border: '#475569',         // Bordure sombre
    borderLight: '#334155',    // Bordure claire
    divider: '#475569',        // Séparateur
    
    // États en mode sombre
    disabled: '#64748b',
    placeholder: '#64748b',
    
    // Navigation sombre
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#38bdf8',
    tint: '#38bdf8',
    icon: '#94a3b8',
  }
};

// Export pour compatibilité avec l'ancien système
export const Colors = HealthColors;