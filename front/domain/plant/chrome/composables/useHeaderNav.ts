export type HeaderNavItem = {
  to: string;
  icon: string;
  label: string;
  // The AI destination is live: its icon and label swap to a connection
  // indicator while the GPU worker is online.
  isAi: boolean;
  // Current section; the AI destination also counts as active while connected.
  active: boolean;
};

export type UseHeaderNav = {
  items: ComputedRef<HeaderNavItem[]>;
};

// The header's destinations, shared by the desktop vine nav and the mobile
// slideover — one source (labels, icons, active state) so the two navs can never
// drift apart. Labels use static keys (never a key held in a variable).
export const useHeaderNav = (aiOnline: () => boolean): UseHeaderNav => {
  const { t } = useNuxtApp().$i18n;
  const route = useRoute();
  const localePath = useLocalePath();

  // Home matches exactly (it is the catch-all "/"), the others by section prefix.
  const isCurrent = (to: string): boolean => {
    const target = localePath(to);
    return to === '/' ? route.path === target : route.path.startsWith(target);
  };

  const items = computed((): HeaderNavItem[] => [
    {
      to: '/',
      icon: 'i-lucide-house',
      label: t('plant.layout.navHome'),
      isAi: false,
      active: isCurrent('/'),
    },
    {
      to: '/mes-plantes',
      icon: 'i-lucide-leaf',
      label: t('plant.layout.navPlants'),
      isAi: false,
      active: isCurrent('/mes-plantes'),
    },
    {
      to: '/calendar',
      icon: 'i-lucide-calendar-days',
      label: t('plant.layout.navCalendar'),
      isAi: false,
      active: isCurrent('/calendar'),
    },
    {
      to: '/activate-ai',
      icon: aiOnline() ? 'i-lucide-badge-check' : 'i-lucide-sparkles',
      label: aiOnline() ? t('plant.layout.aiConnected') : t('plant.layout.navAi'),
      isAi: true,
      active: isCurrent('/activate-ai') || aiOnline(),
    },
  ]);

  return { items };
};
