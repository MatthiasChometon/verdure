<script setup lang="ts">
// One calendar app the feed can be added to: a titled card with a single "open" action.
// The wording arrives already translated, so every i18n key stays literal in the caller.
const {
  title,
  lead,
  openLabel,
  to = undefined,
  external = false,
} = defineProps<{
  title: string;
  lead: string;
  openLabel: string;
  to?: string | undefined;
  // Opens in a new window (announced to screen readers) instead of handing off to the OS.
  external?: boolean;
}>();
</script>

<template>
  <div class="border-default flex flex-col gap-3 rounded-lg border p-3">
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-calendar-plus"
        class="text-primary size-5 shrink-0"
        aria-hidden="true"
      />
      <p class="text-sm font-medium">{{ title }}</p>
    </div>
    <p class="text-muted text-sm">{{ lead }}</p>
    <UButton
      v-if="to !== undefined"
      variant="outline"
      color="neutral"
      icon="i-lucide-calendar-plus"
      :to="to"
      v-bind="external ? { target: '_blank', rel: 'noopener noreferrer' } : {}"
      class="self-start"
    >
      {{ openLabel }}
      <span v-if="external" class="sr-only">{{ $t('accessibility.newWindow') }}</span>
    </UButton>
  </div>
</template>
