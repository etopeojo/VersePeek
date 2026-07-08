import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsView } from './SettingsView'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsView />
  </StrictMode>
)
