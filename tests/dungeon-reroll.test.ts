import { expect, test } from 'bun:test'
import { getRandomOptions } from '../src/plugins/dungeon'

test('rerolling keeps just the marked option at its original position', () => {
  for (const floor of [1, 5, 10]) {
    const first = getRandomOptions(floor)
    for (const kept of ['', ...first.map(o => o.id)]) {
      const next = getRandomOptions(floor, first, kept)
      expect(new Set(next.map(o => o.id)).size).toBe(3)
      expect(next.filter(o => first.some(old => old.id === o.id)).map(o => o.id)).toEqual(kept ? [kept] : [])
      if (kept) expect(next[first.findIndex(o => o.id === kept)]).toBe(first.find(o => o.id === kept)!)
    }
  }
})
