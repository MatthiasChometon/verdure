import { CareType } from '../plant/care/enum';
import { DueCareTask } from '../plant/care/type';
import { CareReminderMessage } from './care-message';

const message = new CareReminderMessage();

const task = (
  overrides: Partial<DueCareTask> & Pick<DueCareTask, 'plantName'>,
): DueCareTask => ({
  plantId: overrides.plantName,
  careType: CareType.FERTILIZING,
  dueOn: '2026-07-15',
  ...overrides,
});

describe('CareReminderMessage.build', () => {
  it('names the single due task and plant in English', () => {
    const payload = message.build(
      [task({ plantName: 'Monstera', careType: CareType.MISTING })],
      'en',
    );
    expect(payload.body).toBe('Monstera: misting today.');
    expect(payload.url).toBe('/');
  });

  it('names the single due task in French', () => {
    const payload = message.build([task({ plantName: 'Ficus' })], 'fr');
    expect(payload.body).toBe("Ficus : engrais aujourd'hui.");
  });

  it('summarises the count when several tasks are due', () => {
    const payload = message.build(
      [
        task({ plantName: 'A' }),
        task({ plantName: 'B' }),
        task({ plantName: 'C' }),
      ],
      'en',
    );
    expect(payload.body).toBe('3 care tasks due today.');
  });

  it('falls back to French for an unknown locale', () => {
    const payload = message.build(
      [task({ plantName: 'A' }), task({ plantName: 'B' })],
      'de',
    );
    expect(payload.body).toBe("2 soins à faire aujourd'hui.");
  });
});
