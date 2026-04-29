
import { createRoot } from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './index.css'
import { NexusErrorBoundary } from './components/NexusErrorBoundary'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <NexusErrorBoundary>
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  </NexusErrorBoundary>
)
