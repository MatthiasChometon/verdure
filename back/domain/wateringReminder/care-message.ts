import { Injectable } from '@nestjs/common';
import { CareType } from '../plant/care/enum';
import { DueCareTask } from '../plant/care/type';
import type { PushNotificationPayload } from '../../infrastructure/push/type';

type Locale = 'fr' | 'en';

// Localised copy for the care reminder, per supported UI language. French-first;
// anything else falls back to French. Watering keeps its own message — this is
// the notification for the other care routines (fertilising, misting, …).
const COPY: Record<
  Locale,
  {
    title: string;
    task: Record<CareType, string>;
    one: (plantName: string, task: string) => string;
    many: (count: number) => string;
  }
> = {
  fr: {
    title: 'verdure',
    task: {
      FERTILIZING: 'engrais',
      MISTING: 'brumisation',
      ROTATING: 'rotation vers la lumière',
      REPOTTING: 'rempotage',
    },
    one: (plantName, task) => `${plantName} : ${task} aujourd'hui.`,
    many: (count) => `${count} soins à faire aujourd'hui.`,
  },
  en: {
    title: 'verdure',
    task: {
      FERTILIZING: 'fertilising',
      MISTING: 'misting',
      ROTATING: 'rotating toward the light',
      REPOTTING: 'repotting',
    },
    one: (plantName, task) => `${plantName}: ${task} today.`,
    many: (count) => `${count} care tasks due today.`,
  },
};

// Turns the care tasks due today into the notification the browser will show,
// localised to the user's language. Pure — unit-tested on wording and plural.
@Injectable()
export class CareReminderMessage {
  build(dueTasks: DueCareTask[], locale: string): PushNotificationPayload {
    const copy = COPY[this.normalise(locale)];
    const body =
      dueTasks.length === 1
        ? copy.one(dueTasks[0].plantName, copy.task[dueTasks[0].careType])
        : copy.many(dueTasks.length);
    return { title: copy.title, body, url: '/' };
  }

  private normalise(locale: string): Locale {
    return locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }
}
