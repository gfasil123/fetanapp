module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Load environment variables from .env file
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true
      }],
      // Transform process.env.X into string literals for direct access
      'transform-inline-environment-variables',
      // For handling polyfills
      ['@babel/plugin-transform-private-methods', { loose: true }]
    ]
  };
}; 