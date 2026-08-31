import type { ComputedRef } from 'vue';

type VerifyState = 'pending' | 'success' | 'error';

const CONFIRMATION_PAUSE_MS = 1500;

// Verifies the email behind the URL token on mount, exposing a single derived
// state for the page. The state is NOT hand-managed: it reads useApi's status
// and error, plus whether a token is present.
export const useEmailVerification = (): { state: ComputedRef<VerifyState> } => {
  const route = useRoute();
  const { refresh } = useAuth();
  const localePath = useLocalePath();

  const token = computed((): string =>
    typeof route.query.token === 'string' ? route.query.token : '',
  );

  const { error, status, execute } = useApi('/auth/verify-email', {
    method: 'POST',
    body: computed((): { token: string } => ({ token: token.value })),
    key: 'verify-email',
  });

  const state = computed((): VerifyState => {
    if (token.value === '' || error.value) {
      return 'error';
    }
    return status.value === 'success' ? 'success' : 'pending';
  });

  const goHomeAfterConfirmation = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_PAUSE_MS));
    await navigateTo(localePath('/'));
  };

  const verify = async (): Promise<void> => {
    if (token.value === '') {
      return;
    }
    await execute();
    if (status.value === 'success') {
      await refresh();
      await goHomeAfterConfirmation();
    }
  };

  onMounted(verify);

  return { state };
};
