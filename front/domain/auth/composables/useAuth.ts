import type { MeQuery } from '#gql';

// The signed-in user. The generated `me` type is `... | null` and its `avatarUrl` is
// nullable: both are mapped to `undefined` once, here, so the app never sees `null`.
export type AuthUser = Omit<NonNullable<MeQuery['me']>, 'avatarUrl'> & {
  avatarUrl: string | undefined;
};
type AuthStatus = 'idle' | 'pending' | 'success' | 'error';

type UseAuth = {
  user: ComputedRef<AuthUser | undefined>;
  status: Ref<AuthStatus>;
  isLoggedIn: ComputedRef<boolean>;
  isAuthReady: ComputedRef<boolean>;
  googleEnabled: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
};

const whenIdle = (callback: () => void): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: 3000 });
    return;
  }
  setTimeout(callback, 500);
};

export const useAuth = (): UseAuth => {
  const config = useRuntimeConfig();

  // 'auth-me' is shared by every consumer (header, page, dialog…); dedupe: 'defer'
  // reuses one in-flight request instead of firing it once per component.
  const { data, status, refresh } = useQuery('auth-me', () => GqlMe(), {
    server: false,
    dedupe: 'defer',
  });

  const user = computed((): AuthUser | undefined => {
    // GraphQL boundary: `me` and `avatarUrl` arrive as null when absent.
    const me = data.value?.me;
    return me ? { ...me, avatarUrl: me.avatarUrl ?? undefined } : undefined;
  });
  const isLoggedIn = computed((): boolean => user.value !== undefined);
  // Ready once the 'auth-me' query has resolved either way, so pages can tell
  // "still loading" from "loaded, logged out" and show a skeleton meanwhile.
  const isAuthReady = computed(
    (): boolean => status.value === 'success' || status.value === 'error',
  );

  // Whether the back has Google OAuth configured; the dialog hides the Google button
  // when it doesn't (e.g. a fresh dev checkout) so nobody clicks a button that can only fail.
  const { data: googleData, refresh: refreshGoogleEnabled } = useQuery(
    'google-enabled',
    () => GqlGoogleEnabled(),
    { server: false, dedupe: 'defer', default: () => ({ googleEnabled: false }) },
  );
  const googleEnabled = computed((): boolean => googleData.value?.googleEnabled ?? false);

  // Load on mount — never immediate: true; the execute is triggered by hand. The session is
  // needed to draw the page; the Google flag only to draw the sign-in dialog, so it loads in an
  // idle period instead of competing with hydration.
  onMounted(async (): Promise<void> => {
    whenIdle((): void => {
      refreshGoogleEnabled().catch((): void => undefined);
    });
    await refresh();
  });

  const loginWithGoogle = (): void => {
    window.location.href = `${config.public.apiBase}/auth/google`;
  };

  const { execute: runLogout } = useApi('/auth/logout', {
    method: 'POST',
    key: 'auth-logout',
  });
  const logout = async (): Promise<void> => {
    await runLogout();
    await refresh();
  };

  return {
    user,
    status,
    isLoggedIn,
    isAuthReady,
    googleEnabled,
    refresh,
    loginWithGoogle,
    logout,
  };
};
