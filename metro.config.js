// Configuration Metro pour NativeWind (requis pour Expo SDK 50+)
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Intègre TailwindCSS dans le processus de build Metro
module.exports = withNativeWind(config, { input: './global.css' });
