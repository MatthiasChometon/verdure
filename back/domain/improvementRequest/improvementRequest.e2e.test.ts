import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_EMAIL,
  BugReportTestHarness,
  READER_EMAIL,
} from '../bugReport/harness';

const REQUEST = `
  mutation ($input: RequestImprovementInput!) {
    requestImprovement(input: $input) { id message status importance requestedBy }
  }
`;
const LIST = `query { improvementRequests { id message requestedBy } }`;
const SET_STATUS = `mutation ($input: ImprovementStatusInput!) { setImprovementStatus(input: $input) { id status } }`;

const idea = (message: string): Record<string, unknown> => ({
  input: {
    importance: 'WOULD_HELP',
    message,
    context: {
      page: '/plants',
      userAgent: 'Mozilla/5.0 (probe)',
      viewport: '390x844',
      locale: 'fr',
    },
  },
});

describe('improvement requests (e2e)', () => {
  const harness = new BugReportTestHarness();

  beforeAll(() => harness.init());
  afterAll(() => harness.close());
  beforeEach(() => harness.reset());

  it('files an idea and tells the administrator after answering', async () => {
    let release!: () => void;
    harness.mail.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const data = await harness.graphql<{
      requestImprovement: { status: string; requestedBy: string };
    }>(REQUEST, harness.readerToken, idea('Un mode sombre, ce serait bien.'));

    expect(data.requestImprovement.status).toBe('NEW');
    expect(data.requestImprovement.requestedBy).toBe(READER_EMAIL);
    expect(harness.mail.messages).toHaveLength(0);
    release();
    await harness.announced();
    expect(harness.mail.messages).toHaveLength(1);
    expect(harness.mail.messages[0]?.to).toBe(ADMIN_EMAIL);
    expect(harness.mail.messages[0]?.subject).toContain('Idée');
    expect(harness.mail.messages[0]?.text).toContain('Ça aiderait');
  });

  it('keeps the idea when the mail server is down', async () => {
    harness.mail.failure = new Error('SMTP is down');

    await harness.graphql(
      REQUEST,
      harness.readerToken,
      idea('Un export des plantes en CSV.'),
    );
    await harness.announced();

    const list = await harness.graphql<{ improvementRequests: unknown[] }>(
      LIST,
      harness.adminToken,
    );
    expect(list.improvementRequests).toHaveLength(1);
  });

  it('stops announcing after three in an hour, and keeps every idea', async () => {
    for (let filed = 0; filed < 5; filed += 1) {
      await harness.graphql(
        REQUEST,
        harness.readerToken,
        idea(`Une idée, numéro ${filed}.`),
      );
    }
    await harness.announced();

    expect(harness.mail.messages).toHaveLength(3);
    const list = await harness.graphql<{ improvementRequests: unknown[] }>(
      LIST,
      harness.adminToken,
    );
    expect(list.improvementRequests).toHaveLength(5);
  });

  it('keeps the list and the status change out of a reader’s hands', async () => {
    const created = await harness.graphql<{
      requestImprovement: { id: string };
    }>(REQUEST, harness.readerToken, idea('Une idée tout à fait ordinaire.'));

    const list = await harness.request(LIST, undefined, harness.readerToken);
    const status = await harness.request(
      SET_STATUS,
      { input: { id: created.requestImprovement.id, status: 'DONE' } },
      harness.readerToken,
    );

    expect(list.errors?.[0]).toBeDefined();
    expect(status.errors?.[0]).toBeDefined();
  });

  it('lets an administrator move an idea along', async () => {
    const created = await harness.graphql<{
      requestImprovement: { id: string };
    }>(REQUEST, harness.readerToken, idea('Une idée à planifier bientôt.'));

    const moved = await harness.graphql<{
      setImprovementStatus: { status: string };
    }>(SET_STATUS, harness.adminToken, {
      input: { id: created.requestImprovement.id, status: 'PLANNED' },
    });

    expect(moved.setImprovementStatus.status).toBe('PLANNED');
  });
});
