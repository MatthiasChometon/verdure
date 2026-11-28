import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import ResetPassword from './reset-password.vue';

const { useResetPasswordMock } = vi.hoisted(() => ({ useResetPasswordMock: vi.fn() }));
mockNuxtImport('useResetPassword', () => useResetPasswordMock);
// The link target is irrelevant here; the real helper needs the i18n router.
mockNuxtImport(
  'useLocalePath',
  () =>
    () =>
    (path: string): string =>
      path,
);

const renderWith = async (state: {
  hasToken?: boolean;
  done?: boolean;
  hasError?: boolean;
}): Promise<void> => {
  useResetPasswordMock.mockReturnValue({
    password: ref(''),
    hasToken: ref(state.hasToken ?? true),
    done: ref(state.done ?? false),
    hasError: ref(state.hasError ?? false),
    isSubmitting: ref(false),
    submit: vi.fn(),
  });
  await renderSuspended(ResetPassword, {
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  });
};

describe('reset-password page', () => {
  it('raises an alert when the link carries no token', async () => {
    await renderWith({ hasToken: false });

    expect(screen.getByRole('alert').textContent).toContain('Lien invalide ou expiré');
  });

  it('raises an alert when the new password is refused', async () => {
    await renderWith({ hasError: true });

    expect(screen.getByRole('alert').textContent).toContain('Une erreur est survenue');
  });

  it('announces the success politely', async () => {
    await renderWith({ done: true });

    expect(screen.getByRole('status').textContent).toContain('Mot de passe modifié');
  });

  it('shows no alert on a fresh form', async () => {
    await renderWith({});

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
