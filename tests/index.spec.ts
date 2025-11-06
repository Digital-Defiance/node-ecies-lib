import * as index from '../src/index';

describe('index exports', () => {
  it('should have exports', () => {
    expect(Object.keys(index).length).toBeGreaterThan(0);
  });
});
