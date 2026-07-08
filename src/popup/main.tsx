import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PassageView } from './PassageView'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PassageView />
  </StrictMode>
)
