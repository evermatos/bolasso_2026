import { describe, expect, it } from 'vitest'
import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from './username'

describe('username helpers', () => {
  it('normalizes spaces and uppercase letters', () => {
    expect(normalizeUsername('  Everton_26 ')).toBe('everton_26')
  })

  it('accepts supported usernames', () => {
    expect(isValidUsername('everton.26')).toBe(true)
  })

  it('rejects spaces, accents and short usernames', () => {
    expect(isValidUsername('ev')).toBe(false)
    expect(isValidUsername('ever ton')).toBe(false)
    expect(isValidUsername('évérton')).toBe(false)
  })

  it('creates a non-deliverable technical auth identifier', () => {
    expect(usernameToAuthEmail('Everton')).toBe('everton@bolasso.invalid')
  })
})
