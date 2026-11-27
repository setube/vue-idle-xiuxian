import { useNotification } from 'naive-ui'
import type { NotificationOptions } from 'naive-ui'

const pending: Array<() => void> = []
let timer: ReturnType<typeof setTimeout> | undefined

function displayNext() {
  const display = pending.shift()
  if (!display) {
    timer = undefined
    return
  }
  display()
  timer = setTimeout(displayNext, pending.length > 12 ? 45 : 150)
}

export function useGameNotices() {
  const notifications = useNotification()
  return (title: string, content: NotificationOptions['content']) => {
    pending.push(() => notifications.create({ title, content, duration: 1800 }))
    if (timer === undefined) displayNext()
  }
}
