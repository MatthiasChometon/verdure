export type HeaderNavItem = { to: string; icon: string; labelKey: string };

// The header's destinations, shared by the desktop vine nav and the mobile
// slideover — one source so the two navs can never drift apart.
export const useHeaderNav = (): HeaderNavItem[] => [
  { to: '/', icon: 'i-lucide-house', labelKey: 'plant.layout.navHome' },
  { to: '/mes-plantes', icon: 'i-lucide-leaf', labelKey: 'plant.layout.navPlants' },
  { to: '/calendar', icon: 'i-lucide-calendar-days', labelKey: 'plant.layout.navCalendar' },
  { to: '/activate-ai', icon: 'i-lucide-sparkles', labelKey: 'plant.layout.navAi' },
];
