import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </StrictMode>,
)
