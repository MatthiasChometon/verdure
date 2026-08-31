import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Form from './Form.vue';

describe('PlantForm', () => {
  it('renders the name, species, file and submit controls', async () => {
    const wrapper = await mountSuspended(Form);

    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    // Species is a select-menu trigger (a button) rather than a text input, so
    // we expect its trigger alongside the submit button.
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(2);
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('accepts images from either the camera or the gallery', async () => {
    const wrapper = await mountSuspended(Form);
    const fileInput = wrapper.find('input[type="file"]');

    expect(fileInput.attributes('accept')).toBe('image/*');
    // Setting `capture` would open the camera straight away on mobile and hide
    // the gallery, so its absence is the behaviour under test.
    expect(fileInput.attributes('capture')).toBeUndefined();
  });

  it('keeps submit disabled until both name and species are provided', async () => {
    const wrapper = await mountSuspended(Form);
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.attributes('disabled')).toBeDefined();

    // Filling only the name is not enough: the species is still required.
    await wrapper.find('input[type="text"]').setValue('Fern');
    expect(submit.attributes('disabled')).toBeDefined();
  });

  it('prefills the fields when editing an existing plant', async () => {
    const plant: Plant = {
      id: '1',
      name: 'Monstera',
      species: 'Monstera deliciosa',
      imageUrl: null,
    };
    const wrapper = await mountSuspended(Form, { props: { plant } });

    expect(wrapper.find<HTMLInputElement>('input[type="text"]').element.value).toBe('Monstera');
    expect(wrapper.text()).toContain('Monstera deliciosa');
  });
});
