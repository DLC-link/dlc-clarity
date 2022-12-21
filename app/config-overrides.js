const webpack = require("webpack");
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');

module.exports = function override(config, env) {
    (config.resolve.fallback = {
      buffer: require.resolve("buffer"),
      util: require.resolve("util"),
      fs: require.resolve("graceful-fs"),
      path: require.resolve("path-browserify"),
      url: require.resolve("url"),
      stream: require.resolve("stream-browserify"),
      constants: require.resolve("constants-browserify"),
      zlib: require.resolve("browserify-zlib"),
      "process/browser": require.resolve("process/browser"),
      os: require.resolve("os-browserify/browser"),
    });
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      const mod = resource.request.replace(/^node:/, "");
      switch (mod) {
        case "buffer":
          resource.request = "buffer";
          break;
        case "util":
          resource.request = "util";
          break;
        case "fs":
          resource.request = "fs";
          break;
        case "path":
          resource.request = "path";
          break;
        case "stream":
          resource.request = "readable-stream";
          break;
        case "url":
          resource.request = "url";
          break;
        case "zlib":
          resource.request = "zlib";
          break;
        default:
          throw new Error(`Not found ${mod}`);
      }
    })
  );
  config.ignoreWarnings = [/Failed to parse source map/];
  config.resolve.plugins = config.resolve.plugins.filter(plugin => !(plugin instanceof ModuleScopePlugin));

  return config;
};
