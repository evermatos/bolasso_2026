export type Score = {
  home: number
  away: number
}

function outcome(score: Score) {
  if (score.home === score.away) return 'draw'
  return score.home > score.away ? 'home' : 'away'
}

export function calculatePoints(prediction: Score, result: Score) {
  if (
    prediction.home === result.home &&
    prediction.away === result.away
  ) {
    return 7
  }

  const correctOutcome = outcome(prediction) === outcome(result)
  const oneExactTeamScore =
    prediction.home === result.home || prediction.away === result.away

  if (correctOutcome && oneExactTeamScore) return 5
  if (correctOutcome) return 3
  if (oneExactTeamScore) return 1
  return 0
}
