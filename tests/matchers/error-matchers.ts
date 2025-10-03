import type { MatcherContext } from 'expect';
import { readFileSync } from 'fs';
import type { ErrorClass } from '../types/jest';

interface MatcherError extends Error {
  matcherResult?: {
    expected: unknown;
    received: unknown;
  };
}

function isMatcherError(error: unknown): error is MatcherError {
  return error instanceof Error && 'matcherResult' in error;
}

function extractTestInfo(stackTrace: string) {
  const stackLines = stackTrace.split('\n');
  const anonymousLine = stackLines.find((line) =>
    line.includes('Object.<anonymous>'),
  );
  const match = anonymousLine?.match(/\((.+?\.spec\.ts):(\d+):(\d+)\)/);

  if (!match) {
    return { testHierarchy: ['Unknown Test'], location: '' };
  }

  const fullTestPath = match[1];
  const lineNumber = parseInt(match[2]);
  const testFile = fullTestPath.split('/').pop() || '';

  try {
    const fileContent = readFileSync(fullTestPath, 'utf8');
    const lines = fileContent.split('\n');
    const testLineContent = lines[lineNumber - 1];
    const testNameMatch = testLineContent.match(/it\(['"](.+?)['"]/);
    const testName = testNameMatch?.[1];

    const testHierarchy = ['Test'];
    if (testName) {
      testHierarchy.push(testName);
    }

    return {
      testHierarchy,
      location: ` (${testFile}:${lineNumber})`,
    };
  } catch {
    return {
      testHierarchy: ['Test'],
      location: ` (${testFile}:${lineNumber})`,
    };
  }
}

export const toThrowType = async function <E extends Error>(
  this: MatcherContext,
  received: (() => unknown | Promise<unknown>) | Promise<unknown>,
  errorType: ErrorClass<E>,
  validator?: (error: E) => void,
): Promise<jest.CustomMatcherResult> {
  const matcherName = 'toThrowType';
  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  let error: unknown;
  let pass = false;

  try {
    if (this.promise) {
      try {
        await received;
        pass = false;
      } catch (e) {
        error = e;
        if (
          error instanceof Error &&
          (error instanceof errorType || error.constructor === errorType)
        ) {
          pass = true;
          if (validator) {
            await validator(error as E);
          }
        }
      }
    } else {
      if (typeof received !== 'function') {
        throw new Error(
          this.utils.matcherHint(matcherName, undefined, undefined, options) +
            '\n\n' +
            'Received value must be a function',
        );
      }
      try {
        await (received as () => unknown | Promise<unknown>)();
        pass = false;
      } catch (e) {
        error = e;
        if (
          error instanceof Error &&
          (error instanceof errorType || error.constructor === errorType)
        ) {
          pass = true;
          if (validator) {
            await validator(error as E);
          }
        }
      }
    }
  } catch (validatorError) {
    const error =
      validatorError instanceof Error
        ? validatorError
        : new Error(String(validatorError));
    const message = error.message;
    const stack = error.stack || '';

    let diffString: string;
    if (isMatcherError(error) && error.matcherResult) {
      diffString =
        this.utils.diff(
          error.matcherResult.expected,
          error.matcherResult.received,
        ) || '';
    } else {
      diffString = this.utils.diff('Error to match assertions', message) || '';
    }

    const { testHierarchy, location } = extractTestInfo(stack);

    return {
      pass: false,
      message: () => {
        const utils = this.utils || {
          RECEIVED_COLOR: (str: string) => str,
          matcherHint: () => matcherName,
          diff: () => '',
        };
        return (
          `\n\n${utils.RECEIVED_COLOR(
            `● ${testHierarchy.join(' › ')}${location ? ` ${location}` : ''}`,
          )}\n\n` +
          utils.matcherHint(matcherName, undefined, undefined, options) +
          '\n\n' +
          diffString +
          '\n\n' +
          (stack
            ? utils.RECEIVED_COLOR(stack.split('\n').slice(1).join('\n'))
            : '')
        );
      },
    };
  }

  const testHeader =
    error instanceof Error && error.stack
      ? (() => {
          const { testHierarchy, location } = extractTestInfo(error.stack);
          const utils = this.utils || { RECEIVED_COLOR: (str: string) => str };
          return `\n\n${utils.RECEIVED_COLOR(
            `● ${testHierarchy.join(' › ')}${location}`,
          )}\n\n`;
        })()
      : '\n';

  return {
    pass,
    message: () => {
      const utils = this.utils || {
        matcherHint: () => matcherName,
        printExpected: (str: string) => str,
        printReceived: (str: string) => str,
        matcherErrorMessage: (
          _hint: string,
          expected: string,
          received: string,
        ) => `${expected}\n${received}`,
      };
      return (
        testHeader +
        utils.matcherHint(matcherName, undefined, undefined, options) +
        '\n\n' +
        (pass
          ? `Expected function not to throw ${utils.printExpected(
              errorType.name,
            )}`
          : this.promise
          ? utils.matcherErrorMessage(
              utils.matcherHint(matcherName, undefined, undefined, options),
              'Expected promise to reject',
              'Promise resolved successfully',
            )
          : utils.matcherErrorMessage(
              utils.matcherHint(matcherName, undefined, undefined, options),
              `Expected function to throw ${utils.printExpected(
                errorType.name,
              )}`,
              `Received: ${utils.printReceived(
                error instanceof Error ? error.constructor.name : typeof error,
              )}`,
            ))
      );
    },
  };
};

// Export the matcher for manual extension in test setup
// expect.extend({ toThrowType });
