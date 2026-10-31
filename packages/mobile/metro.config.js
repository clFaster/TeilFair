const { getDefaultConfig } = require('expo/metro-config');

// Expo detects pnpm workspaces and configures monorepo resolution automatically.
module.exports = getDefaultConfig(__dirname);
