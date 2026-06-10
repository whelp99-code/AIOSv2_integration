// Plugin Loader - Dynamically loads plugins

import type { AIOSPlugin, PluginManifest } from './types';
import { pluginRegistry } from './registry';
import { createLogger } from '@aios/shared';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('PluginLoader');

export interface PluginLoaderOptions {
  /** Directory containing plugins */
  pluginDir: string;
  
  /** Auto-load plugins on startup */
  autoLoad?: boolean;
  
  /** Plugin IDs to exclude */
  exclude?: string[];
}

export class PluginLoader {
  private options: PluginLoaderOptions;

  constructor(options: PluginLoaderOptions) {
    this.options = {
      autoLoad: true,
      exclude: [],
      ...options
    };
  }

  /**
   * Load all plugins from the plugin directory
   */
  async loadAll(): Promise<AIOSPlugin[]> {
    const plugins: AIOSPlugin[] = [];
    
    try {
      const entries = fs.readdirSync(this.options.pluginDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (this.options.exclude?.includes(entry.name)) continue;

        const pluginPath = path.join(this.options.pluginDir, entry.name);
        const manifestPath = path.join(pluginPath, 'package.json');

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const plugin = await this.loadPlugin(pluginPath, manifest);
          
          if (plugin) {
            plugins.push(plugin);
          }
        } catch (error) {
          logger.error(`Failed to load plugin ${entry.name}:`, error);
        }
      }
    } catch (error) {
      logger.error(`Failed to read plugin directory:`, error);
    }

    return plugins;
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(pluginPath: string, manifest: PluginManifest): Promise<AIOSPlugin | null> {
    try {
      // Dynamic import
      const pluginModule = await import(path.join(pluginPath, manifest.main));
      const plugin: AIOSPlugin = pluginModule.default || pluginModule;

      // Validate plugin structure
      if (!plugin.id || !plugin.name || !plugin.version) {
        logger.error(`Invalid plugin structure in ${pluginPath}`);
        return null;
      }

      // Register if auto-load is enabled
      if (this.options.autoLoad) {
        await pluginRegistry.register(plugin);
      }

      logger.info(`Loaded plugin: ${plugin.name} (${plugin.id})`);
      return plugin;
    } catch (error) {
      logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      return null;
    }
  }

  /**
   * Load a specific plugin by ID
   */
  async loadById(pluginId: string): Promise<AIOSPlugin | null> {
    const pluginPath = path.join(this.options.pluginDir, pluginId);
    const manifestPath = path.join(pluginPath, 'package.json');

    if (!fs.existsSync(manifestPath)) {
      logger.error(`Plugin ${pluginId} not found`);
      return null;
    }

    const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return this.loadPlugin(pluginPath, manifest);
  }
}

/**
 * Create a plugin loader with default options
 */
export function createPluginLoader(options?: Partial<PluginLoaderOptions>): PluginLoader {
  return new PluginLoader({
    pluginDir: options?.pluginDir || './plugins',
    autoLoad: options?.autoLoad ?? true,
    exclude: options?.exclude || ['plugin-core']
  });
}
