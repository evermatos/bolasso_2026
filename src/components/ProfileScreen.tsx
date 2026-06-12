import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, LoaderCircle, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidUsername } from '../lib/username'

type Props = {
  displayName: string
  onUsernameUpdated: () => Promise<void>
}

export function ProfileScreen({ displayName, onUsernameUpdated }: Props) {
  const [username, setUsername] = useState(displayName)
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameError, setUsernameError] = useState(false)
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => setUsername(displayName), [displayName])

  async function updateUsername(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (!isValidUsername(username)) {
      setUsernameError(true)
      setUsernameMessage(
        'Use de 3 a 24 caracteres: letras sem acento, números, espaços, ponto, hífen ou sublinhado.',
      )
      return
    }

    setUsernameLoading(true)
    setUsernameMessage('')
    setUsernameError(false)

    const { error } = await supabase.rpc('update_username', {
      new_username: username.trim(),
    })

    setUsernameLoading(false)
    setUsernameError(Boolean(error))
    setUsernameMessage(
      error
        ? error.message
        : 'Username atualizado. Use o novo nome no próximo login.',
    )

    if (!error) await onUsernameUpdated()
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (password !== confirmation) {
      setPasswordError(true)
      setPasswordMessage('As senhas não coincidem.')
      return
    }

    setPasswordLoading(true)
    setPasswordMessage('')
    setPasswordError(false)

    const { error } = await supabase.auth.updateUser({ password })

    setPasswordLoading(false)
    setPasswordError(Boolean(error))
    setPasswordMessage(
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

      <form className="profile-form" onSubmit={updateUsername}>
        <div className="profile-form-heading">
          <UserRound size={20} />
          <strong>Alterar username</strong>
        </div>
        <label>
          Username
          <input
            autoCapitalize="none"
            autoComplete="username"
            maxLength={24}
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ex.: Gilberto Barros"
            required
            value={username}
          />
        </label>
        <button
          className="primary-button"
          disabled={usernameLoading || username.trim() === displayName}
          type="submit"
        >
          {usernameLoading && <LoaderCircle className="spin" size={18} />}
          Salvar username
        </button>
        {usernameMessage && (
          <p className={`form-message ${usernameError ? 'error' : ''}`}>
            {usernameMessage}
          </p>
        )}
      </form>

      <form className="profile-form profile-password-form" onSubmit={updatePassword}>
        <div className="profile-form-heading">
          <KeyRound size={20} />
          <strong>Alterar senha</strong>
        </div>
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
        <button className="primary-button" disabled={passwordLoading} type="submit">
          {passwordLoading && <LoaderCircle className="spin" size={18} />}
          Salvar senha
        </button>
        {passwordMessage && (
          <p className={`form-message ${passwordError ? 'error' : ''}`}>
            {passwordMessage}
          </p>
        )}
      </form>
    </section>
  )
}
