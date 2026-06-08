import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initPortalTheme, initTheme, isPortalPath } from '@/themes/applyTheme'
import App from './App'
import './index.css'

if (isPortalPath(window.location.pathname)) {
  initPortalTheme()
} else {
  initTheme()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
