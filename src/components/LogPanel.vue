<template>
  <n-divider>{{ title }}</n-divider>
  <n-card class="log-panel" >
    <n-space justify="end" style="margin-bottom: 8px;">
      <n-button size="small" @click="clearLogs" type="error" secondary>清空日志</n-button>
    </n-space>
    <n-scrollbar ref="scrollRef" trigger="none" style="max-height: 200px">
      <div class="log-container" v-if="logs.length">
        <div v-for="(log, index) in logs" :key="index" class="log-item">
          <n-tag :type="log.type" size="small" class="log-type">
            {{ log.time }}
          </n-tag>
          <span class="log-content">
            <n-gradient-text :type="log.type">
              {{ log.content }}
            </n-gradient-text>
          </span>
        </div>
      </div>
      <n-empty v-else description="暂无日志" />
    </n-scrollbar>
  </n-card>
</template>

<script setup lang="ts">
  import { ref, shallowRef, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import type { ScrollbarInst } from 'naive-ui'
  import type { LogEntry, MessageType } from '../types/game'

  const props = withDefaults(defineProps<{ title?: string; messages?: LogEntry[] }>(), {
    title: '系统日志',
    messages: () => []
  })
  const logs = ref<LogEntry[]>([])
  const scrollRef = ref<ScrollbarInst | null>(null)
  const logWorker = shallowRef<Worker | null>(null)
  let scrollScheduled = false
  let mounted = true

  const scrollToLatest = async () => {
    if (scrollScheduled) return
    scrollScheduled = true
    await nextTick()
    if (mounted) scrollRef.value?.scrollTo({ top: 99999 })
    scrollScheduled = false
  }

  onMounted(() => {
    logWorker.value = new Worker(new URL('../workers/log.ts', import.meta.url), { type: 'module' })
    logWorker.value.onmessage = (event: MessageEvent<{ type: string; logs: LogEntry[] }>) => {
      if (event.data.type !== 'LOGS_UPDATED') return
      logs.value = event.data.logs
      void scrollToLatest()
    }
    props.messages.forEach(log => addLog(log.type, log.content))
  })

  onUnmounted(() => {
    mounted = false
    logWorker.value?.terminate()
    logWorker.value = null
  })

  const addLog = (type: MessageType, content: string) => {
    logWorker.value?.postMessage({ type: 'ADD_LOG', data: { type, content } })
  }
  const clearLogs = () => {
    logWorker.value?.postMessage({ type: 'CLEAR_LOGS' })
  }
  watch(() => props.messages, messages => {
    clearLogs()
    messages.forEach(log => addLog(log.type, log.content))
  })
  defineExpose({ addLog, clearLogs })
</script>

<style scoped>
  .log-panel {
    margin-top: 12px;
  }

  .log-container {
    padding: 8px;
  }

  .log-item {
    margin-bottom: 8px;
    display: flex;
    align-items: flex-start;
  }

  .log-type {
    margin-right: 8px;
    flex-shrink: 0;
  }

  .log-content {
    flex-grow: 1;
    word-break: break-all;
  }
</style>
