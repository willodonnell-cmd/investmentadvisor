import { create } from 'zustand'
import React from 'react'

export interface TopBarConfig {
  title: string
  crumb?: string
  backTo?: string      // if set, renders a back breadcrumb instead of plain title
  backLabel?: string
  actions?: React.ReactNode
}

interface TopBarStore {
  config: TopBarConfig
  setConfig: (config: TopBarConfig) => void
}

export const useTopBarStore = create<TopBarStore>()((set) => ({
  config: { title: '' },
  setConfig: (config) => set({ config }),
}))

/** Hook for screens to inject their topbar config. Call at top level of each screen. */
export function useTopBar(config: TopBarConfig): void {
  const setConfig = useTopBarStore((s) => s.setConfig)
  const { title, crumb, backTo, backLabel } = config
  const actions = config.actions
  React.useEffect(() => {
    setConfig({ title, crumb, backTo, backLabel, actions })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, crumb, backTo, backLabel])
}
