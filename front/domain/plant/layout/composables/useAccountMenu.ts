import type { DropdownMenuItem } from '@nuxt/ui';
import type { ComputedRef } from 'vue';

type UseAccountMenu = { accountItems: ComputedRef<DropdownMenuItem[][]> };

// The account dropdown: the user's identity, the Pl@ntNet key and feedback
// entries, the admin screens (only for an administrator), and sign-out. Gathers
// its own dependencies so the header just renders the items.
export const useAccountMenu = (): UseAccountMenu => {
  const { t } = useNuxtApp().$i18n;
  const localePath = useLocalePath();
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const { open: openBugReport } = useBugReport();
  const { open: openImprovement } = useImprovement();
  const { open: openPlantnetKey } = usePlantnetKey();

  const accountItems = computed((): DropdownMenuItem[][] => [
    [{ label: user.value?.name ?? user.value?.email ?? '', type: 'label' as const }],
    [
      {
        label: t('ai.plantnetKey.menu'),
        icon: 'i-lucide-key-round',
        onSelect: openPlantnetKey,
      },
    ],
    [
      { label: t('bugReport.open'), icon: 'i-lucide-bug', onSelect: openBugReport },
      { label: t('improvement.open'), icon: 'i-lucide-lightbulb', onSelect: openImprovement },
    ],
    ...(isAdmin.value
      ? [
          [
            {
              label: t('bugReport.admin.title'),
              icon: 'i-lucide-list-checks',
              to: localePath('/signalements'),
            },
            {
              label: t('improvement.admin.title'),
              icon: 'i-lucide-sparkles',
              to: localePath('/ameliorations'),
            },
          ],
        ]
      : []),
    [
      {
        label: t('auth.logout'),
        icon: 'i-lucide-log-out',
        onSelect: (): void => {
          void logout();
        },
      },
    ],
  ]);

  return { accountItems };
};
