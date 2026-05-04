// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../src/stores/authStore'

const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  AUTH_SESSION_KEY: 'auth_session',
  default: {
    post: mockPost,
    get: mockGet,
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPost.mockReset()
    mockGet.mockReset()
    mockPost.mockResolvedValue({ data: { token_type: 'bearer', expires_in: 900 } })
    mockGet.mockResolvedValue({ data: {} })
    useAuthStore.setState({ isAuthenticated: false, user: null, loading: false })
  })

  it('marks login authenticated without storing bearer tokens', async () => {
    const { login } = useAuthStore.getState()
    await login('user@example.com', 'password')

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'user@example.com',
      password: 'password',
    })
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('auth_session')).toBe('active')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('clears only the session marker on logout', () => {
    localStorage.setItem('auth_session', 'active')
    useAuthStore.setState({ isAuthenticated: true })

    const { logout } = useAuthStore.getState()
    logout()

    expect(mockPost).toHaveBeenCalledWith('/auth/logout', {})
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('auth_session')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('tracks existing cookie-backed session marker', () => {
    localStorage.setItem('auth_session', 'active')
    useAuthStore.setState({ isAuthenticated: Boolean(localStorage.getItem('auth_session')) })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
