import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { PlantSafetyLevel } from '#gql/default';
import SafetyBadge from './SafetyBadge.vue';

const badgeFor = (
  level: PlantSafetyLevel,
  note: string | null,
): ReturnType<typeof mountSuspended> =>
  mountSuspended(SafetyBadge, { props: { safety: { level, note } } });

describe('PlantSafetyBadge', () => {
  it('labels a toxic plant with words, not colour alone', async () => {
    const wrapper = await badgeFor(PlantSafetyLevel.TOXIC, null);

    // A non-empty, resolved label (never the raw i18n key) accompanies the icon.
    const label = wrapper.text().trim();
    expect(label).not.toBe('');
    expect(label).not.toContain('plant.safety');
    expect(wrapper.html()).toContain('triangle-alert');
  });

  it('shows a distinct icon for each level', async () => {
    expect((await badgeFor(PlantSafetyLevel.SAFE, null)).html()).toContain('shield-check');
    expect((await badgeFor(PlantSafetyLevel.UNKNOWN, null)).html()).toContain('help-circle');
  });

  it('surfaces the note as a tooltip and in the accessible name', async () => {
    const note = 'Calcium oxalate crystals — irritating if chewed.';
    const wrapper = await badgeFor(PlantSafetyLevel.TOXIC, note);

    expect(wrapper.attributes('title')).toBe(note);
    expect(wrapper.attributes('aria-label')).toContain(note);
  });

  it('omits the tooltip when there is no note', async () => {
    const wrapper = await badgeFor(PlantSafetyLevel.UNKNOWN, null);

    expect(wrapper.attributes('title')).toBeUndefined();
    // Accessible name is just the label — no dangling separator.
    expect(wrapper.attributes('aria-label')).not.toContain('—');
  });
});
