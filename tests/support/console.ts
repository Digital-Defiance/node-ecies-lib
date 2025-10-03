/* Reusable console mock helpers for e2e tests */

export type ConsoleSpies = {
  log: jest.SpyInstance;
  info: jest.SpyInstance;
  warn: jest.SpyInstance;
  error: jest.SpyInstance;
  debug: jest.SpyInstance;
};

export interface WithConsoleOptions {
  mute?: boolean;
}

/**
 * Wrap a test body with console spies that are always restored.
 * By default mutes console output to keep test logs clean.
 */
export async function withConsoleMocks<T = unknown>(
  options: WithConsoleOptions,
  fn: (spies: ConsoleSpies) => Promise<T> | T,
): Promise<T> {
  const mute = options?.mute !== false; // default true
  const noop = () => undefined;
  const spies: ConsoleSpies = {
    log: jest
      .spyOn(console, 'log')
      .mockImplementation(mute ? noop : console.log),
    info: jest
      .spyOn(console, 'info')
      .mockImplementation(mute ? noop : console.info),
    warn: jest
      .spyOn(console, 'warn')
      .mockImplementation(mute ? noop : console.warn),
    error: jest
      .spyOn(console, 'error')
      .mockImplementation(mute ? noop : console.error),
    debug: jest
      .spyOn(console, 'debug')
      .mockImplementation(
        mute
          ? noop
          : (console.debug as ((...args: unknown[]) => void) | undefined) ??
              noop,
      ),
  };
  try {
    return await fn(spies);
  } finally {
    spies.log.mockRestore();
    spies.info.mockRestore();
    spies.warn.mockRestore();
    spies.error.mockRestore();
    spies.debug.mockRestore();
  }
}

/**
 * True if any call to the spy contains all provided substrings, in order-agnostic check.
 */
export function spyContains(
  spy: jest.SpyInstance,
  ...needles: string[]
): boolean {
  return spy.mock.calls.some((args) => {
    const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    return needles.every((n) => text.includes(n));
  });
}
