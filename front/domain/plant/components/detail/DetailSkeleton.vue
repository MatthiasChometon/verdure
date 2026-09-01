<template>
  <div>
    <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>

    <USkeleton class="mb-6 h-5 w-32 rounded-md" />

    <div class="flex flex-col gap-6 sm:flex-row">
      <USkeleton class="h-56 w-full rounded-2xl sm:h-64 sm:w-64" />
      <div class="flex flex-1 flex-col gap-3">
        <USkeleton class="h-9 w-2/3 sm:h-10" />
        <USkeleton class="h-6 w-1/2" />
        <div class="mt-auto flex items-center gap-3 pt-2">
          <USkeleton class="h-6 w-28 rounded-full" />
          <USkeleton class="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>

    <USkeleton class="mt-12 mb-4 h-6 w-48" />
    <div class="grid grid-cols-7 gap-px">
      <USkeleton v-for="cell in 42" :key="`cell-${cell}`" class="min-h-14 rounded-lg sm:min-h-20" />
    </div>

    <USkeleton class="mt-12 mb-4 h-6 w-40" />
    <div class="flex flex-col gap-2">
      <USkeleton v-for="row in 3" :key="`row-${row}`" class="h-12 w-full rounded-xl" />
    </div>
  </div>
</template>
