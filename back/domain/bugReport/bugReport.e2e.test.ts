import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, BugReportTestHarness, READER_EMAIL } from './harness';

const REPORT_IMAGE = `
  mutation ($input: ReportBugInput!) {
    reportBug(input: $input) { imageUrl }
  }
`;

const REPORT = `
  mutation ($input: ReportBugInput!) {
    reportBug(input: $input) {
      id
      message
      status
      reportedBy
      context { page viewport }
    }
  }
`;
const LIST = `query { bugReports { id message status reportedBy createdAt } }`;
const BLOCK = `mutation ($input: BlockReporterInput!) { blockReporter(input: $input) }`;
const SET_STATUS = `mutation ($input: BugStatusInput!) { setBugStatus(input: $input) { id status } }`;

const reportOf = (
  page: string,
  message: string,
  severity = 'ANNOYING',
  imageKey?: string,
): Record<string, unknown> => ({
  input: {
    severity,
    message,
    context: {
      page,
      userAgent: 'Mozilla/5.0 (probe)',
      viewport: '390x844',
      locale: 'fr',
    },
    ...(imageKey === undefined ? {} : { imageKey }),
  },
});

describe('bug reports (e2e)', () => {
  const harness = new BugReportTestHarness();

  beforeAll(async () => {
    await harness.init();
  });
  afterAll(async () => {
    await harness.close();
  });
  beforeEach(async () => {
    await harness.reset();
  });

  it('takes a description and remembers what the browser knew', async () => {
    const data = await harness.graphql<{
      reportBug: {
        message: string;
        reportedBy: string;
        context: { page: string };
      };
    }>(
      REPORT,
      harness.readerToken,
      reportOf('/plants', 'Le bouton d’arrosage ne fait rien.'),
    );

    expect(data.reportBug.context.page).toBe('/plants');
    expect(data.reportBug.message).toContain('arrosage');
    expect(data.reportBug.reportedBy).toBe(READER_EMAIL);
  });

  it('keeps an attached screenshot and hands it back as a served URL', async () => {
    const imageKey = randomUUID();
    const data = await harness.graphql<{ reportBug: { imageUrl: string | null } }>(
      REPORT_IMAGE,
      harness.readerToken,
      reportOf('/plants', 'Ma plante s’affiche à l’envers.', 'ANNOYING', imageKey),
    );

    expect(data.reportBug.imageUrl).toContain(`/images/${imageKey}`);
  });

  it('has no image URL when nothing was attached', async () => {
    const data = await harness.graphql<{ reportBug: { imageUrl: string | null } }>(
      REPORT_IMAGE,
      harness.readerToken,
      reportOf('/plants', 'Un souci sans capture d’écran cette fois.'),
    );

    expect(data.reportBug.imageUrl).toBeNull();
  });

  it('tells the administrator, without waiting to be asked', async () => {
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/', 'La connexion Google échoue.'),
    );

    const announcement = harness.mail.messages.at(-1);
    expect(harness.mail.messages).toHaveLength(1);
    expect(announcement?.to).toBe(ADMIN_EMAIL);
    expect(announcement?.subject).toContain('Gênant');
    expect(announcement?.text).toContain('échoue');
  });

  it('turns away somebody who is not signed in', async () => {
    const body = await harness.request(
      REPORT,
      reportOf('/', 'Tout est cassé partout.'),
    );
    expect(body.errors?.[0]).toBeDefined();
  });

  it('refuses a description too short to act on', async () => {
    const body = await harness.request(
      REPORT,
      reportOf('/', 'bug'),
      harness.readerToken,
    );
    expect(body.errors?.[0]).toBeDefined();
  });

  it('stops announcing after three in an hour, and keeps every report', async () => {
    for (let filed = 0; filed < 5; filed += 1) {
      await harness.graphql(
        REPORT,
        harness.readerToken,
        reportOf('/', `Un problème, numéro ${filed}.`),
      );
    }

    // Three notices, five reports: what is spammable is attention, not storage.
    expect(harness.mail.messages).toHaveLength(3);
    const list = await harness.graphql<{ bugReports: unknown[] }>(
      LIST,
      harness.adminToken,
    );
    expect(list.bugReports).toHaveLength(5);
  });

  it('says in the notice how many that account has filed today', async () => {
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Le premier de la soirée.'),
    );
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Le deuxième de la soirée.'),
    );

    expect(harness.mail.messages.at(-1)?.text).toContain('24 h : 2');
  });

  it('refuses a report from an account that has been stopped, then lets it back', async () => {
    const created = await harness.graphql<{ reportBug: { id: string } }>(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Un premier signalement, avant le blocage.'),
    );
    const args = { input: { reportId: created.reportBug.id, blocked: true } };

    await harness.graphql(BLOCK, harness.adminToken, args);
    const refused = await harness.request(
      REPORT,
      reportOf('/', 'Et un deuxième, après.'),
      harness.readerToken,
    );
    expect(refused.errors?.[0]).toBeDefined();

    await harness.graphql(BLOCK, harness.adminToken, {
      input: { ...args.input, blocked: false },
    });
    const again = await harness.request(
      REPORT,
      reportOf('/', 'Un signalement après le déblocage.'),
      harness.readerToken,
    );
    expect(again.errors).toBeUndefined();
  });

  it('keeps the block button out of a reader’s hands', async () => {
    const created = await harness.graphql<{ reportBug: { id: string } }>(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Un signalement tout à fait ordinaire.'),
    );

    const body = await harness.request(
      BLOCK,
      { input: { reportId: created.reportBug.id, blocked: true } },
      harness.readerToken,
    );
    expect(body.errors?.[0]).toBeDefined();
  });

  it('tells the front whether to offer the reports at all', async () => {
    const reader = await harness.graphql<{ amIAdmin: boolean }>(
      'query { amIAdmin }',
      harness.readerToken,
    );
    const admin = await harness.graphql<{ amIAdmin: boolean }>(
      'query { amIAdmin }',
      harness.adminToken,
    );

    expect(reader.amIAdmin).toBe(false);
    expect(admin.amIAdmin).toBe(true);
  });

  it('keeps the reports from a signed-in non-administrator', async () => {
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Un souci quelque part sur la page.'),
    );

    const body = await harness.request<{ bugReports: unknown[] }>(
      LIST,
      undefined,
      harness.readerToken,
    );
    expect(body.data?.bugReports).toBeUndefined();
    expect(body.errors?.[0]).toBeDefined();
  });

  it('shows an administrator every report, newest first, with the address to answer', async () => {
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Le premier problème rencontré.'),
    );
    await harness.graphql(
      REPORT,
      harness.readerToken,
      reportOf('/calendar', 'Le second problème rencontré.'),
    );

    const data = await harness.graphql<{
      bugReports: { message: string; reportedBy: string }[];
    }>(LIST, harness.adminToken);

    expect(data.bugReports).toHaveLength(2);
    expect(data.bugReports[0]?.message).toContain('second');
    expect(data.bugReports[0]?.reportedBy).toBe(READER_EMAIL);
  });

  it('lets an administrator mark one handled, but not a reader', async () => {
    const created = await harness.graphql<{ reportBug: { id: string } }>(
      REPORT,
      harness.readerToken,
      reportOf('/', 'Quelque chose qui a depuis été corrigé.'),
    );

    const handled = await harness.graphql<{ setBugStatus: { status: string } }>(
      SET_STATUS,
      harness.adminToken,
      { input: { id: created.reportBug.id, status: 'FIXED' } },
    );
    expect(handled.setBugStatus.status).toBe('FIXED');

    const asReader = await harness.request(
      SET_STATUS,
      { input: { id: created.reportBug.id, status: 'DISMISSED' } },
      harness.readerToken,
    );
    expect(asReader.errors?.[0]).toBeDefined();
  });
});
