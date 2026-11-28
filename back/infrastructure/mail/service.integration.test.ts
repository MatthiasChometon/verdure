import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createServer, type AddressInfo, type Server } from 'node:net';
import { BackgroundTasks } from '../background/service';
import { MailInfrastructureModule } from './module';
import { MailService } from './service';

// Real nodemailer, real `createTransport` built by the module from the app's
// config, talking to a minimal SMTP server on 127.0.0.1 (ephemeral port). It
// guards dependency bumps of nodemailer: what the server receives is what a
// real mail host would receive.

type Session = { commands: string[]; data: string };

const startFakeSmtp = async (
  refuseRecipient: boolean,
): Promise<{ server: Server; port: number; sessions: Session[] }> => {
  const sessions: Session[] = [];
  const server = createServer((socket) => {
    const session: Session = { commands: [], data: '' };
    sessions.push(session);
    let inData = false;
    let buffer = '';
    socket.write('220 fake.local ESMTP\r\n');
    socket.on('error', () => undefined);
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index = buffer.indexOf('\r\n');
      while (index !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            socket.write('250 2.0.0 queued\r\n');
          } else {
            session.data += `${line}\r\n`;
          }
        } else {
          session.commands.push(line);
          const verb = line.slice(0, 4).toUpperCase();
          if (verb === 'EHLO') socket.write('250 fake.local\r\n');
          else if (verb === 'RCPT' && refuseRecipient)
            socket.write('550 5.1.1 mailbox unavailable\r\n');
          else if (verb === 'DATA') {
            inData = true;
            socket.write('354 go ahead\r\n');
          } else if (verb === 'QUIT') socket.end('221 bye\r\n');
          else socket.write('250 ok\r\n');
        }
        index = buffer.indexOf('\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as AddressInfo).port, sessions };
};

const buildMail = async (
  port: number,
): Promise<{
  mail: MailService;
  background: BackgroundTasks;
  stop: () => Promise<void>;
}> => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        load: [
          () => ({
            MAIL_HOST: '127.0.0.1',
            MAIL_PORT: String(port),
            MAIL_SECURE: 'false',
            MAIL_FROM: 'Verdure <no-reply@verdure.test>',
          }),
        ],
      }),
      MailInfrastructureModule,
    ],
    providers: [BackgroundTasks],
  }).compile();
  return {
    mail: module.get(MailService),
    background: module.get(BackgroundTasks),
    stop: () => module.close(),
  };
};

describe('MailService with the real nodemailer transport', () => {
  let fake: Awaited<ReturnType<typeof startFakeSmtp>> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (fake) {
      const server = fake.server;
      fake = undefined;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('sends through the configured host with the right envelope and headers', async () => {
    fake = await startFakeSmtp(false);
    const { mail, stop } = await buildMail(fake.port);

    await mail.send({
      to: 'reader@example.test',
      subject: 'Welcome to Verdure',
      text: 'Hello there',
    });
    await stop();

    const session = fake.sessions[0];
    if (!session) throw new Error('the fake server saw no connection');
    expect(session.commands).toContainEqual(
      expect.stringMatching(/^MAIL FROM:<no-reply@verdure\.test>/i),
    );
    expect(session.commands).toContainEqual(
      expect.stringMatching(/^RCPT TO:<reader@example\.test>/i),
    );
    expect(session.data).toMatch(/^Subject: Welcome to Verdure\r$/m);
    expect(session.data).toMatch(/^From: Verdure <no-reply@verdure\.test>\r$/m);
    expect(session.data).toContain('Hello there');
  });

  it('rejects a 5xx refusal and, announced in the background, only logs it', async () => {
    fake = await startFakeSmtp(true);
    const { mail, background, stop } = await buildMail(fake.port);
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      mail.send({ to: 'gone@example.test', subject: 'Hi', text: 'Hi' }),
    ).rejects.toThrow(/550/);

    // The main write (stands for the saved report) completes before the mail.
    const saved = vi.fn();
    // Same shape as AdminAnnouncer: the write is done, the mail runs behind it.
    background.run(
      'Report r1 saved but not announced',
      () =>
        mail.send({ to: 'admin@example.test', subject: 'New', text: 'New' }),
      5_000,
    );
    saved('report saved');
    await background.idle();
    await stop();

    expect(saved).toHaveBeenCalledWith('report saved');
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining('Report r1 saved but not announced failed'),
      expect.anything(),
    );
  });
});
