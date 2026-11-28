import type { ComputedRef, Ref } from 'vue';
import type { SpeciesAdviceQuery } from '#gql';

type SpeciesWatering = SpeciesAdviceQuery['speciesAdvice']['watering'];
type SpeciesSafety = SpeciesAdviceQuery['speciesAdvice']['safety'];

type UseSpeciesAdvice = {
  watering: ComputedRef<SpeciesWatering | undefined>;
  safety: ComputedRef<SpeciesSafety | undefined>;
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

  const advice = computed((): SpeciesAdviceQuery['speciesAdvice'] | undefined =>
    error.value ? undefined : data.value?.speciesAdvice,
  );
  // The wire types are nullable (GraphQL); inside the app absence is `undefined`.
  const watering = computed((): SpeciesWatering | undefined => advice.value?.watering ?? undefined);
  const safety = computed((): SpeciesSafety | undefined => advice.value?.safety ?? undefined);
  const pending = computed((): boolean => status.value === 'pending');

  const load = async (): Promise<void> => {
    if (species.value.trim() === '') {
      return;
    }
    await execute();
  };

  return { watering, safety, pending, load };
};
