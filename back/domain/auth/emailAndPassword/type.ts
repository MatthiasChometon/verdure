export type AuthTokenType = 'email_verification' | 'password_reset';

export type EmailName = 'verification' | 'passwordReset';
export type EmailProps = { name: string; url: string };
export type RenderedEmail = { subject: string; html: string; text: string };
export type RenderFn = (
  name: EmailName,
  props: EmailProps,
  locale: string,
) => Promise<RenderedEmail>;
