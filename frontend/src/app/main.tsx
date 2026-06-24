import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './providers/ThemeProvider'
import { AuthProvider } from './providers/AuthProvider'
import { AppInfoProvider } from './providers/AppInfoProvider'
import App from './App'
import '../index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter basename="/app">
        <AppInfoProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppInfoProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
