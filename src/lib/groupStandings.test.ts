import { describe, expect, it } from 'vitest'
import type { Match } from '../types'
import { calculateGroupStandings } from './groupStandings'

function match(
  id: number,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
): Match {
  return {
    id,
    match_number: id,
    home_team: home,
    away_team: away,
    home_flag: '',
    away_flag: '',
    stage: 'Grupo A',
    kickoff_at: '2026-06-11T00:00:00Z',
    venue: null,
    status: 'finished',
    home_score: homeScore,
    away_score: awayScore,
  }
}

describe('calculateGroupStandings', () => {
  it('calculates points and goal statistics', () => {
    const [group] = calculateGroupStandings([
      match(1, 'Brasil', 'Japão', 2, 0),
      match(2, 'Brasil', 'Canadá', 1, 1),
    ])

    expect(group.rows[0]).toMatchObject({
      team: 'Brasil',
      played: 2,
      won: 1,
      drawn: 1,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDifference: 2,
      points: 4,
    })
  })

  it('uses head-to-head before overall goal difference', () => {
    const [group] = calculateGroupStandings([
      match(1, 'A', 'B', 1, 0),
      match(2, 'A', 'C', 0, 4),
      match(3, 'B', 'D', 5, 0),
    ])

    const teams = group.rows.map((row) => row.team)
    expect(teams.indexOf('A')).toBeLessThan(teams.indexOf('B'))
  })

  it('uses overall goal difference when head-to-head is still tied', () => {
    const [group] = calculateGroupStandings([
      match(1, 'A', 'B', 1, 1),
      match(2, 'A', 'C', 3, 0),
      match(3, 'B', 'D', 1, 0),
    ])

    const teams = group.rows.map((row) => row.team)
    expect(teams.indexOf('A')).toBeLessThan(teams.indexOf('B'))
  })

  it('marks ties that require fair play or FIFA ranking as provisional', () => {
    const [group] = calculateGroupStandings([
      match(1, 'A', 'B', 1, 1),
      match(2, 'C', 'D', 1, 1),
    ])

    expect(group.rows.every((row) => row.unresolvedTie)).toBe(true)
  })
})
