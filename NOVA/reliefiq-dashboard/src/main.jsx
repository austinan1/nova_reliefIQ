import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

console.log('React app initializing...')
console.log('React version:', React.version)

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found!')
  document.body.innerHTML = '<h1 style="color: red; padding: 20px;">Error: Root element not found</h1>'
} else {
  console.log('Root element found, mounting React app...')
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('React app mounted successfully')
  } catch (error) {
    console.error('Error mounting React app:', error)
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error Mounting App</h1>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `
  }
}

