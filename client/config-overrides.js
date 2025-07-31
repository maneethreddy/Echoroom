const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add polyfills for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "process": require.resolve("process/browser"),
    "buffer": require.resolve("buffer"),
    "util": require.resolve("util"),
    "stream": require.resolve("stream-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "path": require.resolve("path-browserify"),
    "fs": false,
    "net": false,
    "tls": false,
    "child_process": false,
  };

  // Add plugins to provide globals
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
}; 