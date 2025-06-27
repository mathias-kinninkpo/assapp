/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Couleurs principales pour assurance santé
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Bleu principal confiance
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Vert santé/succès
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // Orange/jaune attention
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        medical: {
          blue: '#0ea5e9',    
          green: '#22c55e',   
          red: '#ef4444',     // Rouge urgence
          orange: '#f97316',  // Orange attention
          purple: '#8b5cf6',  // Violet spécialité
        },
        // Mode sombre optimisé
        dark: {
          bg: '#0f172a',      // Fond principal sombre
          surface: '#1e293b', // Surface sombre
          card: '#334155',    // Cartes sombres
          border: '#475569',  // Bordures sombres
          text: '#f8fafc',    // Texte principal
          muted: '#94a3b8',   // Texte secondaire
        },
        // Mode clair optimisé
        light: {
          bg: '#ffffff',      // Fond principal clair
          surface: '#f8fafc', // Surface claire
          card: '#ffffff',    // Cartes claires
          border: '#e2e8f0',  // Bordures claires
          text: '#1e293b',    // Texte principal
          muted: '#64748b',   // Texte secondaire
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'medical': ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'medical': '12px',
        'card': '16px',
      },
      boxShadow: {
        'medical': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}