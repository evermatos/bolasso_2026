import { describe, expect, it } from 'vitest'
import {
  getPredictionLockTime,
  isPredictionLocked,
} from './predictionDeadline'

const kickoff = '2026-06-11T19:00:00Z'

describe('prediction deadline', () => {
  it('closes predictions exactly five minutes before kickoff', () => {
    expect(new Date(getPredictionLockTime(kickoff)).toISOString()).toBe(
      '2026-06-11T18:55:00.000Z',
    )
  })

  it('allows a prediction immediately before the deadline', () => {
    expect(isPredictionLocked(kickoff, Date.parse('2026-06-11T18:54:59Z'))).toBe(
      false,
    )
  })

  it('locks a prediction at the deadline', () => {
    expect(isPredictionLocked(kickoff, Date.parse('2026-06-11T18:55:00Z'))).toBe(
      true,
    )
  })
})
