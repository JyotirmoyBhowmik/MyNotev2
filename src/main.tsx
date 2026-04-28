
import { createRoot } from 'react-dom/client'
import './index.css'
import { NexusErrorBoundary } from './components/NexusErrorBoundary'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <NexusErrorBoundary>
    <App />
  </NexusErrorBoundary>
)
