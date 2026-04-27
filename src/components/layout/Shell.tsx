import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export const Shell: React.FC = () => (
  <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary font-sans">
    <Sidebar />
    <div className="flex flex-col flex-1 min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  </div>
)
