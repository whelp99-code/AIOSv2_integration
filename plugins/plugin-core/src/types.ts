// Plugin Core - Types

export interface AIOSPlugin {
  /** 플러그인 고유 ID */
  id: string;
  
  /** 플러그인 이름 */
  name: string;
  
  /** 버전 */
  version: string;
  
  /** 설명 */
  description?: string;
  
  /** 의존성 */
  dependencies?: string[];
  
  /** 생명주기 훅 */
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  
  /** 기능 확장 (선택) */
  registerRoutes?(router: unknown): void;
  registerServices?(container: unknown): void;
  registerUI?(registry: unknown): void;
  registerEvents?(emitter: unknown): void;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  main: string;
}

export interface PluginRegistry {
  register(plugin: AIOSPlugin): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  getPlugin(id: string): AIOSPlugin | undefined;
  getAllPlugins(): AIOSPlugin[];
  isRegistered(id: string): boolean;
}
