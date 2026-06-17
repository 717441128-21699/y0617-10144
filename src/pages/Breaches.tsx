import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, FileText, Bell } from 'lucide-react'
import { useAppStore, type BreachNotification } from '@/stores/appStore'
import StatusBadge from '@/components/StatusBadge'

export default function Breaches() {
  const { breachEvents, breachNotifications, fetchBreachEvents, fetchBreachNotifications, createBreachEvent, addBreachNotification } = useAppStore()
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNotify, setShowNotify] = useState<number | null>(null)
  const [showReport, setShowReport] = useState<string | null>(null)
  const [notifyForm, setNotifyForm] = useState({ notify_type: 'regulator' as const, recipient: '', content: '' })
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' as 'low' | 'medium' | 'high' | 'critical', discovered_at: '', affected_count: 0, status: 'investigating' as const, contained_at: '' })

  useEffect(() => { fetchBreachEvents() }, [])

  const filtered = breachEvents.filter((e) => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await createBreachEvent({ ...form, contained_at: form.contained_at || null, affected_count: form.affected_count || 0 })
    setShowCreate(false)
    setForm({ title: '', description: '', severity: 'medium', discovered_at: '', affected_count: 0, status: 'investigating', contained_at: '' })
  }

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchBreachNotifications(id)
    }
  }

  const handleAddNotification = async (breachId: number) => {
    await addBreachNotification(breachId, { ...notifyForm, notified_at: new Date().toISOString() })
    setShowNotify(null)
    setNotifyForm({ notify_type: 'regulator', recipient: '', content: '' })
  }

  const handleGenerateReport = async (id: number) => {
    try {
      const res = await fetch(`/api/breaches/${id}/report`)
      const json = await res.json()
      setShowReport(json.data?.report || JSON.stringify(json, null, 2))
    } catch {
      setShowReport('报告生成失败')
    }
  }

  const severityColor = (s: string) => {
    const map: Record<string, string> = { low: 'border-warning-400', medium: 'border-warning-500', high: 'border-critical-400', critical: 'border-critical-600' }
    return map[s] || 'border-gray-400'
  }

  const severityVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { low: 'info', medium: 'warning', high: 'danger', critical: 'danger' }
    return map[s] || 'neutral'
  }

  const severityLabel = (s: string) => ({ low: '低', medium: '中', high: '高', critical: '严重' }[s] || s)
  const statusLabel = (s: string) => ({ investigating: '调查中', contained: '已控制', resolved: '已解决' }[s] || s)
  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { investigating: 'danger', contained: 'warning', resolved: 'success' }
    return map[s] || 'neutral'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
            <option value="all">全部严重程度</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="critical">严重</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
            <option value="all">全部状态</option>
            <option value="investigating">调查中</option>
            <option value="contained">已控制</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus size={18} />记录新事件
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((event) => (
          <div key={event.id} className={`bg-white rounded-xl card-shadow-md overflow-hidden border-l-4 ${severityColor(event.severity)}`}>
            <div className="p-5 cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(event.id)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-heading font-semibold text-gray-800">{event.title}</h3>
                  <StatusBadge label={severityLabel(event.severity)} variant={severityVariant(event.severity)} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-500">发现: {new Date(event.discovered_at).toLocaleDateString('zh-CN')}</span>
                  <span className="text-sm text-gray-500">影响: {event.affected_count}人</span>
                  <StatusBadge label={statusLabel(event.status)} variant={statusVariant(event.status)} />
                  {expandedId === event.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>
            </div>

            {expandedId === event.id && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                <p className="text-sm text-gray-700 mb-4">{event.description}</p>

                <div className="flex gap-3 mb-4">
                  <button onClick={() => setShowNotify(event.id)} className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200">
                    <Bell size={14} />添加通知
                  </button>
                  <button onClick={() => handleGenerateReport(event.id)} className="flex items-center gap-1 px-3 py-1.5 bg-accent-100 text-accent-700 rounded-lg text-sm font-medium hover:bg-accent-200">
                    <FileText size={14} />生成报告
                  </button>
                </div>

                {showNotify === event.id && (
                  <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <select value={notifyForm.notify_type} onChange={(e) => setNotifyForm({ ...notifyForm, notify_type: e.target.value as any })} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
                        <option value="regulator">监管机构</option>
                        <option value="affected_persons">受影响个人</option>
                        <option value="internal">内部通知</option>
                      </select>
                      <input value={notifyForm.recipient} onChange={(e) => setNotifyForm({ ...notifyForm, recipient: e.target.value })} placeholder="接收方" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
                      <input value={notifyForm.content} onChange={(e) => setNotifyForm({ ...notifyForm, content: e.target.value })} placeholder="通知内容" className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAddNotification(event.id)} className="px-3 py-1.5 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">确认</button>
                      <button onClick={() => setShowNotify(null)} className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-100">取消</button>
                    </div>
                  </div>
                )}

                <h4 className="text-sm font-medium text-gray-700 mb-2">通知记录</h4>
                {breachNotifications.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无通知记录</p>
                ) : (
                  <div className="space-y-2">
                    {breachNotifications.map((n) => (
                      <div key={n.id} className="flex items-center gap-3 text-sm bg-white p-3 rounded-lg border border-gray-200">
                        <StatusBadge label={{ regulator: '监管', affected_persons: '个人', internal: '内部' }[n.notify_type] || n.notify_type} variant="info" />
                        <span className="text-gray-600">{n.recipient}</span>
                        <span className="text-gray-400 text-xs ml-auto">{n.notified_at ? new Date(n.notified_at).toLocaleString('zh-CN') : '未通知'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无泄露事件</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-heading text-lg font-semibold text-primary-800">记录新事件</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">事件标题</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="critical">严重</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">影响人数</label>
                  <input type="number" value={form.affected_count} onChange={(e) => setForm({ ...form, affected_count: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发现时间</label>
                <input type="datetime-local" value={form.discovered_at} onChange={(e) => setForm({ ...form, discovered_at: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading text-lg font-semibold text-primary-800">监管报告</h3>
              <button onClick={() => setShowReport(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg font-mono">{showReport}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
