type ReportContext = {
  page: string;
  userAgent: string;
  viewport: string;
  locale: string;
};

type UseReportContext = {
  contextNow: () => ReportContext;
};

// Read in the browser at send time — the only place this data exists, so
// nobody has to type it (shared by the bug-report/improvement forms).
export const useReportContext = (): UseReportContext => {
  const route = useRoute();
  const { locale } = useNuxtApp().$i18n;

  const contextNow = (): ReportContext => ({
    page: route.fullPath,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    locale: locale.value,
  });

  return { contextNow };
};
