import { mountSuspended, renderSuspended } from '@nuxt/test-utils/runtime';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it } from 'vitest';
import Grid from './Grid.vue';

const plants: Plant[] = [
  { id: '1', name: 'Monstera', species: 'Monstera deliciosa', imageUrl: null },
  { id: '2', name: 'Aloe', species: 'Aloe vera', imageUrl: null },
];

const keyboardPlants: Plant[] = [
  { id: '1', name: 'Aloe', species: 'Aloe vera', imageUrl: null },
  { id: '2', name: 'Monstera', species: 'Monstera deliciosa', imageUrl: null },
  { id: '3', name: 'Pothos', species: 'Epipremnum aureum', imageUrl: null },
];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PlantListGrid', () => {
  it('renders one item per plant with its name and species', async () => {
    const wrapper = await mountSuspended(Grid, { props: { plants } });

    expect(wrapper.findAll('li')).toHaveLength(2);
    expect(wrapper.text()).toContain('Monstera');
    expect(wrapper.text()).toContain('Aloe vera');
  });

  it('emits edit with the matching plant when a card edit button is clicked', async () => {
    const wrapper = await mountSuspended(Grid, { props: { plants } });
    const secondCard = wrapper.findAll('li')[1];

    await secondCard?.findAll('button')[0]?.trigger('click');

    expect(wrapper.emitted('edit')?.[0]).toEqual([plants[1]]);
  });

  it('emits delete with the matching plant when a card delete button is clicked', async () => {
    const wrapper = await mountSuspended(Grid, { props: { plants } });
    const firstCard = wrapper.findAll('li')[0];

    await firstCard?.findAll('button')[1]?.trigger('click');

    expect(wrapper.emitted('delete')?.[0]).toEqual([plants[0]]);
  });
});

describe('PlantListGrid keyboard', () => {
  it('waters, edits and deletes the hovered plant on a / e / s', async () => {
    const { emitted } = await renderSuspended(Grid, { props: { plants: keyboardPlants } });
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
    const { emitted } = await renderSuspended(Grid, { props: { plants: keyboardPlants } });
    const first = screen.getByLabelText('Aloe — Aloe vera');
    first.focus();

    await fireEvent.keyDown(first, { key: 'e' });

    expect(emitted().edit?.[0]).toEqual([keyboardPlants[0]]);
  });

  it('ignores the shortcuts while a dialog is open (blocked)', async () => {
    const { emitted } = await renderSuspended(Grid, {
      props: { plants: keyboardPlants, blocked: true },
    });
    await fireEvent.mouseOver(screen.getByLabelText('Monstera — Monstera deliciosa'));

    await fireEvent.keyDown(document.body, { key: 'e' });

    expect(emitted().edit).toBeUndefined();
  });

  it('moves focus to the next card with the right arrow', async () => {
    await renderSuspended(Grid, { props: { plants: keyboardPlants } });
    const first = screen.getByLabelText('Aloe — Aloe vera');
    first.focus();

    await fireEvent.keyDown(first, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText('Monstera — Monstera deliciosa'),
      ),
    );
  });

  it('navigates with the arrows from the hovered card, without focusing first', async () => {
    await renderSuspended(Grid, { props: { plants: keyboardPlants } });
    await fireEvent.mouseOver(screen.getByLabelText('Monstera — Monstera deliciosa'));

    await fireEvent.keyDown(document.body, { key: 'ArrowRight' });

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByLabelText('Pothos — Epipremnum aureum'),
      ),
    );
  });
});
