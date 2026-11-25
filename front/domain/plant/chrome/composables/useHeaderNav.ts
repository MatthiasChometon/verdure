export type HeaderNavItem = {
  to: string;
  icon: string;
  label: string;
  // The AI destination has no fixed icon/label: the header swaps both for a live
  // connection indicator while the GPU worker is online.
  isAi: boolean;
};

// The header's destinations, shared by the desktop vine nav and the mobile
// slideover — one source so the two navs can never drift apart. Labels are
// resolved here with static keys (never a key held in a variable), and "is this the
// current section" lives here too so both navs share it.
export const useHeaderNav = (): {
  items: ComputedRef<HeaderNavItem[]>;
  isCurrent: (item: HeaderNavItem) => boolean;
} => {
  const { t } = useNuxtApp().$i18n;
  const route = useRoute();
  const localePath = useLocalePath();

  // Home matches exactly (it is the catch-all "/"), the others by section prefix.
  const isCurrent = (item: HeaderNavItem): boolean => {
    const target = localePath(item.to);
    return item.to === '/' ? route.path === target : route.path.startsWith(target);
  };

  const items = computed((): HeaderNavItem[] => [
    { to: '/', icon: 'i-lucide-house', label: t('plant.layout.navHome'), isAi: false },
    { to: '/mes-plantes', icon: 'i-lucide-leaf', label: t('plant.layout.navPlants'), isAi: false },
    {
      to: '/calendar',
      icon: 'i-lucide-calendar-days',
      label: t('plant.layout.navCalendar'),
      isAi: false,
    },
    { to: '/activate-ai', icon: 'i-lucide-sparkles', label: t('plant.layout.navAi'), isAi: true },
  ]);

  return { items, isCurrent };
};
