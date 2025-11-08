import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('React app initializing...')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found!')
  document.body.innerHTML = '<h1>Error: Root element not found</h1>'
} else {
  console.log('Root element found, mounting React app...')
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('React app mounted successfully')
}

