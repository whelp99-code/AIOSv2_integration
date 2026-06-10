// Plugin Core - Main exports

export type { AIOSPlugin, PluginManifest, PluginRegistry } from './types';
export { PluginRegistryImpl, pluginRegistry } from './registry';
export { PluginLoader, createPluginLoader } from './loader';
export type { PluginLoaderOptions } from './loader';
