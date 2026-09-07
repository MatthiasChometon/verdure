import { CareType } from './enum';

// A plant's care routine for one care type, as the due-check needs it: how often
// it recurs and when it was last done (null = never done yet).
export type CareScheduleRecord = {
  plantId: string;
  plantName: string;
  careType: CareType;
  intervalDays: number;
  lastDoneOn: string | null;
};

// A care task that is due on a given day, with the date it fell due.
export type DueCareTask = {
  plantId: string;
  plantName: string;
  careType: CareType;
  dueOn: string;
};
