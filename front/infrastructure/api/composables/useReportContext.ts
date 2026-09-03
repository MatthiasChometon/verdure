type ReportContext = {
  page: string;
  userAgent: string;
  viewport: string;
  locale: string;
};

type UseReportContext = {
  contextNow: () => ReportContext;
};

// Shared by every "tell us something" form (bug report, improvement request):
// read at the moment of sending, in the browser, because that is the only
// place any of it exists — and the whole point is that nobody has to type it.
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
