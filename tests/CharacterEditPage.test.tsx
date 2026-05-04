import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../src/i18n'
import CharacterEditPage from '../src/pages/CharacterEditPage'

const { mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  AUTH_SESSION_KEY: 'auth_session',
  API_BASE: 'http://localhost:8000',
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
  },
}))

function renderCharacterEditPage(path = '/characters/new') {
  render(
    <ChakraProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
          <Route path="/characters/new" element={<CharacterEditPage />} />
        </Routes>
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe('CharacterEditPage', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()

    mockGet.mockImplementation((url: string) => {
      if (url === '/characters/live2d-models') {
        return Promise.resolve({
          data: [
            { id: 'haru', name: 'Haru', description: 'Default character model' },
            { id: 'hiyori', name: 'Hiyori', description: 'Casual character model' },
            { id: 'mao', name: 'Mao', description: 'Not bundled locally' },
          ],
        })
      }

      return Promise.resolve({ data: [] })
    })
    mockPost.mockResolvedValue({ data: { id: 'character-1' } })
    mockPut.mockResolvedValue({ data: { id: 'character-1' } })
  })

  it('submits a selected bundled Live2D model id for new partners', async () => {
    renderCharacterEditPage()

    const modelSelect = await screen.findByRole('combobox', { name: /내장 Live2D 모델/i })
    expect(screen.getByRole('option', { name: /Haru/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Hiyori/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Mao/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /파트너 이름/i }), { target: { value: '아이라' } })
    fireEvent.change(screen.getByRole('textbox', { name: /곁에 있는 방식/i }), { target: { value: '따뜻하게 대화한다.' } })
    fireEvent.change(modelSelect, { target: { value: 'hiyori' } })
    fireEvent.click(screen.getByRole('button', { name: '생성' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/characters', expect.objectContaining({
        name: '아이라',
        persona_prompt: '따뜻하게 대화한다.',
        live2d_model_id: 'hiyori',
      }))
    })
  })
})
