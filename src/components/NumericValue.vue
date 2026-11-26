<template>
  <span class="notranslate" translate="no" v-text="value == null ? '' : String(value)" />
</template>

<script setup lang="ts">
  defineProps<{ value: string | number | null | undefined }>()
</script>
