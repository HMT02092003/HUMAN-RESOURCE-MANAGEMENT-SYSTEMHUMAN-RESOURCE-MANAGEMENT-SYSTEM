const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.resolve.alias['@react-native-vector-icons/material-design-icons'] = '@expo/vector-icons/MaterialCommunityIcons';
  return config;
};
