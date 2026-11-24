// Reveals an element the first time it reaches the viewport; a component only
// binds the template ref named `root` and reads `visible`.
export const useReveal = (): { visible: Ref<boolean> } => {
  const root = useTemplateRef<HTMLElement>('root');
  const visible = ref(false);
  let observer: IntersectionObserver | null = null;

  const prefersReducedMotion = (): boolean =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isWithinInitialViewport = (el: HTMLElement): boolean =>
    el.getBoundingClientRect().top < window.innerHeight;

  const revealsWithoutScrolling = (el: HTMLElement): boolean =>
    prefersReducedMotion() || isWithinInitialViewport(el);

  const revealOnceInView = (el: HTMLElement): void => {
    observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]): void => {
        if (entries.some((entry: IntersectionObserverEntry): boolean => entry.isIntersecting)) {
          visible.value = true;
          observer?.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px' },
    );
    observer.observe(el);
  };

  const reveal = (): void => {
    const el = root.value;
    if (el === null) {
      return;
    }
    if (revealsWithoutScrolling(el)) {
      visible.value = true;
      return;
    }
    revealOnceInView(el);
  };

  onMounted(reveal);
  onBeforeUnmount((): void => observer?.disconnect());

  return { visible };
};
