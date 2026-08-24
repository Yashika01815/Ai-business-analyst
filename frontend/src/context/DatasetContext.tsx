import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { datasetsApi, DatasetSummary } from '../lib/api'
import { useAuth } from './AuthContext'

interface DatasetContextValue {
  datasets: DatasetSummary[]
  selectedId: number | null
  setSelectedId: (id: number | null) => void
  refresh: () => Promise<void>
  loading: boolean
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined)

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [selectedId, setSelectedIdState] = useState<number | null>(() => {
    const cached = localStorage.getItem('aba_selected_dataset')
    return cached ? Number(cached) : null
  })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await datasetsApi.list()
      setDatasets(res.data)
      if (res.data.length > 0 && !res.data.find(d => d.id === selectedId)) {
        setSelectedIdState(res.data[0].id)
      }
      if (res.data.length === 0) {
        setSelectedIdState(null)
      }
    } finally {
      setLoading(false)
    }
  }, [user, selectedId])

  useEffect(() => {
    if (user) refresh()
  }, [user])

  const setSelectedId = (id: number | null) => {
    setSelectedIdState(id)
    if (id) localStorage.setItem('aba_selected_dataset', String(id))
    else localStorage.removeItem('aba_selected_dataset')
  }

  return (
    <DatasetContext.Provider value={{ datasets, selectedId, setSelectedId, refresh, loading }}>
      {children}
    </DatasetContext.Provider>
  )
}

export function useDatasets() {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDatasets must be used within DatasetProvider')
  return ctx
}
