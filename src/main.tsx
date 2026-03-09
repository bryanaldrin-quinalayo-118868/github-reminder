import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { msalInstance } from '@/config/msal'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient()

msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={300}>
              <App />
              <Toaster richColors position='top-right' />
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </StrictMode>,
    )
  })
})
