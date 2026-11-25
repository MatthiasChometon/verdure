type ApiClient = ReturnType<typeof $fetch.create>;

declare module '#app' {
  // An interface because declaration merging is how Nuxt types its hooks.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface RuntimeNuxtHooks {
    // Raised by the API and GraphQL clients when the server says the session
    // ended. Whoever owns the session decides what that means for the page.
    'session:expired': () => void | Promise<void>;
  }
}

export default defineNuxtPlugin((nuxtApp): { provide: { api: ApiClient } } => {
  const config = useRuntimeConfig();
  const { reportError } = useErrorReporting();

  const interceptors = createApiInterceptors({
    report: (context, error, source): void => reportError(context, error, source),
    expireSession: (): void => announceSessionExpiry(nuxtApp, reportError),
  });

  // One place decides the base URL, that the session cookie travels with every
  // call, and what happens when a call fails.
  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    // The retry ofetch makes by itself (a read, once) waits what `Retry-After`
    // asks, else a jittered moment: every tab that failed together would
    // otherwise come back in the same instant.
    // Only what the project calls transient: a 500 answers the same again.
    retryStatusCodes: [...TRANSIENT_STATUS_CODES],
    retryDelay: ({ response }): number =>
      apiRetryDelay(response?.headers.get('retry-after') ?? null),
    ...interceptors,
  });

  return { provide: { api } };
});
