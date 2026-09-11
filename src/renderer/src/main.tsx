import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CollabProvider } from './collab/CollabContext'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalErrorToast from './components/GlobalErrorToast'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CollabProvider>
        <App />
      </CollabProvider>
      <GlobalErrorToast />
    </ErrorBoundary>
  </React.StrictMode>
)
