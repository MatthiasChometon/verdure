import { mockNuxtImport, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Ref } from 'vue';
import Calendar from './Calendar.vue';

const { useWateringCalendarMock } = vi.hoisted(() => ({ useWateringCalendarMock: vi.fn() }));
mockNuxtImport('useWateringCalendar', () => useWateringCalendarMock);

let hasError: Ref<boolean>;
let actionFailed: Ref<boolean>;
let isLoaded: Ref<boolean>;
let removeEvent: ReturnType<typeof vi.fn>;

// A past watering shown on every day, so the day dialog offers the delete button.
const anEvent = { id: 'e1', plantId: 'p1', plantName: 'Monstera', wateredOn: '2020-01-01' };

beforeEach(() => {
  hasError = ref(false);
  actionFailed = ref(false);
  isLoaded = ref(true);
  removeEvent = vi.fn().mockResolvedValue(undefined);
  useWateringCalendarMock.mockReturnValue({
    plants: ref([]),
    isLoaded,
    hasError,
    actionFailed,
    eventsOn: (day: string) => (day === '2020-01-01' ? [anEvent] : []),
    dueOn: (): [] => [],
    logWatering: vi.fn().mockResolvedValue(undefined),
    removeEvent,
  });
});

const cells = (): HTMLElement[] =>
  screen.getAllByRole('button').filter((button) => /^\d{1,2}$/.test(button.textContent.trim()));

describe('WateringCalendar', () => {
  it('announces a failed load as an alert instead of the grid', async () => {
    hasError.value = true;

    await renderSuspended(Calendar);

    expect(screen.getByRole('alert').textContent).toContain('Impossible de charger');
    expect(cells()).toHaveLength(0);
  });

  it('announces a refused log or removal as an alert inside the opened day', async () => {
    await renderSuspended(Calendar);
    const [firstDay] = cells();

    await fireEvent.click(firstDay as HTMLElement);
    await flushPromises();
    expect(screen.queryByRole('alert')).toBeNull();

    actionFailed.value = true;
    await flushPromises();

    expect(screen.getByRole('alert').textContent).toContain("n'a pas pu être enregistré");
  });

  it('clears a previous failure when another day is opened', async () => {
    await renderSuspended(Calendar);
    const [firstDay, secondDay] = cells();

    await fireEvent.click(firstDay as HTMLElement);
    await flushPromises();
    actionFailed.value = true;
    await flushPromises();
    expect(screen.getByRole('alert')).toBeTruthy();

    await fireEvent.click(secondDay as HTMLElement);
    await flushPromises();

    expect(actionFailed.value).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
