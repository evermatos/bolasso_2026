import { FormEvent, useState } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Props = {
  displayName: string
}

export function ProfileScreen({ displayName }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function updatePassword(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (password !== confirmation) {
      setIsError(true)
      setMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    setMessage('')
    setIsError(false)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    setIsError(Boolean(error))
    setMessage(
      error
        ? error.message
        : 'Senha definida com sucesso. Use-a no próximo acesso.',
    )

    if (!error) {
      setPassword('')
      setConfirmation('')
    }
  }

  return (
    <section className="profile-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MINHA CONTA</span>
          <h2>{displayName}</h2>
        </div>
        <KeyRound size={28} />
      </div>

      <p className="profile-username">@{displayName}</p>
      <p className="muted">
        Você entra usando este username e sua senha. A senha não pode ser
        visualizada pelo administrador.
      </p>

      <form className="profile-form" onSubmit={updatePassword}>
        <label>
          Nova senha
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="No mínimo 8 caracteres"
            required
            type="password"
            value={password}
          />
        </label>
        <label>
          Confirme a nova senha
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Digite a senha novamente"
            required
            type="password"
            value={confirmation}
          />
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading && <LoaderCircle className="spin" size={18} />}
          Salvar senha
        </button>
      </form>

      {message && (
        <p className={`form-message ${isError ? 'error' : ''}`}>{message}</p>
      )}
    </section>
  )
}
