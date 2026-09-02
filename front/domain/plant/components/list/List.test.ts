import { mountSuspended, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it } from 'vitest';
import List from './List.vue';

// The card links to the plant detail with NuxtLinkLocale; stub it to a plain
// anchor so these behaviour tests don't need the full router/i18n link machinery.
const global = {
  stubs: { NuxtLinkLocale: { template: '<a><slot /></a>' }, NuxtLink: { template: '<a><slot /></a>' } },
};

const plants: Plant[] = [
  { id: '1', name: 'Monstera', species: 'Monstera deliciosa', imageUrl: null, winterRest: false },
  { id: '2', name: 'Aloe', species: 'Aloe vera', imageUrl: null, winterRest: false },
];

const keyboardPlants: Plant[] = [
  { id: '1', name: 'Aloe', species: 'Aloe vera', imageUrl: null, winterRest: false },
  { id: '2', name: 'Monstera', species: 'Monstera deliciosa', imageUrl: null, winterRest: false },
  { id: '3', name: 'Pothos', species: 'Epipremnum aureum', imageUrl: null, winterRest: false },
];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantList', () => {
  it('renders one item per plant with its name and species', async () => {
    const wrapper = await mountSuspended(List, { props: { plants }, global });

    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('Monstera');
    expect(wrapper.text()).toContain('Aloe vera');
  });

  it('emits edit with the matching plant when a card edit button is clicked', async () => {
    const wrapper = await mountSuspended(List, { props: { plants }, global });
    const secondCard = wrapper.findAll('li')[1];

    await secondCard?.findAll('button')[1]?.trigger('click');

    expect(wrapper.emitted('edit')?.[0]).toEqual([plants[1]]);
  });

  it('emits delete with the matching plant when a card delete button is clicked', async () => {
    const wrapper = await mountSuspended(List, { props: { plants }, global });
    const firstCard = wrapper.findAll('li')[0];

    await firstCard?.findAll('button')[2]?.trigger('click');

    expect(wrapper.emitted('delete')?.[0]).toEqual([plants[0]]);
  });
});

describe('PlantList keyboard', () => {
  it('waters, edits and deletes the hovered plant on a / e / s', async () => {
    const { emitted } = await renderSuspended(List, { props: { plants: keyboardPlants }, global });
    const second = screen.getByLabelText('Monstera — Monstera deliciosa');
    await fireEvent.mouseOver(second);

    // Fired from the document, not the card: hover alone drives the target.
    await fireEvent.keyDown(document.body, { key: 'a' });
    await fireEvent.keyDown(document.body, { key: 'e' });
    await fireEvent.keyDown(document.body, { key: 's' });

    expect(emitted().water?.[0]).toEqual([keyboardPlants[1]]);
    expect(emitted().edit?.[0]).toEqual([keyboardPlants[1]]);
    expect(emitted().delete?.[0]).toEqual([keyboardPlants[1]]);
  });

  it('falls back to the focused plant when nothing is hovered', async () => {
    const { emitted } = await renderSuspended(List, { props: { plants: keyboardPlants }, global });
    const first = screen.getByLabelText('Aloe — Aloe vera');
    first.focus();

    await fireEvent.keyDown(first, { key: 'e' });

    expect(emitted().edit?.[0]).toEqual([keyboardPlants[0]]);
  });

  it('ignores the shortcuts while a dialog is open (blocked)', async () => {
    const { emitted } = await renderSuspended(List, {
      props: { plants: keyboardPlants, blocked: true },
      global,
    });
    await fireEvent.mouseOver(screen.getByLabelText('Monstera — Monstera deliciosa'));

    await fireEvent.keyDown(document.body, { key: 'e' });

    expect(emitted().edit).toBeUndefined();
  });

  it('moves focus to the next card with the right arrow', async () => {
    await renderSuspended(List, { props: { plants: keyboardPlants }, global });
    const first = screen.getByLabelText('Aloe — Aloe vera');
    first.focus();

    await fireEvent.keyDown(first, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Monstera — Monstera deliciosa')),
    );
  });

  it('navigates with the arrows from the hovered card, without focusing first', async () => {
    await renderSuspended(List, { props: { plants: keyboardPlants }, global });
    await fireEvent.mouseOver(screen.getByLabelText('Monstera — Monstera deliciosa'));

    await fireEvent.keyDown(document.body, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Pothos — Epipremnum aureum')),
    );
  });
});
