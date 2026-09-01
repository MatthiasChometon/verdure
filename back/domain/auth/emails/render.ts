import { convert } from 'html-to-text';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createI18n } from 'vue-i18n';
import en from './i18n/en.json';
import fr from './i18n/fr.json';
import PasswordReset from './templates/PasswordReset.vue';
import PasswordResetGoogle from './templates/PasswordResetGoogle.vue';
import Verification from './templates/Verification.vue';

const templates = {
  verification: Verification,
  passwordReset: PasswordReset,
  passwordResetGoogle: PasswordResetGoogle,
};

export type EmailName = keyof typeof templates;
export type EmailProps = { name: string; url: string };
export type RenderedEmail = { subject: string; html: string; text: string };

// Bundled by Vite (pnpm build:emails) into ./dist/render.cjs and loaded by the
// back through domain/auth/emails/index.ts.
export const renderEmail = async (
  name: EmailName,
  props: EmailProps,
  locale: string,
): Promise<RenderedEmail> => {
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: 'fr',
    messages: { fr, en },
  });

  const app = createSSRApp(templates[name], props);
  app.use(i18n);

  const body = await renderToString(app);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin: 0">${body}</body></html>`;
  const subject = i18n.global.t(`${name}.subject`);
  const text = convert(html, { wordwrap: false });

  return { subject, html, text };
};
