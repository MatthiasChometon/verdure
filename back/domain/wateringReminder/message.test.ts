import { DuePlant } from '../plant/watering/type';
import { ReminderMessage } from './message';

const message = new ReminderMessage();

const plant = (name: string): DuePlant => ({
  id: name,
  name,
  dueOn: '2026-07-15',
});

describe('ReminderMessage.build', () => {
  it('names the single due plant in French', () => {
    const payload = message.build([plant('Monstera')], 'fr');
    expect(payload.body).toContain('Monstera');
    expect(payload.url).toBe('/');
  });

  it('names the single due plant in English', () => {
    const payload = message.build([plant('Monstera')], 'en');
    expect(payload.body).toBe('Monstera is thirsty today.');
  });

  it('summarises the count when several plants are due', () => {
    const payload = message.build([plant('A'), plant('B'), plant('C')], 'en');
    expect(payload.body).toBe('3 plants need watering today.');
  });

  it('falls back to French for an unknown locale', () => {
    const payload = message.build([plant('A'), plant('B')], 'de');
    expect(payload.body).toBe("2 plantes ont besoin d'eau aujourd'hui.");
  });
});
