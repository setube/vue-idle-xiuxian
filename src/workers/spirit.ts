let timer: ReturnType<typeof setInterval> | null = null
const interval = 1000 // 1秒

self.onmessage = (e: MessageEvent<{ type: 'start' | 'stop' }>) => {
  if (e.data.type === 'start') {
    if (timer) return
    timer = setInterval(() => {
      self.postMessage({ type: 'gain' })
    }, interval)
  } else if (e.data.type === 'stop') {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
}
