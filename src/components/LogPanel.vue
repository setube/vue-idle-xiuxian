<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '系统日志'
  }
})

// 日志数组，每条日志包含类型、内容和时间
const logs = ref([])
const scrollRef = ref(null)

// 添加日志的方法
const addLog = (type, content) => {
  // 检查content是否为空或仅包含空白字符
  if (!content || content.trim() === '') {
    return;
  }
  logs.value.push({
    type,
    content,
    time: new Date().toLocaleTimeString()
  })
  // 限制日志数量，保留最新的100条
  if (logs.value.length > 100) {
    logs.value.shift()
  }
  // 下一帧滚动到底部
  setTimeout(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTo({ top: 99999, behavior: 'smooth' })
    }
  })
}

// 暴露方法给父组件
defineExpose({
  addLog
})
</script>

<template>
  <n-card :title="title" class="log-panel">
    <n-scrollbar ref="scrollRef" trigger="none" style="max-height: 200px;">
      <div class="log-container">
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
    </n-scrollbar>
  </n-card>
</template>

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