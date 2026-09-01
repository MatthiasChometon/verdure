<script setup lang="ts">
const { isOpen, close } = useReminders();
const {
  isSupported,
  isConfigured,
  isSubscribed,
  permission,
  isBusy,
  isReady,
  failed,
  refreshState,
  toggle,
} = usePushReminders();

// The permission was refused in the browser: we cannot re-ask, the reader must
// re-enable notifications in their browser settings.
const isBlocked = computed((): boolean => permission.value === 'denied');
// Push works here: supported by the browser and configured on the server.
const isAvailable = computed((): boolean => isSupported.value && isConfigured.value);

const onToggle = (enabled: boolean): Promise<void> => toggle(enabled);

// Read the live state (public key + this device's subscription) each time the
// dialog opens, so the switch reflects reality and never a stale value.
watch(isOpen, (open): void => {
  if (open) {
    void refreshState();
  }
});
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('reminders.title')">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-muted text-sm">{{ $t('reminders.lead') }}</p>

        <!-- Loading the current state: reserve the row so nothing jumps in. -->
        <template v-if="!isReady">
          <div
            class="border-default flex items-center gap-3 rounded-lg border px-3 py-3"
            aria-hidden="true"
          >
            <USkeleton class="size-5 rounded-full" />
            <USkeleton class="h-4 flex-1" />
            <USkeleton class="h-6 w-10 rounded-full" />
          </div>
          <span class="sr-only" role="status">{{ $t('reminders.loading') }}</span>
        </template>

        <template v-else>
          <!-- The toggle, when reminders can actually be armed on this device. -->
          <div
            v-if="isAvailable"
            class="border-default flex items-center gap-3 rounded-lg border px-3 py-3"
          >
            <UIcon name="i-lucide-bell" class="text-primary size-5 shrink-0" aria-hidden="true" />
            <label for="reminders-switch" class="flex-1 text-sm font-medium">
              {{ $t('reminders.toggle') }}
            </label>
            <USwitch
              id="reminders-switch"
              :model-value="isSubscribed"
              :loading="isBusy"
              :disabled="isBusy || isBlocked"
              :aria-label="$t('reminders.toggle')"
              @update:model-value="onToggle"
            />
          </div>

          <!-- Denied in the browser: nothing we can do from here. -->
          <UAlert
            v-if="isAvailable && isBlocked"
            color="warning"
            variant="soft"
            icon="i-lucide-bell-off"
            :title="$t('reminders.blocked.title')"
            :description="$t('reminders.blocked.description')"
          />

          <p v-if="isAvailable && isSubscribed && !isBusy" class="text-primary text-sm">
            {{ $t('reminders.enabledHint') }}
          </p>

          <!-- Browser without the Push/Notification APIs (e.g. iOS not installed
               to the home screen). -->
          <UAlert
            v-if="!isSupported"
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            :title="$t('reminders.unsupported.title')"
            :description="$t('reminders.unsupported.description')"
          />

          <!-- Supported browser, but the server has push disabled. -->
          <UAlert
            v-if="isSupported && !isConfigured"
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            :title="$t('reminders.unavailable.title')"
            :description="$t('reminders.unavailable.description')"
          />

          <p v-if="failed" class="text-error text-sm">
            {{ $t('reminders.failed') }}
          </p>
        </template>

        <div class="flex justify-end">
          <UButton variant="ghost" color="neutral" type="button" @click="close">
            {{ $t('reminders.close') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
