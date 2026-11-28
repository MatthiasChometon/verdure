// The one place that knows what an ended session means for the site. The API
// and GraphQL clients only announce it (see infrastructure/api and graphql).
// Signing in happens in the dialog of the home page: the reader lands there,
// with the page they were on kept in `?redirect=`, and the dialog opens.
export default defineNuxtPlugin((nuxtApp) => {
  const session = useNuxtData('auth-me');
  const localePath = useLocalePath();
  const router = useRouter();
  const { open: openAuthDialog } = useAuthDialog();

  const expire = createSessionExpiry({
    hasSession: (): boolean =>
      session.data.value?.me !== undefined && session.data.value.me !== null,
    clearSession: async (): Promise<void> => {
      await nuxtApp.runWithContext((): void => clearNuxtData('auth-me'));
    },
    signInPath: (): string => localePath('/'),
    currentPath: (): string => router.currentRoute.value.fullPath,
    navigate: async (target): Promise<void> => {
      await nuxtApp.runWithContext(() => navigateTo(target));
      openAuthDialog();
    },
  });

  nuxtApp.hook('session:expired', expire);
});
