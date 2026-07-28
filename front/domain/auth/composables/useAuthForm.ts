type AuthView = 'login' | 'register' | 'forgot';

type UseAuthForm = {
  view: Ref<AuthView>;
  email: Ref<string>;
  password: Ref<string>;
  name: Ref<string>;
  info: Ref<string | null>;
  isSubmitting: ComputedRef<boolean>;
  isResending: ComputedRef<boolean>;
  notVerified: ComputedRef<boolean>;
  title: ComputedRef<string>;
  submitLabel: ComputedRef<string>;
  errorMessage: ComputedRef<string | null>;
  submit: () => Promise<void>;
  resend: () => Promise<void>;
  setView: (next: AuthView) => void;
  reset: () => void;
};

export const useAuthForm = (onAuthenticated: () => void): UseAuthForm => {
  const { t, locale } = useNuxtApp().$i18n;
  const { refresh } = useAuth();

  const view = ref<AuthView>('login');
  const email = ref('');
  const password = ref('');
  const name = ref('');
  const info = ref<string | null>(null);

  const endpoint = computed((): string =>
    view.value === 'register'
      ? '/auth/register'
      : view.value === 'forgot'
        ? '/auth/forgot-password'
        : '/auth/login',
  );
  const body = computed((): Record<string, string> => {
    if (view.value === 'register') {
      return {
        email: email.value,
        password: password.value,
        name: name.value,
        locale: locale.value,
      };
    }
    if (view.value === 'forgot') {
      return { email: email.value };
    }
    return { email: email.value, password: password.value };
  });

  const { error, status, execute, clear } = useApi(() => endpoint.value, {
    method: 'POST',
    body,
    key: 'auth-submit',
  });

  const { execute: runResend, status: resendStatus } = useApi('/auth/resend-verification', {
    method: 'POST',
    body: computed(() => ({ email: email.value })),
    key: 'auth-resend',
  });

  const isSubmitting = computed((): boolean => status.value === 'pending');
  const isResending = computed((): boolean => resendStatus.value === 'pending');

  // A verified-email requirement surfaces as 403 on login.
  const notVerified = computed(
    (): boolean => view.value === 'login' && error.value?.statusCode === 403,
  );

  const title = computed((): string =>
    ({
      login: t('auth.dialog.loginTitle'),
      register: t('auth.dialog.registerTitle'),
      forgot: t('auth.dialog.forgotTitle'),
    })[view.value],
  );
  const submitLabel = computed((): string =>
    ({
      login: t('auth.dialog.submitLogin'),
      register: t('auth.dialog.submitRegister'),
      forgot: t('auth.dialog.submitForgot'),
    })[view.value],
  );
  const errorMessage = computed((): string | null => {
    if (!error.value || notVerified.value) {
      return null;
    }
    if (view.value === 'register') {
      return t('auth.dialog.registerError');
    }
    if (view.value === 'forgot') {
      return t('auth.dialog.forgotError');
    }
    return t('auth.dialog.loginError');
  });

  const submit = async (): Promise<void> => {
    await execute();
    if (error.value) {
      return;
    }
    if (view.value === 'login') {
      await refresh();
      onAuthenticated();
      return;
    }
    info.value =
      view.value === 'register'
        ? t('auth.dialog.checkEmailVerify')
        : t('auth.dialog.checkEmailReset');
  };

  const resend = async (): Promise<void> => {
    await runResend();
    info.value = t('auth.dialog.checkEmailVerify');
  };

  const setView = (next: AuthView): void => {
    clear();
    view.value = next;
  };

  const reset = (): void => {
    email.value = '';
    password.value = '';
    name.value = '';
    info.value = null;
    view.value = 'login';
    clear();
  };

  return {
    view,
    email,
    password,
    name,
    info,
    isSubmitting,
    isResending,
    notVerified,
    title,
    submitLabel,
    errorMessage,
    submit,
    resend,
    setView,
    reset,
  };
};
