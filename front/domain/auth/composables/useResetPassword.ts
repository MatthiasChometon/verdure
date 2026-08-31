import type { ComputedRef, Ref } from 'vue';

type UseResetPassword = {
  password: Ref<string>;
  hasToken: ComputedRef<boolean>;
  done: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  isSubmitting: ComputedRef<boolean>;
  submit: () => Promise<void>;
};

const CONFIRMATION_PAUSE_MS = 1200;

// The reset-password form: its derived state (hasToken/done/hasError/isSubmitting
// all read useApi's status and error, none are hand-managed) and the submit action.
export const useResetPassword = (): UseResetPassword => {
  const route = useRoute();
  const { refresh } = useAuth();
  const localePath = useLocalePath();

  const token = computed((): string =>
    typeof route.query.token === 'string' ? route.query.token : '',
  );
  const password = ref('');

  const { error, status, execute } = useApi('/auth/reset-password', {
    method: 'POST',
    body: computed((): { token: string; password: string } => ({
      token: token.value,
      password: password.value,
    })),
    key: 'reset-password',
  });

  const hasToken = computed((): boolean => token.value !== '');
  const done = computed((): boolean => status.value === 'success');
  const hasError = computed((): boolean => Boolean(error.value));
  const isSubmitting = computed((): boolean => status.value === 'pending');

  const goHomeAfterConfirmation = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_PAUSE_MS));
    await navigateTo(localePath('/'));
  };

  const submit = async (): Promise<void> => {
    await execute();
    if (status.value === 'success') {
      await refresh();
      await goHomeAfterConfirmation();
    }
  };

  return { password, hasToken, done, hasError, isSubmitting, submit };
};
