import { ChakraProvider } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../src/i18n'
import DashboardPage from '../src/pages/DashboardPage'

const { mockGet, mockLogout, mockLoadUser } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockLogout: vi.fn(),
  mockLoadUser: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  AUTH_SESSION_KEY: 'auth_session',
  API_BASE: 'http://localhost:8000',
  default: {
    get: mockGet,
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../src/stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    logout: mockLogout,
    loadUser: mockLoadUser,
    user: {
      id: 'user-1',
      email: 'user@example.com',
      display_name: '유저',
      avatar_url: null,
    },
  }),
}))

function renderDashboardPage() {
  render(
    <ChakraProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockLogout.mockReset()
    mockLoadUser.mockReset()
    mockLoadUser.mockResolvedValue(undefined)

    mockGet.mockImplementation((url: string) => {
      if (url === '/characters') {
        return Promise.resolve({
          data: [
            {
              id: 'character-1',
              name: '아이라',
              persona_prompt: '차분하게 곁에 머문다.',
              llm_config_id: null,
              tts_config_id: null,
              asr_config_id: null,
            },
          ],
        })
      }

      if (url === '/instances') {
        return Promise.resolve({ data: [] })
      }

      if (url === '/agents/character-1/state') {
        return Promise.resolve({
          data: {
            id: 'agent-state-1',
            character_id: 'character-1',
            status: 'idle',
            current_activity: '대기 중',
            last_emotion: 'relaxed',
            local_capability_mode: 'none',
            settings: {},
            last_active_at: '2026-05-06T01:02:03Z',
            created_at: '2026-05-06T01:00:00Z',
            updated_at: '2026-05-06T01:02:03Z',
          },
        })
      }

      if (url === '/agents/character-1/events?limit=3') {
        return Promise.resolve({
          data: [
            {
              id: 'event-1',
              character_id: 'character-1',
              instance_id: null,
              event_type: 'message.user',
              source: 'websocket',
              payload: { content_redacted: true, content_length: 12 },
              summary: null,
              created_at: '2026-05-06T01:02:03Z',
            },
          ],
        })
      }

      return Promise.resolve({ data: [] })
    })
  })

  it('shows agent state and redacted recent activity for each partner', async () => {
    renderDashboardPage()

    expect(await screen.findByText('아이라')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/agents/character-1/state')
      expect(mockGet).toHaveBeenCalledWith('/agents/character-1/events?limit=3')
    })

    expect(screen.getByText('Agent idle')).toBeInTheDocument()
    expect(screen.getByText('차분함')).toBeInTheDocument()
    expect(screen.getByText('로컬 접근 꺼짐')).toBeInTheDocument()
    expect(screen.getByText('최근 활동')).toBeInTheDocument()
    expect(screen.getByText('사용자 메시지 · 12자')).toBeInTheDocument()
  })
})
