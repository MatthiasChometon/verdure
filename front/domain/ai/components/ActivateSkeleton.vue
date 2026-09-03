<template>
  <div>
    <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>

    <div class="mb-8 flex flex-col gap-3">
      <USkeleton class="h-10 w-64 sm:h-12" />
      <USkeleton class="h-6 w-80 max-w-full" />
    </div>

    <div
      class="border-default/70 bg-elevated/30 mb-14 flex flex-col gap-5 rounded-3xl border p-6 shadow-sm sm:p-8"
    >
      <USkeleton class="h-8 w-52 rounded-full" />
      <USkeleton class="h-5 w-40" />
      <USkeleton class="h-28 w-full rounded-xl" />
      <USkeleton class="h-11 w-52 rounded-md" />
      <div class="flex flex-wrap gap-3">
        <USkeleton class="h-6 w-28 rounded-full" />
        <USkeleton class="h-6 w-28 rounded-full" />
        <USkeleton class="h-6 w-28 rounded-full" />
      </div>
      <USkeleton class="h-px w-full" />
      <USkeleton class="h-5 w-44" />
      <USkeleton class="h-5 w-64 max-w-full" />
    </div>

    <USkeleton class="mb-8 h-44 w-full rounded-2xl" />

    <div class="flex flex-wrap gap-2.5">
      <USkeleton v-for="n in 4" :key="n" class="h-8 w-32 rounded-full" />
    </div>
  </div>
</template>
