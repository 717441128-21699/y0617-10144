import { create } from 'zustand'

export interface DataAsset {
  id: number
  system_name: string
  data_type: string
  processing_purpose: string
  subject_type: string
  retention_period: string
  legal_basis: string
  created_at: string
  updated_at: string
}

export interface ConsentVersion {
  id: number
  version: string
  content: string
  effective_date: string
  is_current: boolean
  created_at: string
}

export interface ConsentRecord {
  id: number
  consent_version_id: number
  subject_name: string
  subject_email: string
  is_granted: boolean
  granted_at: string
  withdrawn_at: string | null
  consent_version?: string
}

export interface WithdrawalTask {
  id: number
  consent_record_id: number
  data_asset_id: number
  status: 'pending' | 'processing' | 'completed'
  completed_at: string | null
  data_asset?: DataAsset
}

export interface SubjectRequest {
  id: number
  request_type: 'access' | 'deletion' | 'export'
  subject_name: string
  subject_email: string
  description: string
  status: 'pending' | 'assigned' | 'processing' | 'completed' | 'overdue'
  assigned_team: string | null
  deadline: string
  created_at: string
  completed_at: string | null
}

export interface RequestTimeline {
  id: number
  subject_request_id: number
  action: string
  performed_by: string
  performed_at: string
}

export interface BreachEvent {
  id: number
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  discovered_at: string
  contained_at: string | null
  affected_count: number
  status: 'investigating' | 'contained' | 'resolved'
  created_at: string
}

export interface BreachNotification {
  id: number
  breach_event_id: number
  notify_type: 'regulator' | 'affected_persons' | 'internal'
  recipient: string
  notified_at: string | null
  content: string
}

export interface DashboardStats {
  totalAssets: number
  pendingRequests: number
  openBreaches: number
  consentStats: {
    total: number
    granted: number
    withdrawn: number
    pendingWithdrawals: number
  }
  overdueRequests: number
  resolvedBreaches: number
}

interface AppState {
  dataAssets: DataAsset[]
  consentVersions: ConsentVersion[]
  consentRecords: ConsentRecord[]
  withdrawalTasks: WithdrawalTask[]
  subjectRequests: SubjectRequest[]
  requestTimelines: RequestTimeline[]
  breachEvents: BreachEvent[]
  breachNotifications: BreachNotification[]
  dashboardStats: DashboardStats
  loading: Record<string, boolean>

