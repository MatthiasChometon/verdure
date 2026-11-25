import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ref, type Ref } from 'vue';
import Dialog from './Dialog.vue';

const { useAuthMock, useApiMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useApiMock: vi.fn(),
}));

mockNuxtImport('useAuth', () => useAuthMock);
mockNuxtImport('useApi', () => useApiMock);

let refresh: ReturnType<typeof vi.fn>;
let loginWithGoogle: ReturnType<typeof vi.fn>;
let execute: Mock<() => Promise<void>>;
let apiError: Ref<{ statusCode?: number } | null>;

beforeEach(() => {
  refresh = vi.fn();
  loginWithGoogle = vi.fn();
  execute = vi.fn<() => Promise<void>>();
  apiError = ref<{ statusCode?: number } | null>(null);

  useAuthMock.mockReturnValue({
    user: ref(),
    status: ref('success'),
    googleEnabled: ref(true),
    refresh,
    loginWithGoogle,
    logout: vi.fn(),
  });
  useApiMock.mockReturnValue({
    error: apiError,
    status: ref('idle'),
    data: ref(null),
    execute,
    clear: vi.fn(),
  });
});

// The modal teleports to <body>; clear it so renders don't accumulate.
afterEach(() => {
  document.body.innerHTML = '';
});

describe('AuthDialog', () => {
  it('shows the login form with a Google alternative by default', async () => {
    await renderSuspended(Dialog, { props: { open: true } });

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Mot de passe')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeTruthy();
    expect(screen.queryByLabelText('Nom')).toBeNull();
  });

  it('reveals the name field when switching to registration', async () => {
    await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.click(screen.getByText(/Pas encore de compte/));

    expect(screen.getByLabelText('Nom')).toBeTruthy();
    expect(screen.getByLabelText('Mot de passe')).toBeTruthy();
  });

  it('drops the password field in the forgot-password view', async () => {
    await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.click(screen.getByText('Mot de passe oublié ?'));

    expect(screen.queryByLabelText('Mot de passe')).toBeNull();
    expect(screen.getByText(/réinitialiser ton mot de passe/i)).toBeTruthy();
  });

  it('starts the Google flow from the dedicated button', async () => {
    await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }));

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('hides the Google button when Google is not configured', async () => {
    useAuthMock.mockReturnValue({
      user: ref(),
      status: ref('success'),
      googleEnabled: ref(false),
      refresh,
      loginWithGoogle,
      logout: vi.fn(),
    });
    await renderSuspended(Dialog, { props: { open: true } });

    expect(screen.queryByRole('button', { name: 'Continuer avec Google' })).toBeNull();
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('submits the credentials and closes the dialog on success', async () => {
    const { emitted } = await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.update(screen.getByLabelText('Email'), 'gardener@test.dev');
    await fireEvent.update(screen.getByLabelText('Mot de passe'), 'sup3r-secret');
    await fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(execute).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(emitted()['update:open']?.at(-1)).toEqual([false]);
  });

  it('keeps the dialog open and shows an error when login fails', async () => {
    execute.mockImplementation(() => {
      apiError.value = { statusCode: 401 };
      return Promise.resolve();
    });
    const { emitted } = await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.update(screen.getByLabelText('Email'), 'gardener@test.dev');
    await fireEvent.update(screen.getByLabelText('Mot de passe'), 'wrong-password');
    await fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(emitted()['update:open']).toBeUndefined();
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContainEqual(
      expect.stringContaining('Email ou mot de passe incorrect.'),
    );
  });

  it('announces the "check your mailbox" message once the account is created', async () => {
    await renderSuspended(Dialog, { props: { open: true } });
    await fireEvent.click(screen.getByText(/Pas encore de compte/));

    await fireEvent.update(screen.getByLabelText('Nom'), 'Ada');
    await fireEvent.update(screen.getByLabelText('Email'), 'ada@test.dev');
    await fireEvent.update(screen.getByLabelText('Mot de passe'), 'sup3r-secret');
    await fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(screen.getByRole('status').textContent).toContain('Compte créé');
  });

  describe('when the address is not verified yet', () => {
    const useSeparateResendState = (resendError: Ref<{ statusCode?: number } | null>): void => {
      const idle = { status: ref('idle'), data: ref(null), clear: vi.fn() };
      useApiMock
        .mockReturnValueOnce({
          ...idle,
          error: ref({ statusCode: 403 }),
          execute: vi.fn<() => Promise<void>>(),
        })
        .mockReturnValueOnce({
          ...idle,
          error: resendError,
          execute: vi.fn<() => Promise<void>>(),
        });
    };

    it('says so when the verification mail could not be sent again', async () => {
      useSeparateResendState(ref({ statusCode: 500 }));
      await renderSuspended(Dialog, { props: { open: true } });

      await fireEvent.click(
        screen.getByRole('button', { name: 'Renvoyer le mail de vérification' }),
      );

      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContainEqual(
        expect.stringContaining("Impossible d'envoyer le mail"),
      );
      expect(screen.getByRole('status').textContent?.trim()).toBe('');
    });

    it('confirms the mail left when the resend worked', async () => {
      useSeparateResendState(ref(null));
      await renderSuspended(Dialog, { props: { open: true } });

      await fireEvent.click(
        screen.getByRole('button', { name: 'Renvoyer le mail de vérification' }),
      );

      expect(screen.getByRole('status').textContent).toContain('Compte créé');
    });
  });
});
