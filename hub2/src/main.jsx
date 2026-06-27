import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
// Auto-refresh when a new deployment's service worker takes control, so the
// installed app never keeps serving a stale bundle.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return; reloaded = true
    if (hadController) window.location.reload()
  })
}
