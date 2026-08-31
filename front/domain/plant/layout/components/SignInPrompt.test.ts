import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SignInPrompt from './SignInPrompt.vue';

describe('PlantLayoutSignInPrompt', () => {
  it('emits login when the call-to-action button is clicked', async () => {
    const wrapper = await mountSuspended(SignInPrompt);

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('login')).toHaveLength(1);
  });
});
