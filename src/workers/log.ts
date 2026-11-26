import type { LogEntry } from '../types/game'

type LogMessage = { type: 'ADD_LOG'; data: Pick<LogEntry, 'type' | 'content'> } | { type: 'CLEAR_LOGS' | 'GET_LOGS' }

// 日志处理Worker

let logs: LogEntry[] = []
const MAX_LOGS = 50

// 处理主线程发来的消息
self.onmessage = (e: MessageEvent<LogMessage>) => {
  switch (e.data.type) {
    case 'ADD_LOG':
      addLog(e.data.data)
      break
    case 'CLEAR_LOGS':
      clearLogs()
      break
    case 'GET_LOGS':
      sendLogs()
      break
  }
}

// 添加日志
function addLog(logData: Extract<LogMessage, { type: 'ADD_LOG' }>['data']) {
  if (!logData.content || logData.content.trim() === '') {
    return
  }

  logs.push({
    ...logData,
    time: new Date().toLocaleTimeString()
  })

  // 限制日志数量
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS)
  }

  // 发送更新后的日志给主线程
  sendLogs()
}

// 清空日志
function clearLogs() {
  logs = []
  sendLogs()
}

// 发送日志给主线程
function sendLogs() {
  self.postMessage({
    type: 'LOGS_UPDATED',
    logs: logs
  })
}
