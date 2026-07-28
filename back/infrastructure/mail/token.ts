import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export type MailTransport = Transporter<SMTPTransport.SentMessageInfo>;
