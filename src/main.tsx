import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { msalInstance } from '@/config/msal'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()

msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster richColors position='top-right' />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
})
