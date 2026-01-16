const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Get the project root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Support for monorepo packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure source extensions include mjs
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
