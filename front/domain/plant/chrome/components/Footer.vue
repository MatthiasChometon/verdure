<script setup lang="ts">
const localePath = useLocalePath();
const year = new Date().getFullYear();

// The legal pages live in their own slice; the footer just points to them so
// they are reachable from anywhere and from nowhere in particular.
const legalLinks = computed((): { to: string; label: string }[] => [
  { to: localePath('/mentions-legales'), label: 'legal.footer.notice' },
  { to: localePath('/confidentialite'), label: 'legal.footer.privacy' },
  { to: localePath('/conditions'), label: 'legal.footer.terms' },
]);
</script>

<template>
  <footer class="border-default/60 border-t">
    <div
      class="text-muted mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{{ $t('plant.layout.footer') }} · © {{ year }}</span>
      <nav class="flex flex-wrap gap-x-5 gap-y-1">
        <NuxtLink
          v-for="link in legalLinks"
          :key="link.to"
          :to="link.to"
          class="text-dimmed hover:text-default underline-offset-4 transition-colors hover:underline"
        >
          {{ $t(link.label) }}
        </NuxtLink>
      </nav>
    </div>
  </footer>
</template>
