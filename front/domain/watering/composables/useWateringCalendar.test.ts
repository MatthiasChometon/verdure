import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useWateringCalendar } from './useWateringCalendar';

const mocks = vi.hoisted(() => ({ useQueryMock: vi.fn(), useMutationMock: vi.fn() }));
mockNuxtImport('useQuery', () => mocks.useQueryMock);
mockNuxtImport('useMutation', () => mocks.useMutationMock);

type EventsData = {
  wateringEvents: { id: string; plantId: string; plantName: string; wateredOn: string }[];
};

const existing = { id: 'e1', plantId: 'p1', plantName: 'Monstera', wateredOn: '2026-07-01' };

let eventsData: Ref<EventsData | undefined>;
let refreshEvents: ReturnType<typeof vi.fn>;
let refreshPlants: ReturnType<typeof vi.fn>;
let logError: Ref<Error | undefined>;
let removeError: Ref<Error | undefined>;
let runLog: ReturnType<typeof vi.fn>;
let runRemove: ReturnType<typeof vi.fn>;

const calendar = (): ReturnType<typeof useWateringCalendar> =>
  useWateringCalendar(ref('2026-06-29'), ref('2026-08-09'));

beforeEach(() => {
  eventsData = ref<EventsData | undefined>({ wateringEvents: [existing] });
  refreshEvents = vi.fn().mockResolvedValue(undefined);
  refreshPlants = vi.fn().mockResolvedValue(undefined);
  logError = ref<Error | undefined>(undefined);
  removeError = ref<Error | undefined>(undefined);
  runLog = vi.fn().mockResolvedValue(undefined);
  runRemove = vi.fn().mockResolvedValue(undefined);
  // useQuery is called in order: events, plants; useMutation: log, remove.
  mocks.useQueryMock
    .mockReturnValueOnce({ data: eventsData, error: ref(undefined), refresh: refreshEvents })
    .mockReturnValueOnce({ data: ref({ plants: { items: [] } }), refresh: refreshPlants });
  mocks.useMutationMock
    .mockReturnValueOnce({ execute: runLog, error: logError })
    .mockReturnValueOnce({ execute: runRemove, error: removeError });
});

describe('useWateringCalendar', () => {
  it('shows a logged watering at once and reloads both queries when it succeeds', async () => {
    const { logWatering, eventsOn, actionFailed } = calendar();

    await logWatering('2026-07-02', 'p2', 'Aloe');

    expect(runLog).toHaveBeenCalledTimes(1);
    expect(eventsOn('2026-07-02').map((event) => event.plantName)).toEqual(['Aloe']);
    expect(actionFailed.value).toBe(false);
    expect(refreshEvents).toHaveBeenCalled();
    expect(refreshPlants).toHaveBeenCalled();
  });

  it('rolls back a refused watering and flags the failure', async () => {
    logError.value = new Error('refused');
    const { logWatering, eventsOn, actionFailed } = calendar();

    await logWatering('2026-07-02', 'p2', 'Aloe');

    expect(eventsOn('2026-07-02')).toEqual([]);
    expect(actionFailed.value).toBe(true);
  });

  it('rolls back a refused removal and flags the failure', async () => {
    removeError.value = new Error('refused');
    const { removeEvent, eventsOn, actionFailed } = calendar();

    await removeEvent('e1');

    expect(eventsOn('2026-07-01')).toEqual([existing]);
    expect(actionFailed.value).toBe(true);
  });

  it('removes a watering and reloads the plants when it succeeds', async () => {
    const { removeEvent, eventsOn, actionFailed } = calendar();

    await removeEvent('e1');

    expect(eventsOn('2026-07-01')).toEqual([]);
    expect(actionFailed.value).toBe(false);
    expect(refreshPlants).toHaveBeenCalled();
  });

  it('clears an earlier failure when the next action starts', async () => {
    logError.value = new Error('refused');
    const { logWatering, removeEvent, actionFailed } = calendar();
    await logWatering('2026-07-02', 'p2', 'Aloe');
    expect(actionFailed.value).toBe(true);

    await removeEvent('e1');

    expect(actionFailed.value).toBe(false);
  });
});
