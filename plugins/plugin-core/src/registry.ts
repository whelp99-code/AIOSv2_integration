// Plugin Registry - Manages plugin lifecycle

import type { AIOSPlugin, PluginRegistry as IPluginRegistry } from './types';
import { createLogger } from '@aios/shared';

const logger = createLogger('PluginRegistry');

export class PluginRegistryImpl implements IPluginRegistry {
  private plugins: Map<string, AIOSPlugin> = new Map();
  private activationOrder: string[] = [];

  async register(plugin: AIOSPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Validate dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${plugin.id} depends on ${dep}, which is not registered`);
        }
      }
    }

    // Register and activate
    this.plugins.set(plugin.id, plugin);
    this.activationOrder.push(plugin.id);

    try {
      await plugin.onActivate();
      logger.info(`Plugin activated: ${plugin.name} (${plugin.id})`);
    } catch (error) {
      // Rollback on activation failure
      this.plugins.delete(plugin.id);
      this.activationOrder = this.activationOrder.filter(id => id !== plugin.id);
      throw error;
    }
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // Check if other plugins depend on this one
    for (const [id, p] of this.plugins) {
      if (id !== pluginId && p.dependencies?.includes(pluginId)) {
        throw new Error(`Cannot unregister ${pluginId}: plugin ${id} depends on it`);
      }
    }

    try {
      await plugin.onDeactivate();
      this.plugins.delete(pluginId);
      this.activationOrder = this.activationOrder.filter(id => id !== pluginId);
      logger.info(`Plugin deactivated: ${plugin.name} (${pluginId})`);
    } catch (error) {
      logger.error(`Error deactivating plugin ${pluginId}:`, error);
      throw error;
    }
  }

  getPlugin(id: string): AIOSPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): AIOSPlugin[] {
    return this.activationOrder
      .map(id => this.plugins.get(id))
      .filter((p): p is AIOSPlugin => p !== undefined);
  }

  isRegistered(id: string): boolean {
    return this.plugins.has(id);
  }

  async deactivateAll(): Promise<void> {
    // Deactivate in reverse order
    const reversed = [...this.activationOrder].reverse();
    for (const id of reversed) {
      try {
        await this.unregister(id);
      } catch (error) {
        logger.error(`Error deactivating plugin ${id}:`, error);
      }
    }
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistryImpl();
