import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../src/i18n'
import ProfileEditPage from '../src/pages/ProfileEditPage'
import { useAuthStore } from '../src/stores/authStore'

const { mockPatch } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  AUTH_SESSION_KEY: 'auth_session',
  API_BASE: 'http://localhost:8000',
  default: {
    patch: mockPatch,
  },
}))

describe('ProfileEditPage', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    localStorage.clear()
    localStorage.setItem('access_token', 'token')
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'before@example.com',
        display_name: 'Before Name',
        avatar_url: null,
      },
      loading: false,
    })
  })

  it('renders existing profile information', () => {
    render(
      <ChakraProvider>
        <MemoryRouter>
          <ProfileEditPage />
        </MemoryRouter>
      </ChakraProvider>,
    )

    expect(screen.getByDisplayValue('Before Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('before@example.com')).toBeInTheDocument()
  })

  it('submits profile updates including avatar_url', async () => {
    mockPatch.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'after@example.com',
        display_name: 'After Name',
        avatar_url: 'https://example.com/avatar.png',
      },
    })

    render(
      <ChakraProvider>
        <MemoryRouter>
          <ProfileEditPage />
        </MemoryRouter>
      </ChakraProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: /표시 이름/i }), { target: { value: 'After Name' } })
    fireEvent.change(screen.getByRole('textbox', { name: /이메일/i }), { target: { value: 'after@example.com' } })
    fireEvent.change(screen.getByRole('textbox', { name: /아바타 URL/i }), { target: { value: 'https://example.com/avatar.png' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/users/me', {
        display_name: 'After Name',
        email: 'after@example.com',
        avatar_url: 'https://example.com/avatar.png',
      })
    })

    expect(useAuthStore.getState().user).toMatchObject({
      display_name: 'After Name',
      email: 'after@example.com',
      avatar_url: 'https://example.com/avatar.png',
    })
  })

  it('does not submit invalid email addresses', async () => {
    render(
      <ChakraProvider>
        <MemoryRouter>
          <ProfileEditPage />
        </MemoryRouter>
      </ChakraProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: /이메일/i }), { target: { value: 'invalid-email' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('올바른 이메일 주소를 입력해 주세요.')).toBeInTheDocument()
    expect(mockPatch).not.toHaveBeenCalled()
  })
})