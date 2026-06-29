const nativewind = require('nativewind/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // ⚠️ Obligatoire : preset NativeWind pour la compatibilité React Native
  presets: [nativewind],

  // Chemins vers tous les fichiers contenant des classes Tailwind
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // Thème personnalisé pour l'application
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dark: '#4834D4',
        },
        success: {
          DEFAULT: '#00B894',
          light: '#55EFC4',
          dark: '#00A381',
        },
        danger: {
          DEFAULT: '#E17055',
          light: '#FAB1A0',
          dark: '#C0392B',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          light: '#F8F9FA',
          dark: '#E9ECEF',
        },
      },
      fontFamily: {
        // Les polices système sont utilisées par défaut sur mobile
      },
    },
  },
  plugins: [],
};
