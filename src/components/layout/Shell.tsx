import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export const Shell: React.FC = () => (
  <div style={{
    display: 'flex', height: '100vh', width: '100vw',
    overflow: 'hidden', background: '#ede9e0',
  }}>
    <Sidebar />
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <TopBar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  </div>
)
