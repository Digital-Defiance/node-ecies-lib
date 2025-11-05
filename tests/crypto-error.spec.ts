import { CryptoError } from '../src/core/errors/crypto-error';

describe('CryptoError', () => {
  it('should create error with code and message', () => {
    const error = new CryptoError('TEST_CODE', 'Test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CryptoError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.metadata).toBeUndefined();
  });

  it('should create error with metadata', () => {
    const metadata = { key: 'value', count: 42 };
    const error = new CryptoError('TEST_CODE', 'Test message', metadata);
    expect(error.code).toBe('TEST_CODE');
    expect(error.metadata).toEqual(metadata);
  });
});
