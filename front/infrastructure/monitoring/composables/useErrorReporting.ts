import { toRaw } from 'vue';

// What was already reported, by identity. The GraphQL client throws the very
// object its error handler saw. ofetch throws a new FetchError around the
// failure, but it carries the response (or the cause) the interceptor saw: that
// is the key. So a failure reported by an interceptor and again by the code that
// caught it is one event, not two.
const reported = new WeakSet<object>();

const asObject = (value: unknown): object | undefined =>
  typeof value === 'object' && value !== null ? toRaw(value) : undefined;

const keyOf = (error: unknown): object | undefined => {
  const raw = asObject(error);
  if (raw === undefined) return undefined;

  const { response, cause } = raw as { response?: unknown; cause?: unknown };
  return asObject(response) ?? asObject(cause) ?? raw;
};

// Where an unexpected failure goes instead of vanishing: handled on screen for
// the reader, but still written once, with its context, to the console. This is
// the single sink: wiring an error tracker later changes this line only.
// `source` is the object an interceptor saw when the error it reports is one it
// made up.
export const useErrorReporting = (): {
  reportError: (context: string, error: unknown, source?: object) => void;
} => ({
  reportError: (context: string, error: unknown, source?: object): void => {
    const key = source === undefined ? keyOf(error) : asObject(source);
    if (key !== undefined) {
      if (reported.has(key)) return;
      reported.add(key);
    }

    console.error(`[${context}]`, error);
  },
});
