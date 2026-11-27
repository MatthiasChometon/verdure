// Whether to offer the reports screen at all. Not a protection — the API
// refuses on its own — only a way to avoid showing a door that would slam.
// `when` holds the question back until it turns true (the header asks only once its account menu
// is armed, not while the page is still arriving); by default it is asked at mount.
export const useAdmin = (when?: Ref<boolean>): { isAdmin: ComputedRef<boolean> } => {
  const { user } = useAuth();

  const { data, error, refresh } = useQuery(
    'am-i-admin',
    async (): Promise<boolean> => {
      // Nobody signed in: the question would only answer itself with an error.
      if (user.value === undefined) return false;
      const result = await GqlAmIAdmin();
      return result.amIAdmin;
    },
    // Browser only, and asked again when the session changes — signing in is
    // exactly when the answer stops being "no". Held back entirely while `when` is false.
    { server: false, watch: when === undefined ? [user] : [] },
  );

  // First load by hand — never immediate: true.
  onMounted(async (): Promise<void> => {
    if (when === undefined) {
      await refresh();
      return;
    }
    watch(
      [when, user],
      async (): Promise<void> => {
        if (when.value) await refresh();
      },
      { immediate: true },
    );
  });

  // A failed check answers "no" too — never a try/catch, the query's own
  // reactive error state is enough.
  return { isAdmin: computed((): boolean => !error.value && (data.value ?? false)) };
};
