// Whether to offer the reports screen at all. Not a protection — the API
// refuses on its own — only a way to avoid showing a door that would slam.
export const useAdmin = (): { isAdmin: ComputedRef<boolean> } => {
  const { user } = useAuth();

  const { data, error, refresh } = useQuery(
    'am-i-admin',
    async (): Promise<boolean> => {
      // Nobody signed in: the question would only answer itself with an error.
      if (user.value === null) return false;
      const result = await GqlAmIAdmin();
      return result.amIAdmin;
    },
    // Browser only, and asked again when the session changes — signing in is
    // exactly when the answer stops being "no".
    { server: false, watch: [user] },
  );

  // First load by hand — never immediate: true; a later session change is
  // already covered by the watch above.
  onMounted((): void => {
    void refresh();
  });

  // A failed check answers "no" too — never a try/catch, the query's own
  // reactive error state is enough.
  return { isAdmin: computed((): boolean => !error.value && (data.value ?? false)) };
};
