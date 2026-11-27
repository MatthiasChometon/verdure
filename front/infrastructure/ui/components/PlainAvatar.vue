<script setup lang="ts">
import { avatarInitials, plainAvatarClasses } from '../utils/plainAvatar';

// An avatar that looks like Nuxt UI's `UAvatar` at size `sm` (same classes, checked against its
// theme) without its per-instance cost. An image that fails to load falls back to the initials,
// as `UAvatar` does.
const { src = undefined, alt } = defineProps<{ src?: string | undefined; alt: string }>();

const failed = ref(false);
</script>

<template>
  <span :class="plainAvatarClasses.root">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      width="28"
      height="28"
      :class="plainAvatarClasses.image"
      @error="failed = true"
    />
    <span v-else :class="plainAvatarClasses.fallback">{{ avatarInitials(alt) }}</span>
  </span>
</template>
