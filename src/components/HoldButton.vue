<template>
  <n-button class="hold-button" :disabled="disabled"
    @click="click" @pointerdown="pointerDown"
    @pointerleave="pointerCancel" @blur="cancel"
    @keydown.space.prevent="spaceDown" @keyup.space.prevent="spaceUp">
    <slot :count="count" />
  </n-button>
</template>

<script setup lang="ts">
  import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

  const props = defineProps<{ disabled: boolean; interval?: number }>()
  const emit = defineEmits<{ activate: [continuous?: boolean]; holding: [active: boolean]; finished: [] }>()
  const count = ref(0)
  let source: number | 'space' | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let ignorePointerClick = false

  function stop() {
    if (source === null) return
    if (count.value > 0) emit('finished')
    clearTimeout(timer)
    source = null
    count.value = 0
    emit('holding', false)
  }
  function cancel() {
    if (typeof source === 'number') ignorePointerClick = true
    stop()
  }
  function repeat() {
    if (source === null || props.disabled || document.hidden) return cancel()
    if (typeof source === 'number') ignorePointerClick = true
    count.value++
    emit('activate', true)
    // Start slowly enough to release after a few actions, then accelerate.
    const delay = props.interval ?? (count.value < 4 ? 150 : count.value < 9 ? 90 : 55)
    timer = setTimeout(repeat, delay)
  }
  function start(key: number | 'space') {
    if (props.disabled || source !== null) return
    source = key
    count.value = 0
    emit('holding', true)
    timer = setTimeout(repeat, 250)
  }
  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || source !== null) return
    ignorePointerClick = false
    start(event.pointerId)
  }
  function pointerUp(event: PointerEvent) {
    if (source === event.pointerId) stop()
  }
  function pointerCancel(event: PointerEvent) {
    if (source === event.pointerId) cancel()
  }
  function click(event: MouseEvent) {
    if (props.disabled || source === 'space') return
    if (event.detail === 0 || !ignorePointerClick) emit('activate')
    ignorePointerClick = false
  }
  function spaceDown(event: KeyboardEvent) {
    if (!event.repeat) start('space')
  }
  function spaceUp() {
    if (source !== 'space') return
    if (!count.value && !props.disabled) emit('activate')
    stop()
  }
  function visibilityChanged() {
    if (document.hidden) cancel()
  }
  watch(() => props.disabled, disabled => { if (disabled) cancel() })
  onMounted(() => {
    window.addEventListener('pointerup', pointerUp, true)
    window.addEventListener('pointercancel', pointerCancel, true)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', visibilityChanged)
  })
  onBeforeUnmount(() => {
    cancel()
    window.removeEventListener('pointerup', pointerUp, true)
    window.removeEventListener('pointercancel', pointerCancel, true)
    window.removeEventListener('blur', cancel)
    document.removeEventListener('visibilitychange', visibilityChanged)
  })
</script>

<style scoped>
  .hold-button { touch-action: manipulation; user-select: none; }
</style>
