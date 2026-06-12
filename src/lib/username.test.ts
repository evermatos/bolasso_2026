import { describe, expect, it } from 'vitest'
import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from './username'

describe('username helpers', () => {
  it('normalizes surrounding spaces and uppercase letters', () => {
    expect(normalizeUsername('  Everton_26 ')).toBe('everton_26')
  })

  it('turns spaces inside the username into underscores', () => {
    expect(normalizeUsername('Gilberto Barros')).toBe('gilberto_barros')
  })

  it('accepts supported usernames', () => {
    expect(isValidUsername('everton.26')).toBe(true)
    expect(isValidUsername('Gilberto Barros')).toBe(true)
  })

  it('rejects accents and short usernames', () => {
    expect(isValidUsername('ev')).toBe(false)
    expect(isValidUsername('évérton')).toBe(false)
  })

  it('creates a non-deliverable technical auth identifier', () => {
    expect(usernameToAuthEmail('Everton')).toBe('everton@bolasso.invalid')
    expect(usernameToAuthEmail('Gilberto Barros')).toBe(
      'gilberto_barros@bolasso.invalid',
    )
  })
})
