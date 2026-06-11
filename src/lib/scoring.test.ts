import { describe, expect, it } from 'vitest'
import { calculatePoints } from './scoring'

describe('calculatePoints', () => {
  it('gives 7 points for the exact score', () => {
    expect(calculatePoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(7)
  })

  it('gives 5 points for outcome plus one exact team score', () => {
    expect(calculatePoints({ home: 2, away: 0 }, { home: 2, away: 1 })).toBe(5)
  })

  it('gives 3 points for the correct outcome', () => {
    expect(calculatePoints({ home: 3, away: 0 }, { home: 2, away: 1 })).toBe(3)
  })

  it('gives 1 point for one exact team score', () => {
    expect(calculatePoints({ home: 2, away: 4 }, { home: 2, away: 1 })).toBe(1)
  })

  it('gives no points when nothing matches', () => {
    expect(calculatePoints({ home: 0, away: 2 }, { home: 2, away: 1 })).toBe(0)
  })
})
