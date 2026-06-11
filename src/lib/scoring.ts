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
    return 5
  }

  const outcomePoints = outcome(prediction) === outcome(result) ? 3 : 0
  const oneScorePoint =
    prediction.home === result.home || prediction.away === result.away ? 1 : 0

  return outcomePoints + oneScorePoint
}
