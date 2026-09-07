import type { ComputedRef, Ref } from 'vue';
import type { SpeciesAdviceQuery } from '#gql';

type SpeciesWatering = SpeciesAdviceQuery['speciesAdvice']['watering'];
type SpeciesSafety = SpeciesAdviceQuery['speciesAdvice']['safety'];

type UseSpeciesAdvice = {
  watering: ComputedRef<SpeciesWatering | null>;
  safety: ComputedRef<SpeciesSafety | null>;
  pending: ComputedRef<boolean>;
  load: () => Promise<void>;
};

// The caller decides when to run `load` and how to apply the result — advice
// pre-fills but the fields stay editable, never auto-overwritten.
export const useSpeciesAdvice = (species: Ref<string>): UseSpeciesAdvice => {
  const { locale } = useNuxtApp().$i18n;

  const { data, status, error, execute } = useQuery('species-advice', () =>
    GqlSpeciesAdvice({ species: species.value, lang: locale.value }),
  );

  const advice = computed((): SpeciesAdviceQuery['speciesAdvice'] | null =>
    error.value ? null : (data.value?.speciesAdvice ?? null),
  );
  const watering = computed((): SpeciesWatering | null => advice.value?.watering ?? null);
  const safety = computed((): SpeciesSafety | null => advice.value?.safety ?? null);
  const pending = computed((): boolean => status.value === 'pending');

  const load = async (): Promise<void> => {
    if (species.value.trim() === '') {
      return;
    }
    await execute();
  };

  return { watering, safety, pending, load };
};
