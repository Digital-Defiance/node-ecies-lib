import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';
import {
  getNodeRuntimeConfiguration,
  registerNodeRuntimeConfiguration,
} from '../src/constants';

describe('Node ECIES Runtime Configuration Registry', () => {
  let originalConfig: ReturnType<typeof getNodeRuntimeConfiguration>;

  beforeEach(() => {
    // Save original configuration
    originalConfig = getNodeRuntimeConfiguration();
  });

  afterEach(() => {
    // Restore original configuration to prevent test interference
    registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
  });

  it('should return the default configuration', () => {
    const config = getNodeRuntimeConfiguration();
    expect(config).toBeDefined();
    expect(config.PBKDF2).toBeDefined();
    expect(config.PBKDF2.ALGORITHM).toBe('sha256');
  });

  it('should allow registering and retrieving a custom configuration', () => {
    registerNodeRuntimeConfiguration({ PBKDF2: { ALGORITHM: 'SHA-512' } });
    const customConfig = getNodeRuntimeConfiguration();
    expect(customConfig.PBKDF2.ALGORITHM).toBe('SHA-512');
  });

  it('should deeply freeze the configuration objects', () => {
    const config = getNodeRuntimeConfiguration();
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.PBKDF2)).toBe(true);
    expect(Object.isFrozen(config.CHECKSUM)).toBe(true);
  });
});
