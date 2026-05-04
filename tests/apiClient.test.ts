// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { csrfHeaderValue } from '../src/api/client'

describe('api client csrf helper', () => {
  beforeEach(() => {
    document.cookie = 'csrf_token=; Max-Age=0; path=/'
  })

  it('reads csrf token from cookie for state-changing requests', () => {
    document.cookie = 'csrf_token=csrf-123; path=/'
    expect(csrfHeaderValue()).toBe('csrf-123')
  })

  it('returns undefined when csrf cookie is missing', () => {
    expect(csrfHeaderValue()).toBeUndefined()
  })
})
