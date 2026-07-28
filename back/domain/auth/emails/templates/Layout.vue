<script setup lang="ts">
defineProps<{ preview: string }>();
</script>

<template>
  <div>
    <div style="display: none; max-height: 0; overflow: hidden">{{ preview }}</div>
    <div
      style="
        background-color: #f3f4f6;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        padding: 24px;
      "
    >
      <div
        style="
          background-color: #ffffff;
          border-radius: 12px;
          padding: 32px;
          max-width: 480px;
          margin: 0 auto;
        "
      >
        <h1 style="color: #166534; font-size: 20px; margin: 0 0 16px">🌱 verdure</h1>
        <slot />
      </div>
    </div>
  </div>
</template>
