// Reveals an element the first time it reaches the viewport, and owns every
// low-level detail that entails — the reduced-motion opt-out, the "already on
// screen at load" shortcut and the IntersectionObserver lifecycle — so a
// component only reads { root, visible }. Read top-down: intent, then the
// decisions, then the DOM plumbing.
export const useReveal = (): {
  root: Ref<HTMLElement | null>;
  visible: Ref<boolean>;
} => {
  const root = ref<HTMLElement | null>(null);
  const visible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted((): void => {
    const el = root.value;
    if (el === null) {
      return;
    }
    if (revealsWithoutScrolling(el)) {
      visible.value = true;
      return;
    }
    observer = revealOnceInView(el, (): void => {
      visible.value = true;
    });
  });

  onBeforeUnmount((): void => observer?.disconnect());

  return { root, visible };
};

// No scroll is needed to see it: motion is off, or it already reaches into the
// first viewport at load.
const revealsWithoutScrolling = (el: HTMLElement): boolean =>
  prefersReducedMotion() || isWithinInitialViewport(el);

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isWithinInitialViewport = (el: HTMLElement): boolean =>
  el.getBoundingClientRect().top < window.innerHeight;

// Fires `onVisible` the first time the element intersects the viewport, then
// stops watching. Returns the observer so the caller can also tear it down on
// unmount if it never intersected.
const revealOnceInView = (
  el: HTMLElement,
  onVisible: () => void,
): IntersectionObserver => {
  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]): void => {
      if (entries.some((entry: IntersectionObserverEntry): boolean => entry.isIntersecting)) {
        onVisible();
        observer.disconnect();
      }
    },
    { threshold: 0, rootMargin: '0px' },
  );
  observer.observe(el);
  return observer;
};
