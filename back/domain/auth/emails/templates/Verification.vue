<script setup lang="ts">
import Layout from './Layout.vue';

defineProps<{ name: string; url: string }>();
</script>

<template>
  <Layout :preview="$t('verification.body')">
    <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px">
      {{ $t('verification.greeting', { name }) }}
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #4b5563">
      {{ $t('verification.body') }}
    </p>
    <p style="margin: 24px 0">
      <a
        :href="url"
        style="
          display: inline-block;
          background-color: #16a34a;
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
        "
        >{{ $t('verification.cta') }}</a
      >
    </p>
    <p style="font-size: 12px; color: #9ca3af">
      {{ $t('verification.fallback') }}<br />
      <a :href="url" style="color: #16a34a">{{ url }}</a>
    </p>
  </Layout>
</template>
