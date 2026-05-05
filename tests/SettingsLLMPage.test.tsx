import { ChakraProvider } from '@chakra-ui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../src/i18n'
import SettingsLLMPage from '../src/pages/SettingsLLMPage'

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    delete: mockDelete,
  },
}))

function renderSettingsLLMPage() {
  render(
    <ChakraProvider>
      <MemoryRouter initialEntries={['/settings/llm']}>
        <Routes>
          <Route path="/settings/llm" element={<SettingsLLMPage />} />
          <Route path="/settings/tts" element={<div>TTS</div>} />
          <Route path="/settings/asr" element={<div>ASR</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </ChakraProvider>,
  )
}

describe('SettingsLLMPage', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockDelete.mockReset()
    mockGet.mockResolvedValue({ data: [] })
    mockPost.mockResolvedValue({ data: { id: 'llm-1' } })
    mockDelete.mockResolvedValue({})
  })

  it('creates the fixed AivaLink default OpenRouter model without provider or model controls', async () => {
    renderSettingsLLMPage()

    expect(screen.queryByLabelText(/제공자/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^모델$/i)).not.toBeInTheDocument()
    expect(screen.getByText(/기본 AI/i)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /이름/i }), { target: { value: '기본 히요리 AI' } })
    fireEvent.click(screen.getByRole('button', { name: /설정 추가/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/llm-configs', expect.objectContaining({
        name: '기본 히요리 AI',
        provider: 'openrouter',
        model_name: 'aivalink-default-chat',
        temperature: 0.7,
        max_tokens: 768,
      }))
    })
  })
})
