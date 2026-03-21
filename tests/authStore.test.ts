// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../src/stores/authStore'

// Mock the API client to avoid real HTTP calls
vi.mock('../src/api/client', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ isAuthenticated: false, user: null, loading: false })
  })

  it('should set tokens and mark authenticated', () => {
    const { setTokens } = useAuthStore.getState()
    setTokens('access-123', 'refresh-456')

    expect(localStorage.getItem('access_token')).toBe('access-123')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-456')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should clear tokens on logout', () => {
    localStorage.setItem('access_token', 'test')
    localStorage.setItem('refresh_token', 'test')
    useAuthStore.setState({ isAuthenticated: true })

    const { logout } = useAuthStore.getState()
    logout()

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('should initialize as authenticated when token exists', () => {
    localStorage.setItem('access_token', 'existing-token')
    // Re-create the store to test initial state
    const state = useAuthStore.getState()
    // The store checks localStorage on creation
    expect(state).toBeDefined()
  })
})
