import type { MeQuery } from '#gql';

type AuthUser = MeQuery['me'];
type AuthStatus = 'idle' | 'pending' | 'success' | 'error';

type UseAuth = {
  user: ComputedRef<AuthUser>;
  status: Ref<AuthStatus>;
  isLoggedIn: ComputedRef<boolean>;
  isAuthReady: ComputedRef<boolean>;
  googleEnabled: ComputedRef<boolean>;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
};

export const useAuth = (): UseAuth => {
  const config = useRuntimeConfig();

  // 'auth-me' is shared by every consumer (header, page, dialog…); dedupe: 'defer'
  // reuses one in-flight request instead of firing it once per component.
  const { data, status, refresh } = useQuery('auth-me', () => GqlMe(), {
    server: false,
    dedupe: 'defer',
  });

  const user = computed((): AuthUser => data.value?.me ?? null);
  const isLoggedIn = computed((): boolean => user.value !== null);
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

  // Load both on mount — never immediate: true; the execute is triggered by hand.
  onMounted((): void => {
    void refresh();
    void refreshGoogleEnabled();
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
