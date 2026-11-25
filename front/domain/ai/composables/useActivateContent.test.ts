import { renderSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, type VNode } from 'vue';

const readContent = async (): Promise<ReturnType<typeof useActivateContent>> => {
  let content: ReturnType<typeof useActivateContent> | undefined;
  await renderSuspended(
    defineComponent({
      setup(): () => VNode {
        content = useActivateContent();
        return () => h('div');
      },
    }),
  );
  if (content === undefined) {
    throw new Error('composable not mounted');
  }
  return content;
};

describe('useActivateContent', () => {
  it('resolves every literal key to real text, never to the key itself', async () => {
    const content = await readContent();

    const texts = [
      ...content.requirements.map((item) => item.label()),
      ...content.perks.map((item) => item.title()),
      ...content.capabilities.flatMap((item) => [item.title(), item.desc()]),
      ...content.panels.flatMap((item) => [item.title(), item.desc()]),
      ...content.steps.map((item) => item.title()),
    ];

    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(/^ai\.activate\./);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
