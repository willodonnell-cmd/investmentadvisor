import React from 'react'
import ReactDOM from 'react-dom/client'
import { migrateLifecycleLocalStorage } from './storage/lifecycleMigration'
import App from './App'
import './index.css'

migrateLifecycleLocalStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
