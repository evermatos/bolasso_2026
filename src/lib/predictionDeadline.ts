export const PREDICTION_LOCK_MINUTES = 5

export function getPredictionLockTime(kickoffAt: string) {
  return (
    new Date(kickoffAt).getTime() - PREDICTION_LOCK_MINUTES * 60 * 1000
  )
}

export function isPredictionLocked(kickoffAt: string, now = Date.now()) {
  return now >= getPredictionLockTime(kickoffAt)
}
