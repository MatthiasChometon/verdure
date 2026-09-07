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

    <USkeleton class="mt-12 mb-4 h-6 w-24" />
    <div class="border-default flex flex-col gap-5 rounded-2xl border p-5">
      <div class="flex flex-col gap-2">
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-full" />
        <USkeleton class="h-4 w-3/4" />
      </div>
      <div class="flex items-center gap-2.5">
        <USkeleton class="size-8 shrink-0 rounded-full" />
        <div class="flex flex-col gap-1.5">
          <USkeleton class="h-3 w-14" />
          <USkeleton class="h-4 w-32" />
        </div>
      </div>
    </div>

    <USkeleton class="mt-12 mb-4 h-6 w-32" />
    <div class="border-default flex flex-col gap-5 rounded-2xl border p-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div v-for="attribute in 2" :key="`care-${attribute}`" class="flex items-center gap-3">
          <USkeleton class="size-10 shrink-0 rounded-full" />
          <div class="flex flex-1 flex-col gap-1.5">
            <USkeleton class="h-3 w-16" />
            <USkeleton class="h-4 w-24" />
          </div>
        </div>
      </div>
      <USkeleton class="h-4 w-4/5" />
    </div>

    <USkeleton class="mt-12 mb-4 h-6 w-48" />
    <div class="grid grid-cols-7 gap-px">
      <USkeleton v-for="cell in 42" :key="`cell-${cell}`" class="min-h-14 rounded-lg sm:min-h-20" />
    </div>

    <USkeleton class="mt-12 mb-3 h-6 w-32" />
    <USkeleton class="mb-4 h-28 w-full rounded-xl" />
    <div class="flex flex-col gap-2">
      <USkeleton v-for="row in 3" :key="`journal-row-${row}`" class="h-16 w-full rounded-xl" />
    </div>

    <USkeleton class="mt-12 mb-4 h-6 w-40" />
    <div class="flex flex-col gap-2">
      <USkeleton v-for="row in 3" :key="`row-${row}`" class="h-12 w-full rounded-xl" />
    </div>
  </div>
</template>
