<template>
  <HoldButton v-slot="{ count }" class="meditation-button" type="primary" size="large" block :disabled="disabled"
    @activate="continuous => emit('meditate', continuous)"
    @holding="active => input.manualPress = active" @finished="emit('finished')">
    {{ count ? '连续打坐 · ' + count + ' 次' : '打坐修炼' }}（每次 {{ cost }} 灵力）
  </HoldButton>
</template>

<script setup lang="ts">
  import HoldButton from './HoldButton.vue'
  import { useCultivationInput } from '../stores/player'

  defineProps<{ cost: number; disabled: boolean }>()
  const emit = defineEmits<{ meditate: [continuous?: boolean]; finished: [] }>()
  const input = useCultivationInput()
</script>
