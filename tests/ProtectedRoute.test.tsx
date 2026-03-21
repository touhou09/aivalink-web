import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '../src/stores/authStore'
import ProtectedRoute from '../src/components/ProtectedRoute'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ isAuthenticated: false, user: null })
  })

  it('redirects to login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true })

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
