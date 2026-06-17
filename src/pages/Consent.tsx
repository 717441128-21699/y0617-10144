import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useAppStore, type ConsentVersion, type ConsentRecord, type WithdrawalTask, type DataAsset } from '@/stores/appStore'
import StatusBadge from '@/components/StatusBadge'

type TabKey = 'versions' | 'records' | 'withdrawals'

export default function Consent() {
  const [activeTab, setActiveTab] = useState<TabKey>('versions')
  const {
    consentVersions, consentRecords, withdrawalTasks, dataAssets,
    fetchConsentVersions, fetchConsentRecords, fetchWithdrawalTasks, fetchDataAssets,
    createConsentVersion, createConsentRecord, withdrawConsent, updateWithdrawalTask,
  } = useAppStore()

  const [statusFilter, setStatusFilter] = useState('all')
  const [versionFilter, setVersionFilter] = useState<number | 'all'>('all')
  const [emailFilter, setEmailFilter] = useState('')
  const [searchApplied, setSearchApplied] = useState<{ status: string; version: number | 'all'; email: string }>({ status: 'all', version: 'all', email: '' })

  const applyFilters = () => {
    setSearchApplied({ status: statusFilter, version: versionFilter, email: emailFilter })
  }

  const refreshWithFilters = () => {
    fetchConsentRecords({
      status: searchApplied.status === 'all' ? undefined : searchApplied.status,
      version_id: searchApplied.version === 'all' ? undefined : searchApplied.version,
      email: searchApplied.email || undefined,
    })
  }

  useEffect(() => {
    fetchConsentVersions()
    fetchDataAssets()
    fetchWithdrawalTasks()
  }, [])

  useEffect(() => {
    refreshWithFilters()
  }, [searchApplied.status, searchApplied.version, searchApplied.email])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'versions', label: '同意版本' },
    { key: 'records', label: '同意记录' },
    { key: 'withdrawals', label: '撤回任务' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'versions' && <VersionsTab versions={consentVersions} onCreate={createConsentVersion} />}
      {activeTab === 'records' && (
        <RecordsTab
          records={consentRecords}
          versions={consentVersions}
          statusFilter={statusFilter}
          versionFilter={versionFilter}
          emailFilter={emailFilter}
          setStatusFilter={setStatusFilter}
          setVersionFilter={setVersionFilter}
          setEmailFilter={setEmailFilter}
          applyFilters={applyFilters}
          onCreate={(d) => createConsentRecord(d).then(() => refreshWithFilters())}
          onWithdraw={(id) => withdrawConsent(id).then(() => refreshWithFilters())}
        />
      )}
      {activeTab === 'withdrawals' && <WithdrawalsTab tasks={withdrawalTasks} assets={dataAssets} onUpdate={updateWithdrawalTask} />}
    </div>
  )
}

