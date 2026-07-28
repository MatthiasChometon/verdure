import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
let execute: ReturnType<typeof vi.fn>;
let apiError: Ref<{ statusCode?: number } | null>;

beforeEach(() => {
  refresh = vi.fn();
  loginWithGoogle = vi.fn();
  execute = vi.fn();
  apiError = ref<{ statusCode?: number } | null>(null);

  useAuthMock.mockReturnValue({
    user: ref(null),
    status: ref('success'),
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
    expect(screen.getByText(/réinitialiser votre mot de passe/i)).toBeTruthy();
  });

  it('starts the Google flow from the dedicated button', async () => {
    await renderSuspended(Dialog, { props: { open: true } });

    await fireEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }));

    expect(loginWithGoogle).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText('Email ou mot de passe incorrect.')).toBeTruthy();
  });
});
