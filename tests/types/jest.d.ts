declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowType<E extends Error>(
        errorType: ErrorClass<E>,
        validator?: (error: E) => void,
      ): R;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorClass<E extends Error> = new (...args: any[]) => E;
