<template>
  <div>
    <span class="sr-only" role="status">{{ $t('plant.loading') }}</span>

    <div class="flex flex-col gap-12">
      <!-- Same boxes as PlantDetailHero: back link (text-sm, 20 px), photo (h-56 / sm:h-64),
           title (text-3xl 36 px / sm:text-4xl 40 px), species (text-lg, 28 px). -->
      <div class="flex flex-col gap-6">
        <UiSkeleton class="h-5 w-32 rounded-md" />
        <div class="flex flex-col gap-6 sm:flex-row sm:items-stretch">
          <UiSkeleton class="h-56 w-full rounded-2xl sm:h-64 sm:w-64" />
          <div class="flex min-w-0 flex-1 flex-col gap-3">
            <div class="flex flex-col gap-1">
              <UiSkeleton class="h-9 w-2/3 sm:h-10" />
              <UiSkeleton class="h-7 w-1/2" />
            </div>
            <div class="mt-auto flex flex-wrap items-center gap-3 pt-2">
              <UiSkeleton class="h-6 w-28 rounded-full" />
              <UiSkeleton class="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bio: heading (text-lg, 28 px) then the card, gap-6 like the page. -->
      <div class="flex flex-col gap-6">
        <UiSkeleton class="h-7 w-24" />
        <div class="border-default flex min-h-40 flex-col gap-5 rounded-2xl border p-5">
          <div class="flex flex-col gap-2">
            <UiSkeleton class="h-6 w-full" />
            <UiSkeleton class="h-6 w-full" />
            <UiSkeleton class="h-6 w-3/4" />
          </div>
          <div class="flex items-center gap-2.5">
            <UiSkeleton class="size-8 shrink-0 rounded-full" />
            <div class="flex flex-col gap-1.5">
              <UiSkeleton class="h-3 w-14" />
              <UiSkeleton class="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      <!-- Care sheet, then the schedules (rows of the care section). -->
      <div class="flex flex-col gap-6">
        <UiSkeleton class="h-7 w-32" />
        <div class="border-default flex flex-col gap-5 rounded-2xl border p-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="attribute in 2" :key="`care-${attribute}`" class="flex items-center gap-3">
              <UiSkeleton class="size-10 shrink-0 rounded-full" />
              <div class="flex flex-1 flex-col gap-1.5">
                <UiSkeleton class="h-3 w-16" />
                <UiSkeleton class="h-4 w-24" />
              </div>
            </div>
          </div>
          <UiSkeleton class="h-5 w-4/5" />
        </div>
        <div class="grid min-h-60 gap-3 sm:grid-cols-2">
          <UiSkeleton v-for="row in 4" :key="`schedule-${row}`" class="h-28 rounded-xl" />
        </div>
      </div>
    </div>

    <UiSkeleton class="mt-12 mb-4 h-6 w-48" />
    <div class="grid grid-cols-7 gap-px">
      <UiSkeleton v-for="cell in 42" :key="`cell-${cell}`" class="min-h-14 rounded-lg sm:min-h-20" />
    </div>

    <UiSkeleton class="mt-12 mb-3 h-6 w-32" />
    <UiSkeleton class="mb-4 h-28 w-full rounded-xl" />
    <div class="flex flex-col gap-2">
      <UiSkeleton v-for="row in 3" :key="`journal-row-${row}`" class="h-16 w-full rounded-xl" />
    </div>

    <UiSkeleton class="mt-12 mb-4 h-6 w-40" />
    <div class="flex flex-col gap-2">
      <UiSkeleton v-for="row in 3" :key="`row-${row}`" class="h-12 w-full rounded-xl" />
    </div>
  </div>
</template>
