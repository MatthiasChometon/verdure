<template>
  <div>
    <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>

    <div class="mb-12 flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-3">
        <USkeleton class="h-10 w-56 sm:h-12 sm:w-72" />
        <USkeleton class="h-6 w-72" />
      </div>
      <div class="flex items-center gap-2">
        <USkeleton class="h-9 w-9 rounded-md" />
        <USkeleton class="h-11 w-44 rounded-md" />
      </div>
    </div>

    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <USkeleton class="h-9 w-full rounded-md sm:max-w-xs" />
      <USkeleton class="h-9 w-full rounded-md sm:w-56" />
    </div>

    <div class="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
      <USkeleton class="h-9 w-full rounded-md sm:w-56" />
      <USkeleton class="h-9 w-full rounded-md sm:w-56" />
    </div>

    <ul class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      <li v-for="placeholder in 6" :key="placeholder">
        <div class="border-default/60 bg-elevated/40 flex flex-col gap-3 rounded-2xl border p-4">
          <USkeleton class="h-40 w-full rounded-xl" />
          <div class="flex flex-col gap-2 px-2 pb-2">
            <USkeleton class="h-5 w-2/3" />
            <USkeleton class="h-4 w-1/2" />
          </div>
          <div class="mt-auto flex items-center justify-between gap-2 px-2 pb-1">
            <USkeleton class="h-5 w-24 rounded-full" />
            <USkeleton class="h-6 w-20 rounded-md" />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
