import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAppStore, type ConsentVersion, type ConsentRecord, type WithdrawalTask, type DataAsset } from '@/stores/appStore'
import StatusBadge from '@/components/StatusBadge'

type TabKey = 'versions' | 'records' | 'withdrawals'

export default function Consent() {
  const [activeTab, setActiveTab] = useState<TabKey>('versions')
  const {
    consentVersions, consentRecords, withdrawalTasks, dataAssets,
    fetchConsentVersions, fetchConsentRecords, fetchWithdrawalTasks, fetchDataAssets,
    createConsentVersion, withdrawConsent, updateWithdrawalTask,
  } = useAppStore()

  useEffect(() => {
    fetchConsentVersions()
    fetchConsentRecords()
    fetchWithdrawalTasks()
    fetchDataAssets()
  }, [])

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
      {activeTab === 'records' && <RecordsTab records={consentRecords} versions={consentVersions} onWithdraw={withdrawConsent} />}
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

function RecordsTab({ records, versions, onWithdraw }: { records: ConsentRecord[]; versions: ConsentVersion[]; onWithdraw: (id: number) => Promise<void> }) {
  const getVersionLabel = (versionId: number) => {
    const v = versions.find((v) => v.id === versionId)
    return v ? `v${v.version}` : `#${versionId}`
  }

  return (
    <div className="bg-white rounded-xl card-shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
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
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.subject_name}</td>
                <td className="px-4 py-3 text-gray-600">{r.subject_email}</td>
                <td className="px-4 py-3 text-gray-600">{getVersionLabel(r.consent_version_id)}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={r.is_granted ? '已同意' : '已撤回'} variant={r.is_granted ? 'success' : 'danger'} />
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(r.granted_at).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3 text-gray-600">{r.withdrawn_at ? new Date(r.withdrawn_at).toLocaleDateString('zh-CN') : '-'}</td>
                <td className="px-4 py-3">
                  {r.is_granted && (
                    <button onClick={() => onWithdraw(r.id)} className="text-critical-500 hover:text-critical-700 text-sm font-medium">撤回</button>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无同意记录</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WithdrawalsTab({ tasks, assets, onUpdate }: { tasks: WithdrawalTask[]; assets: DataAsset[]; onUpdate: (id: number, d: any) => Promise<void> }) {
  const getAssetName = (assetId: number) => {
    const a = assets.find((a) => a.id === assetId)
    return a ? a.system_name : `#${assetId}`
  }

  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { pending: 'neutral', processing: 'warning', completed: 'success' }
    return map[s] || 'neutral'
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { pending: '待处理', processing: '处理中', completed: '已完成' }
    return map[s] || s
  }

  return (
    <div className="bg-white rounded-xl card-shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-600">同意记录ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">关联系统</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">完成时间</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">#{t.consent_record_id}</td>
                <td className="px-4 py-3 text-gray-600">{getAssetName(t.data_asset_id)}</td>
                <td className="px-4 py-3"><StatusBadge label={statusLabel(t.status)} variant={statusVariant(t.status)} /></td>
                <td className="px-4 py-3 text-gray-600">{t.completed_at ? new Date(t.completed_at).toLocaleDateString('zh-CN') : '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {t.status === 'pending' && (
                      <button onClick={() => onUpdate(t.id, { status: 'processing' })} className="text-warning-600 hover:text-warning-700 text-sm font-medium">标记处理中</button>
                    )}
                    {t.status === 'processing' && (
                      <button onClick={() => onUpdate(t.id, { status: 'completed', completed_at: new Date().toISOString() })} className="text-accent-600 hover:text-accent-700 text-sm font-medium">标记完成</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无撤回任务</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
