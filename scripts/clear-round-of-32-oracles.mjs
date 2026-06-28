import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

loadEnvFile('.env')
loadEnvFile('.env.local')

const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Configure SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})
const cutoff = new Date(Date.now() + 5 * 60 * 1000).toISOString()

const { data: matches, error: matchesError } = await supabase
  .from('matches')
  .select('id')
  .gte('match_number', 73)
  .lte('match_number', 88)
  .eq('status', 'scheduled')
  .gt('kickoff_at', cutoff)

if (matchesError) throw matchesError

const matchIds = matches.map((match) => match.id)
if (!matchIds.length) {
  console.log('Nenhuma previsão futura do polvo para limpar.')
  process.exit(0)
}

const { error: deleteError, count } = await supabase
  .from('oracle_predictions')
  .delete({ count: 'exact' })
  .in('match_id', matchIds)

if (deleteError) throw deleteError

console.log(`Previsões antigas do polvo removidas: ${count ?? 0}`)

function loadEnvFile(path) {
  if (!existsSync(path)) return

  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function env(key) {
  return process.env[key]?.trim()
}
