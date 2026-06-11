import { FormEvent, useState } from 'react'
import { LoaderCircle, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (mode === 'signup' && password !== passwordConfirmation) {
      setIsError(true)
      setMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    setMessage('')
    setIsError(false)

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: name.trim() },
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          })

    setLoading(false)
    setIsError(Boolean(result.error))

    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      setMessage(
        'Conta criada. Confirme o e-mail antes de entrar, ou desative essa exigência no Supabase.',
      )
    } else {
      setMessage(mode === 'signup' ? 'Conta criada com sucesso.' : '')
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-mark">
          <Trophy size={30} strokeWidth={2.4} />
        </div>
        <span className="eyebrow">COPA DO MUNDO 2026</span>
        <h1>Seu palpite.<br />Sua glória.</h1>
        <p>
          Chame a turma, arrisque os placares e acompanhe quem entende mesmo
          de futebol.
        </p>
        <div className="score-preview">
          <span>🇧🇷</span>
          <strong>2</strong>
          <small>×</small>
          <strong>1</strong>
          <span>🇦🇷</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="segmented">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Entre no bolão'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Use seu e-mail e sua senha para acessar.'
              : 'Crie uma conta para registrar seus palpites.'}
          </p>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Seu nome
                <input
                  minLength={2}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Como aparecerá no ranking"
                />
              </label>
            )}
            <label>
              E-mail
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
              />
            </label>
            <label>
              Senha
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="No mínimo 8 caracteres"
                required
                type="password"
                value={password}
              />
            </label>
            {mode === 'signup' && (
              <label>
                Confirme a senha
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  type="password"
                  value={passwordConfirmation}
                />
              </label>
            )}
            <button className="primary-button" disabled={loading} type="submit">
              {loading && <LoaderCircle className="spin" size={18} />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {message && (
            <p className={`form-message ${isError ? 'error' : ''}`}>{message}</p>
          )}

        </div>
      </section>
    </main>
  )
}
