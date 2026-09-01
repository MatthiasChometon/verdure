import { Injectable } from '@nestjs/common';
import type { PushNotificationPayload } from '../../infrastructure/push/type';
import { DuePlant } from '../plant/watering/type';

type Locale = 'fr' | 'en';

// Localised copy for the reminder notification, per supported UI language. The
// app is French-first; anything else falls back to French.
const COPY: Record<
  Locale,
  {
    title: string;
    one: (name: string) => string;
    many: (count: number) => string;
  }
> = {
  fr: {
    title: 'verdure',
    one: (name) => `${name} a soif aujourd'hui.`,
    many: (count) => `${count} plantes ont besoin d'eau aujourd'hui.`,
  },
  en: {
    title: 'verdure',
    one: (name) => `${name} is thirsty today.`,
    many: (count) => `${count} plants need watering today.`,
  },
};

// Turns the plants due today into the notification the browser will show,
// localised to the user's language. Pure — unit-tested on wording and plural.
@Injectable()
export class ReminderMessage {
  build(duePlants: DuePlant[], locale: string): PushNotificationPayload {
    const copy = COPY[this.normalise(locale)];
    const body =
      duePlants.length === 1
        ? copy.one(duePlants[0].name)
        : copy.many(duePlants.length);
    // Land on the collection, where the reader can water straight away.
    return { title: copy.title, body, url: '/' };
  }

  private normalise(locale: string): Locale {
    return locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }
}
