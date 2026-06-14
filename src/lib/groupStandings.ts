import type { Match } from '../types'

export type StandingRow = {
  team: string
  flag: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  unresolvedTie: boolean
}

export type GroupStanding = {
  group: string
  rows: StandingRow[]
}

type MutableStanding = Omit<StandingRow, 'goalDifference' | 'unresolvedTie'>

function emptyStanding(team: string, flag: string): MutableStanding {
  return {
    team,
    flag,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }
}

function applyResult(
  standing: MutableStanding,
  goalsFor: number,
  goalsAgainst: number,
) {
  standing.played += 1
  standing.goalsFor += goalsFor
  standing.goalsAgainst += goalsAgainst

  if (goalsFor > goalsAgainst) {
    standing.won += 1
    standing.points += 3
  } else if (goalsFor === goalsAgainst) {
    standing.drawn += 1
    standing.points += 1
  } else {
    standing.lost += 1
  }
}

function headToHeadStats(teams: string[], matches: Match[]) {
  const teamSet = new Set(teams)
  const stats = new Map(
    teams.map((team) => [team, emptyStanding(team, '')]),
  )

  matches.forEach((match) => {
    if (
      match.status !== 'finished' ||
      match.home_score === null ||
      match.away_score === null ||
      !teamSet.has(match.home_team) ||
      !teamSet.has(match.away_team)
    ) {
      return
    }

    applyResult(stats.get(match.home_team)!, match.home_score, match.away_score)
    applyResult(stats.get(match.away_team)!, match.away_score, match.home_score)
  })

  return stats
}

function tupleKey(standing: MutableStanding) {
  return [
    standing.points,
    standing.goalsFor - standing.goalsAgainst,
    standing.goalsFor,
  ].join(':')
}

function compareMiniTable(a: MutableStanding, b: MutableStanding) {
  return (
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  )
}

function resolveOverallTie(rows: StandingRow[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team, 'pt-BR'),
  )

  for (let index = 0; index < sorted.length; index += 1) {
    const row = sorted[index]
    const previous = sorted[index - 1]
    const next = sorted[index + 1]
    row.unresolvedTie = [previous, next].some(
      (other) =>
        other &&
        other.goalDifference === row.goalDifference &&
        other.goalsFor === row.goalsFor,
    )
  }

  return sorted
}

function resolveHeadToHead(rows: StandingRow[], matches: Match[]): StandingRow[] {
  if (rows.length <= 1) return rows

  const stats = headToHeadStats(
    rows.map((row) => row.team),
    matches,
  )
  const sorted = [...rows].sort((a, b) =>
    compareMiniTable(stats.get(a.team)!, stats.get(b.team)!),
  )
  const partitions: StandingRow[][] = []

  sorted.forEach((row) => {
    const current = partitions.at(-1)
    if (
      !current ||
      tupleKey(stats.get(current[0].team)!) !== tupleKey(stats.get(row.team)!)
    ) {
      partitions.push([row])
    } else {
      current.push(row)
    }
  })

  if (partitions.length === 1) return resolveOverallTie(rows)

  return partitions.flatMap((partition) =>
    partition.length === rows.length
      ? resolveOverallTie(partition)
      : resolveHeadToHead(partition, matches),
  )
}

function rankGroup(rows: StandingRow[], matches: Match[]) {
  const pointGroups = new Map<number, StandingRow[]>()

  rows.forEach((row) => {
    const group = pointGroups.get(row.points) ?? []
    group.push(row)
    pointGroups.set(row.points, group)
  })

  return [...pointGroups.entries()]
    .sort(([a], [b]) => b - a)
    .flatMap(([, tiedRows]) => resolveHeadToHead(tiedRows, matches))
}

export function calculateGroupStandings(matches: Match[]): GroupStanding[] {
  const groupMatches = matches.filter((match) => /^Grupo [A-L]$/.test(match.stage))
  const groups = new Map<string, Match[]>()

  groupMatches.forEach((match) => {
    const group = groups.get(match.stage) ?? []
    group.push(match)
    groups.set(match.stage, group)
  })

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, matchesInGroup]) => {
      const standings = new Map<string, MutableStanding>()

      matchesInGroup.forEach((match) => {
        if (!standings.has(match.home_team)) {
          standings.set(
            match.home_team,
            emptyStanding(match.home_team, match.home_flag),
          )
        }
        if (!standings.has(match.away_team)) {
          standings.set(
            match.away_team,
            emptyStanding(match.away_team, match.away_flag),
          )
        }

        if (
          match.status === 'finished' &&
          match.home_score !== null &&
          match.away_score !== null
        ) {
          applyResult(
            standings.get(match.home_team)!,
            match.home_score,
            match.away_score,
          )
          applyResult(
            standings.get(match.away_team)!,
            match.away_score,
            match.home_score,
          )
        }
      })

      const rows = [...standings.values()].map((row) => ({
        ...row,
        goalDifference: row.goalsFor - row.goalsAgainst,
        unresolvedTie: false,
      }))

      return { group, rows: rankGroup(rows, matchesInGroup) }
    })
}
