import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { PlantSafetyLevel } from '#gql/default';
import SafetyPreview from './SafetyPreview.vue';

describe('PlantSafetyPreview', () => {
  it('shows the toxicity badge and its note once the advice is loaded', async () => {
    const wrapper = await mountSuspended(SafetyPreview, {
      props: {
        safety: { level: PlantSafetyLevel.TOXIC, note: 'Oxalate crystals.' },
        pending: false,
      },
    });

    expect(wrapper.text()).toContain('Oxalate crystals.');
    expect(wrapper.html()).toContain('triangle-alert');
  });

  it('reserves its place with a loading state while the advice is pending', async () => {
    const wrapper = await mountSuspended(SafetyPreview, {
      props: { safety: null, pending: true },
    });

    // A screen-reader status stands in for the badge; no badge icon yet.
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.html()).not.toContain('triangle-alert');
  });

  it('renders nothing when there is no advice and nothing is loading', async () => {
    const wrapper = await mountSuspended(SafetyPreview, {
      props: { safety: null, pending: false },
    });

    expect(wrapper.text().trim()).toBe('');
  });
});