  fetchDataAssets: () => Promise<void>
  createDataAsset: (data: Omit<DataAsset, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateDataAsset: (id: number, data: Partial<DataAsset>) => Promise<void>
  deleteDataAsset: (id: number) => Promise<void>

  fetchConsentVersions: () => Promise<void>
  createConsentVersion: (data: Omit<ConsentVersion, 'id' | 'created_at'>) => Promise<void>

  fetchConsentRecords: () => Promise<void>
  createConsentRecord: (data: { consent_version_id: number; subject_name: string; subject_email: string }) => Promise<void>
  withdrawConsent: (id: number) => Promise<void>

  fetchWithdrawalTasks: () => Promise<void>
  updateWithdrawalTask: (id: number, data: Partial<WithdrawalTask>) => Promise<void>

  fetchSubjectRequests: () => Promise<void>
  createSubjectRequest: (data: Omit<SubjectRequest, 'id' | 'created_at' | 'completed_at'>) => Promise<void>
  updateSubjectRequest: (id: number, data: Partial<SubjectRequest>) => Promise<void>
  assignTeam: (id: number, team: string) => Promise<void>
  completeRequest: (id: number, result: string) => Promise<void>

  fetchRequestTimeline: (requestId: number) => Promise<void>

  fetchBreachEvents: () => Promise<void>
  createBreachEvent: (data: Omit<BreachEvent, 'id' | 'created_at'>) => Promise<void>
  updateBreachEvent: (id: number, data: Partial<BreachEvent>) => Promise<void>

  fetchBreachNotifications: (breachId: number) => Promise<void>
  addBreachNotification: (breachId: number, data: Omit<BreachNotification, 'id' | 'breach_event_id'>) => Promise<void>

  fetchDashboardStats: () => Promise<void>
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  const json = await res.json()
  return json.data as T
}

export const useAppStore = create<AppState>((set, get) => ({
  dataAssets: [],
  consentVersions: [],
  consentRecords: [],
  withdrawalTasks: [],
  subjectRequests: [],
  requestTimelines: [],
  breachEvents: [],
  breachNotifications: [],
  dashboardStats: { totalAssets: 0, pendingRequests: 0, openBreaches: 0, consentStats: { total: 0, granted: 0, withdrawn: 0, pendingWithdrawals: 0 }, overdueRequests: 0, resolvedBreaches: 0 },
  loading: {},

  fetchDataAssets: async () => {
    set((s) => ({ loading: { ...s.loading, dataAssets: true } }))
    try {
      const data = await apiFetch<DataAsset[]>('/api/data-assets')
      set({ dataAssets: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, dataAssets: false } }))
    }
  },

  createDataAsset: async (data) => {
    await apiFetch('/api/data-assets', { method: 'POST', body: JSON.stringify(data) })
    await get().fetchDataAssets()
  },

  updateDataAsset: async (id, data) => {
    await apiFetch(`/api/data-assets/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchDataAssets()
  },

  deleteDataAsset: async (id) => {
    await apiFetch(`/api/data-assets/${id}`, { method: 'DELETE' })
    await get().fetchDataAssets()
  },

  fetchConsentVersions: async () => {
    set((s) => ({ loading: { ...s.loading, consentVersions: true } }))
    try {
      const data = await apiFetch<ConsentVersion[]>('/api/consent/versions')
      set({ consentVersions: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, consentVersions: false } }))
    }
  },

  createConsentVersion: async (data) => {
    await apiFetch('/api/consent/versions', { method: 'POST', body: JSON.stringify(data) })
    await get().fetchConsentVersions()
  },

  fetchConsentRecords: async () => {
    set((s) => ({ loading: { ...s.loading, consentRecords: true } }))
    try {
      const data = await apiFetch<ConsentRecord[]>('/api/consent/records')
      set({ consentRecords: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, consentRecords: false } }))
    }
  },

  createConsentRecord: async (data) => {
    await apiFetch('/api/consent/records', { method: 'POST', body: JSON.stringify(data) })
    await get().fetchConsentRecords()
  },

  withdrawConsent: async (id) => {
    await apiFetch(`/api/consent/records/${id}/withdraw`, { method: 'POST' })
    await get().fetchConsentRecords()
    await get().fetchWithdrawalTasks()
  },

  fetchWithdrawalTasks: async () => {
    set((s) => ({ loading: { ...s.loading, withdrawalTasks: true } }))
    try {
      const data = await apiFetch<WithdrawalTask[]>('/api/consent/withdrawal-tasks')
      set({ withdrawalTasks: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, withdrawalTasks: false } }))
    }
  },

  updateWithdrawalTask: async (id, data) => {
    await apiFetch(`/api/consent/withdrawal-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchWithdrawalTasks()
  },

  fetchSubjectRequests: async () => {
    set((s) => ({ loading: { ...s.loading, subjectRequests: true } }))
    try {
      const data = await apiFetch<SubjectRequest[]>('/api/subject-requests')
      set({ subjectRequests: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, subjectRequests: false } }))
    }
  },

  createSubjectRequest: async (data) => {
    await apiFetch('/api/subject-requests', { method: 'POST', body: JSON.stringify(data) })
    await get().fetchSubjectRequests()
  },

  updateSubjectRequest: async (id, data) => {
    await apiFetch(`/api/subject-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchSubjectRequests()
  },

  assignTeam: async (id, team) => {
    await apiFetch(`/api/subject-requests/${id}/assign`, { method: 'POST', body: JSON.stringify({ team }) })
    await get().fetchSubjectRequests()
  },

  completeRequest: async (id, result) => {
    await apiFetch(`/api/subject-requests/${id}/complete`, { method: 'POST', body: JSON.stringify({ result }) })
    await get().fetchSubjectRequests()
  },

  fetchRequestTimeline: async (requestId) => {
    try {
      const data = await apiFetch<RequestTimeline[]>(`/api/subject-requests/${requestId}/timeline`)
      set({ requestTimelines: data })
    } catch {}
  },

  fetchBreachEvents: async () => {
    set((s) => ({ loading: { ...s.loading, breachEvents: true } }))
    try {
      const data = await apiFetch<BreachEvent[]>('/api/breaches')
      set({ breachEvents: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, breachEvents: false } }))
    }
  },

  createBreachEvent: async (data) => {
    await apiFetch('/api/breaches', { method: 'POST', body: JSON.stringify(data) })
    await get().fetchBreachEvents()
  },

  updateBreachEvent: async (id, data) => {
    await apiFetch(`/api/breaches/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    await get().fetchBreachEvents()
  },

  fetchBreachNotifications: async (breachId) => {
    try {
      const data = await apiFetch<BreachNotification[]>(`/api/breaches/${breachId}/notifications`)
      set({ breachNotifications: data })
    } catch {}
  },

  addBreachNotification: async (breachId, data) => {
    await apiFetch(`/api/breaches/${breachId}/notify`, { method: 'POST', body: JSON.stringify(data) })
    await get().fetchBreachNotifications(breachId)
  },

  fetchDashboardStats: async () => {
    set((s) => ({ loading: { ...s.loading, dashboard: true } }))
    try {
      const data = await apiFetch<DashboardStats>('/api/audit/dashboard')
      set({ dashboardStats: data })
    } finally {
      set((s) => ({ loading: { ...s.loading, dashboard: false } }))
    }
  },
}))
