type ApiClient = ReturnType<typeof $fetch.create>;

export default defineNuxtPlugin((): { provide: { api: ApiClient } } => {
  const config = useRuntimeConfig();

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
  });

  return { provide: { api } };
});
