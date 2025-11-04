import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { PluginI18nEngine, CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { NodeEciesComponentId, createNodeEciesComponentRegistration } from './ecies-i18n-factory';

let _nodeEciesI18nEngine: PluginI18nEngine<CoreLanguageCode> | null = null;
let _componentRegistered = false;

export function getNodeEciesI18nEngine(): PluginI18nEngine<CoreLanguageCode> {
  if (!_nodeEciesI18nEngine) {
    // Get base ecies engine (uses 'default' key)
    const baseEngine = getEciesI18nEngine();
    
    // Register node-ecies component if not already registered
    if (!_componentRegistered) {
      const registration = createNodeEciesComponentRegistration();
      baseEngine.registerComponent(registration);
      _componentRegistered = true;
    }
    
    _nodeEciesI18nEngine = baseEngine as PluginI18nEngine<CoreLanguageCode>;
  }
  return _nodeEciesI18nEngine;
}

export function resetNodeEciesI18nEngine(): void {
  _nodeEciesI18nEngine = null;
  _componentRegistered = false;
}