function VersionsTab({ versions, onCreate }: { versions: ConsentVersion[]; onCreate: (d: any) => Promise<void> }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ version: '', content: '', effective_date: '', is_current: false })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate(form)
    setShowModal(false)
    setForm({ version: '', content: '', effective_date: '', is_current: false })
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus size={18} />新增版本
        </button>
      </div>

      <div className="grid gap-4">
        {versions.map((v) => (
          <div key={v.id} className={`bg-white rounded-xl p-5 card-shadow-md border-l-4 ${v.is_current ? 'border-accent-500' : 'border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-heading font-semibold text-primary-800">版本 {v.version}</h3>
                {v.is_current && <StatusBadge label="当前版本" variant="success" />}
              </div>
              <span className="text-sm text-gray-500">生效日期: {new Date(v.effective_date).toLocaleDateString('zh-CN')}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{v.content}</p>
          </div>
        ))}
        {versions.length === 0 && <p className="text-center text-gray-400 py-8">暂无同意版本</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading text-lg font-semibold text-primary-800">新增同意版本</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={4} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生效日期</label>
                <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} className="rounded" />
                设为当前版本
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function RecordsTab({ records, versions, statusFilter, versionFilter, emailFilter, setStatusFilter, setVersionFilter, setEmailFilter, applyFilters, onCreate, onWithdraw }: {
  records: ConsentRecord[]
  versions: ConsentVersion[]
  statusFilter: string
  versionFilter: number | 'all'
  emailFilter: string
  setStatusFilter: (s: string) => void
  setVersionFilter: (v: number | 'all') => void
  setEmailFilter: (s: string) => void
  applyFilters: () => void
  onCreate: (d: { consent_version_id: number; subject_name: string; subject_email: string }) => Promise<void>
  onWithdraw: (id: number) => Promise<void>
}) {
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [recordTasks, setRecordTasks] = useState<WithdrawalTask[]>([])
  const currentVersion = versions.find((v) => v.is_current)
  const [form, setForm] = useState({ consent_version_id: 0, subject_name: '', subject_email: '' })

  const getVersionLabel = (versionId: number) => {
    const v = versions.find((v) => v.id === versionId)
    return v ? `v${v.version}` : `#${versionId}`
  }

  const isWithdrawn = (r: ConsentRecord) => !!r.withdrawn_at

  const handleExpand = async (id: number, alreadyWithdrawn: boolean) => {
    if (!alreadyWithdrawn) {
      setExpandedId(expandedId === id ? null : id)
      return
    }
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      try {
        const res = await fetch(`/api/consent/records/${id}/tasks`)
        const json = await res.json()
        if (json.success) {
          setRecordTasks(json.data)
        }
        setExpandedId(id)
      } catch {
        setExpandedId(id)
      }
    }
  }

  const statusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成' }[s] || s)
  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { pending: 'neutral', processing: 'warning', completed: 'success' }
    return map[s] || 'neutral'
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.consent_version_id) return
    await onCreate({ consent_version_id: form.consent_version_id, subject_name: form.subject_name, subject_email: form.subject_email })
    setShowModal(false)
    setForm({ consent_version_id: 0, subject_name: '', subject_email: '' })
  }

  const openCreateModal = () => {
    setForm({
      consent_version_id: currentVersion?.id || 0,
      subject_name: '',
      subject_email: '',
    })
    setShowModal(true)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="granted">已同意</option>
            <option value="withdrawn">已撤回</option>
          </select>
          <select
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none"
          >
            <option value="all">全部版本</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>v{v.version}{v.is_current ? '（当前）' : ''}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="邮箱搜索"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none w-44"
            />
            <button onClick={applyFilters} className="flex items-center gap-1 px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200">
              <Search size={14} />筛选
            </button>
          </div>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus size={18} />新增同意记录
        </button>
      </div>

      <div className="bg-white rounded-xl card-shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">主体名称</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">邮箱</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">版本</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">同意时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">撤回时间</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <>
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${expandedId === r.id ? 'bg-gray-50' : ''}`}>
                    <td className="px-4 py-3">
                      {isWithdrawn(r) && (
                        <button onClick={(e) => { e.stopPropagation(); handleExpand(r.id, true) }} className="p-1 hover:bg-gray-200 rounded">
                          {expandedId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.subject_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.subject_email}</td>
                    <td className="px-4 py-3 text-gray-600">{r.consent_version ? `v${r.consent_version}` : getVersionLabel(r.consent_version_id)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={isWithdrawn(r) ? '已撤回' : '已同意'} variant={isWithdrawn(r) ? 'danger' : 'success'} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.granted_at).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3 text-gray-600">{r.withdrawn_at ? new Date(r.withdrawn_at).toLocaleString('zh-CN') : '-'}</td>
                    <td className="px-4 py-3">
                      {!isWithdrawn(r) && (
                        <button onClick={() => onWithdraw(r.id)} className="text-critical-500 hover:text-critical-700 text-sm font-medium">撤回</button>
                      )}
                    </td>
                  </tr>
                  {expandedId === r.id && isWithdrawn(r) && (
                    <tr key={`${r.id}-detail`} className="bg-gray-50 border-b border-gray-100">
                      <td colSpan={8} className="px-8 py-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">关联系统停用情况</h5>
                        {recordTasks.length === 0 ? (
                          <p className="text-sm text-gray-400">暂无关联任务</p>
                        ) : (
                          <div className="grid gap-2">
                            {recordTasks.map((t) => (
                              <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <StatusBadge label={statusLabel(t.status)} variant={statusVariant(t.status)} />
                                  <span className="text-sm font-medium text-gray-800">{(t as any).system_name || `资产 #${t.data_asset_id}`}</span>
                                  {t.remark && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{t.remark}</span>}
                                </div>
                                <span className="text-xs text-gray-500">{t.completed_at ? `完成于 ${new Date(t.completed_at).toLocaleString('zh-CN')}` : '未完成'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">暂无同意记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading text-lg font-semibold text-primary-800">新增同意记录</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">隐私政策版本</label>
                <select
                  value={form.consent_version_id}
                  onChange={(e) => setForm({ ...form, consent_version_id: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none"
                >
                  <option value={0} disabled>请选择版本</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}{v.is_current ? '（当前版本）' : ''} - {new Date(v.effective_date).toLocaleDateString('zh-CN')}生效
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主体姓名</label>
                <input type="text" value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主体邮箱</label>
                <input type="email" value={form.subject_email} onChange={(e) => setForm({ ...form, subject_email: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function WithdrawalsTab({ tasks, assets, onUpdate }: { tasks: WithdrawalTask[]; assets: DataAsset[]; onUpdate: (id: number, d: any) => Promise<void> }) {
  const [editId, setEditId] = useState<number | null>(null)
  const [editRemark, setEditRemark] = useState('')

  const getAssetName = (assetId: number) => {
    const a = assets.find((a) => a.id === assetId)
    return a ? a.system_name : `#${assetId}`
  }

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { pending: 'neutral', processing: 'warning', completed: 'success' }
    return map[s] || 'neutral'
  }

  const statusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成' }[s] || s)

  const openEdit = (task: WithdrawalTask) => {
    setEditId(task.id)
    setEditRemark(task.remark || '')
  }

  const handleStartProcessing = async (id: number) => {
    await onUpdate(id, { status: 'processing', remark: editRemark || undefined })
    setEditId(null)
    setEditRemark('')
  }

  const handleComplete = async (id: number) => {
    await onUpdate(id, { status: 'completed', remark: editRemark, completed_at: new Date().toISOString() })
    setEditId(null)
    setEditRemark('')
  }

  const groupedByRecord: Record<number, WithdrawalTask[]> = {}
  for (const t of tasks) {
    if (!groupedByRecord[t.consent_record_id]) groupedByRecord[t.consent_record_id] = []
    groupedByRecord[t.consent_record_id].push(t)
  }

  const recordHeaders: Record<number, { name: string; email: string; withdrawnAt: string }> = {}
  for (const t of tasks) {
    if (!recordHeaders[t.consent_record_id]) {
      recordHeaders[t.consent_record_id] = {
        name: (t as any).subject_name || `#${t.consent_record_id}`,
        email: (t as any).subject_email || '',
        withdrawnAt: (t as any).withdrawn_at || '',
      }
    }
  }

  return (
    <div className="space-y-4">
      {Object.keys(groupedByRecord).map((rid) => {
        const id = Number(rid)
        const header = recordHeaders[id]
        const ts = groupedByRecord[id]
        const total = ts.length
        const done = ts.filter((t) => t.status === 'completed').length
        const allDone = total > 0 && done === total
        return (
          <div key={id} className="bg-white rounded-xl card-shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <div className="font-medium text-primary-800">{header?.name || `记录 #${id}`}</div>
                <div className="text-xs text-gray-500">{header?.email} {header?.withdrawnAt && `· 撤回时间：${new Date(header.withdrawnAt).toLocaleString('zh-CN')}`}</div>
              </div>
              <div className="text-sm">
                <StatusBadge label={`停用进度 ${done}/${total}`} variant={allDone ? 'success' : 'warning'} />
              </div>
            </div>
            <div className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="px-5 py-3 text-left font-medium text-gray-600 w-1/3">关联系统</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600 w-1/6">状态</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600">处理备注</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600 w-1/5">完成时间</th>
                    <th className="px-5 py-3 text-left font-medium text-gray-600 w-1/5">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ts.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-800">{getAssetName(t.data_asset_id)}</td>
                      <td className="px-5 py-3"><StatusBadge label={statusLabel(t.status)} variant={statusVariant(t.status)} /></td>
                      <td className="px-5 py-3">
                        {editId === t.id ? (
                          <input
                            value={editRemark}
                            onChange={(e) => setEditRemark(e.target.value)}
                            placeholder="填写处理备注，如'已停止邮件推送'"
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none"
                          />
                        ) : (
                          <span className="text-gray-600">{t.remark || '-'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{t.completed_at ? new Date(t.completed_at).toLocaleString('zh-CN') : '-'}</td>
                      <td className="px-5 py-3">
                        {editId === t.id ? (
                          <div className="flex gap-2">
                            {t.status === 'pending' && (
                              <button onClick={() => handleStartProcessing(t.id)} className="text-warning-600 hover:text-warning-700 text-sm font-medium">确认开始</button>
                            )}
                            {t.status === 'processing' && (
                              <button onClick={() => handleComplete(t.id)} className="text-accent-600 hover:text-accent-700 text-sm font-medium">确认完成</button>
                            )}
                            <button onClick={() => { setEditId(null); setEditRemark('') }} className="text-gray-500 hover:text-gray-700 text-sm">取消</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {t.status === 'pending' && (
                              <button onClick={() => openEdit(t)} className="text-warning-600 hover:text-warning-700 text-sm font-medium">开始处理</button>
                            )}
                            {t.status === 'processing' && (
                              <button onClick={() => openEdit(t)} className="text-accent-600 hover:text-accent-700 text-sm font-medium">标记完成</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {tasks.length === 0 && <p className="text-center text-gray-400 py-8 bg-white rounded-xl">暂无撤回任务</p>}
    </div>
  )
}
