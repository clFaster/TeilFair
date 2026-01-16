const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure source extensions include mjs
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
