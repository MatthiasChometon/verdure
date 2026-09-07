import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import BioCard from './BioCard.vue';

const cardFor = (description: string, origin: string): ReturnType<typeof mountSuspended> =>
  mountSuspended(BioCard, { props: { speciesInfo: { description, origin } } });

describe('PlantBioCard', () => {
  it('renders the description text', async () => {
    const description = 'A giant rainforest vine that climbs on aerial roots.';
    const wrapper = await cardFor(description, 'Central America');

    expect(wrapper.text()).toContain(description);
  });

  it('shows the origin under a translated label, never a raw i18n key', async () => {
    const wrapper = await cardFor('Some plant.', 'Humid forests of southern Mexico');

    const text = wrapper.text();
    expect(text).toContain('Humid forests of southern Mexico');
    // The default locale is French, so the resolved label, not the raw key.
    expect(text).toContain('Origine');
    expect(text).not.toContain('plant.bio');
  });
});
