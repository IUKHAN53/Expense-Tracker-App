// Default Expo Metro config. Extend here if we ever need custom resolvers,
// asset transformers, or SVG / SCSS handling. expo-doctor flags any custom
// metro.config that does not extend expo/metro-config, so always start here.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
