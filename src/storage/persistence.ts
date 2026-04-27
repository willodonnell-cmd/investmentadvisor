import { createJSONStorage } from 'zustand/middleware'

declare global {
  interface Window {
    storage?: {
      getItem: (key: string) => string | null
      setItem: (key: string, value: string) => void
      removeItem: (key: string) => void
    }
  }
}

const getBackingStorage = (): Storage | typeof window.storage => {
  return window.storage ?? localStorage
}

export const createStorage = () =>
  createJSONStorage(() => ({
    getItem: (key: string) => {
      try { return getBackingStorage()?.getItem(key) ?? null }
      catch { return null }
    },
    setItem: (key: string, value: string) => {
      try { getBackingStorage()?.setItem(key, value) }
      catch { /* ignore */ }
    },
    removeItem: (key: string) => {
      try { getBackingStorage()?.removeItem(key) }
      catch { /* ignore */ }
    },
  }))
