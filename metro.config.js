// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Get the default config
const config = getDefaultConfig(__dirname);

// Add support for various file extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

module.exports = config; 