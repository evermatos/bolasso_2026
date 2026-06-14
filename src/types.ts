export type Profile = {
  id: string
  display_name: string
  avatar_key: string
  is_admin: boolean
}

export type Match = {
  id: number
  match_number: number
  home_team: string
  away_team: string
  home_flag: string
  away_flag: string
  stage: string
  kickoff_at: string
  venue: string | null
  status: 'scheduled' | 'finished'
  home_score: number | null
  away_score: number | null
}

export type Prediction = {
  match_id: number
  home_score: number
  away_score: number
  points: number | null
}

export type RankingRow = {
  user_id: string
  display_name: string
  avatar_key: string
  position_change: number
  total_points: number
  exact_scores: number
  predictions_count: number
}

export type ParticipantPrediction = {
  match_id: number
  match_number: number
  home_team: string
  away_team: string
  home_flag: string
  away_flag: string
  kickoff_at: string
  status: 'scheduled' | 'finished'
  final_home_score: number | null
  final_away_score: number | null
  predicted_home_score: number
  predicted_away_score: number
  points: number | null
}
