import type { MeQuery } from '#gql';

type AuthUser = MeQuery['me'];
type AuthStatus = 'idle' | 'pending' | 'success' | 'error';

type UseAuth = {
  user: ComputedRef<AuthUser>;
  status: Ref<AuthStatus>;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
};

export const useAuth = (): UseAuth => {
  const config = useRuntimeConfig();

  // 'auth-me' is shared by every consumer (header, page, dialog…). dedupe:
  // 'defer' makes their concurrent mounts reuse the single in-flight request
  // instead of the default 'cancel', which would re-fire it once per component.
  const { data, status, refresh } = useQuery('auth-me', () => GqlMe(), {
    server: false,
    dedupe: 'defer',
    immediate: true,
  });

  const user = computed((): AuthUser => data.value?.me ?? null);

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
    refresh,
    loginWithGoogle,
    logout,
  };
};
