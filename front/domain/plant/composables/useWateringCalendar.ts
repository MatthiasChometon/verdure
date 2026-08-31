import type { ComputedRef, Ref } from 'vue';
import type { WateringEventsQuery } from '#gql';

type WateringEvent = WateringEventsQuery['wateringEvents'][number];

type UseWateringCalendar = {
  plants: ComputedRef<Plant[]>;
  isLoaded: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  eventsOn: (day: string) => WateringEvent[];
  dueOn: (day: string) => Plant[];
  logWatering: (day: string, plantId: string, plantName: string) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
};

// The watering data behind the calendar for the visible [from, to] range: the
// logged events, the plants, the projection of each plant's recurring due dates
// across that range, and the optimistic log/remove actions.
export const useWateringCalendar = (
  rangeFrom: Ref<string>,
  rangeTo: Ref<string>,
): UseWateringCalendar => {
  const {
    data: eventsData,
    error,
    refresh: refreshEvents,
  } = useQuery(
    'watering-events',
    () => GqlWateringEvents({ from: rangeFrom.value, to: rangeTo.value }),
    { server: false, watch: [rangeFrom, rangeTo] },
  );
  const events = computed(
    (): WateringEvent[] => eventsData.value?.wateringEvents ?? [],
  );

  const { data: plantsData, refresh: refreshPlants } = useQuery(
    'watering-plants',
    () => GqlPlants({ ...usePlantSort('watering'), limit: 50 }),
    { server: false },
  );
  const plants = computed((): Plant[] => plantsData.value?.plants.items ?? []);

  // The month grid is local, but its markers depend on both fetches. Loaded once
  // both have arrived (data survives month changes, so this is the very first load
  // only, not every navigation).
  const isLoaded = computed(
    (): boolean => eventsData.value !== undefined && plantsData.value !== undefined,
  );
  const hasError = computed((): boolean => Boolean(error.value));

  const eventsOn = (day: string): WateringEvent[] =>
    events.value.filter((event) => event.wateredOn === day);

  const addDaysIso = (isoDate: string, days: number): string => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  // Interval of the season a due date falls in (April–September = summer),
  // mirroring the back's WateringScheduleService.
  const seasonInterval = (
    isoDate: string,
    summer: number | undefined,
    winter: number | undefined,
  ): number | undefined => {
    const month = Number(isoDate.slice(5, 7));
    return month >= 4 && month <= 9 ? summer : winter;
  };

  // Project each plant's recurring due dates across the visible range, not just
  // the single next one — a plant watered every N days shows on every occurrence.
  const dueByDay = computed((): Map<string, Plant[]> => {
    const map = new Map<string, Plant[]>();
    for (const plant of plants.value) {
      let due: string | undefined = plant.nextDueOn ?? undefined;
      // Cap iterations so a zero/negative interval can never loop forever.
      for (let guard = 0; due !== undefined && due <= rangeTo.value && guard < 400; guard += 1) {
        if (due >= rangeFrom.value) {
          const list = map.get(due) ?? [];
          list.push(plant);
          map.set(due, list);
        }
        const interval = seasonInterval(
          due,
          plant.wateringIntervalSummerDays ?? undefined,
          plant.wateringIntervalWinterDays ?? undefined,
        );
        if (interval === undefined || interval <= 0) {
          break;
        }
        due = addDaysIso(due, interval);
      }
    }
    return map;
  });
  const dueOn = (day: string): Plant[] => dueByDay.value.get(day) ?? [];

  const refreshBoth = async (): Promise<void> => {
    await Promise.all([refreshEvents(), refreshPlants()]);
  };

  // First load by hand — the queries are no longer immediate; the events query's
  // watch only refires on range changes, so the initial fetch is triggered here.
  onMounted((): void => {
    void refreshBoth();
  });

  const logPlantId = ref('');
  const logDay = ref('');
  const { execute: runLog, error: logError } = useMutation(() =>
    GqlWaterPlant({ input: { plantId: logPlantId.value, wateredOn: logDay.value } }),
  );

  const logWatering = async (day: string, plantId: string, plantName: string): Promise<void> => {
    logPlantId.value = plantId;
    logDay.value = day;
    // Optimistic: show the watering on the day at once, roll back if it fails.
    const ok = await useOptimisticUpdate(
      eventsData,
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              wateringEvents: [
                ...current.wateringEvents,
                { id: `optimistic-${Date.now()}`, plantId, plantName, wateredOn: day },
              ],
            },
      { execute: runLog, error: logError },
    );
    if (ok) {
      // Reconcile the real event id and the recomputed due markers.
      await refreshBoth();
    }
  };

  const removeId = ref('');
  const { execute: runRemove, error: removeError } = useMutation(() =>
    GqlDeleteWateringEvent({ id: removeId.value }),
  );

  const removeEvent = async (id: string): Promise<void> => {
    removeId.value = id;
    // Optimistic: drop the watering from the list immediately, restore on failure.
    const ok = await useOptimisticUpdate(
      eventsData,
      (current) =>
        current === undefined
          ? current
          : {
              ...current,
              wateringEvents: current.wateringEvents.filter((event) => event.id !== id),
            },
      { execute: runRemove, error: removeError },
    );
    if (ok) {
      await refreshPlants();
    }
  };

  return { plants, isLoaded, hasError, eventsOn, dueOn, logWatering, removeEvent };
};
