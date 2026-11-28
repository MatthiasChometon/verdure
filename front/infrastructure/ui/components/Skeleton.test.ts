import { renderSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import Skeleton from './Skeleton.vue';

const render = async (classes?: string): Promise<Element> => {
  const { container } = await renderSuspended(
    Skeleton,
    classes ? { props: { class: classes } } : {},
  );
  return container.querySelector('.animate-pulse') as Element;
};

describe('UiSkeleton', () => {
  it('is a decorative pulsing block with the default radius', async () => {
    const element = await render('h-4 w-10');

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.className).toContain('animate-pulse');
    expect(element.className).toContain('bg-accented');
    expect(element.className).toContain('rounded-md');
    expect(element.className).toContain('h-4 w-10');
  });

  it.each(['rounded-full', 'size-8 rounded-full', 'rounded', '!rounded-lg', 'rounded-[10px]'])(
    'lets "%s" replace the default radius',
    async (classes) => {
      expect((await render(classes)).className).not.toContain('rounded-md');
    },
  );

  it.each(['sm:rounded-full', 'dark:rounded-none', 'rounded-t-lg', 'not-rounded'])(
    'keeps the default radius under "%s", as tailwind-merge does for another variant',
    async (classes) => {
      expect((await render(classes)).className).toContain('rounded-md');
    },
  );
});
