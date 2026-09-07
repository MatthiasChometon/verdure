import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { PlantHumidityNeed, PlantLightNeed } from '#gql/default';
import CareSheetCard from './CareSheetCard.vue';

const cardFor = (
  light: PlantLightNeed,
  humidity: PlantHumidityNeed,
  tip: string,
): ReturnType<typeof mountSuspended> =>
  mountSuspended(CareSheetCard, { props: { careSheet: { light, humidity, tip } } });

describe('PlantCareSheetCard', () => {
  it('shows light and humidity as words, not raw i18n keys', async () => {
    const wrapper = await cardFor(PlantLightNeed.BRIGHT, PlantHumidityNeed.LOW, 'Water sparingly.');

    const text = wrapper.text();
    // Resolved labels (default locale is French), never the raw i18n keys.
    expect(text).not.toContain('plant.care');
    expect(text).toContain('Lumière');
    expect(text).toContain('Humidité');
    expect(text).toContain('Vive');
  });

  it('shows a distinct icon for each light and humidity level', async () => {
    const bright = await cardFor(PlantLightNeed.BRIGHT, PlantHumidityNeed.HIGH, 'tip');
    expect(bright.html()).toContain('lucide:sun');
    expect(bright.html()).toContain('cloud-rain');

    const low = await cardFor(PlantLightNeed.LOW, PlantHumidityNeed.LOW, 'tip');
    expect(low.html()).toContain('lucide:cloud');
    expect(low.html()).toContain('lucide:droplet');
  });

  it('renders the growing tip text', async () => {
    const tip = 'A moss pole encourages larger leaves.';
    const wrapper = await cardFor(PlantLightNeed.MEDIUM, PlantHumidityNeed.HIGH, tip);

    expect(wrapper.text()).toContain(tip);
  });

  it('labels the tip for screen readers', async () => {
    const wrapper = await cardFor(
      PlantLightNeed.MEDIUM,
      PlantHumidityNeed.MEDIUM,
      'Rotate weekly.',
    );

    expect(wrapper.find('.sr-only').text()).toContain('Astuce');
  });
});
