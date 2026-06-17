import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, UserCheck, CheckCircle, Play, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import StatusBadge from '@/components/StatusBadge'
import CountdownTimer from '@/components/CountdownTimer'

export default function SubjectRequests() {
  const { subjectRequests, fetchSubjectRequests, createSubjectRequest, assignTeam, startProcessing, completeRequest, fetchRequestTimeline, requestTimelines } = useAppStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState<number | null>(null)
  const [showComplete, setShowComplete] = useState<number | null>(null)
  const [teamInput, setTeamInput] = useState('')
  const [resultInput, setResultInput] = useState('')
  const [resultError, setResultError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({ request_type: 'access' as 'access' | 'deletion' | 'export', subject_name: '', subject_email: '', description: '' })

  useEffect(() => { fetchSubjectRequests() }, [])

  const filtered = subjectRequests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (typeFilter !== 'all' && r.request_type !== typeFilter) return false
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await createSubjectRequest({ ...form, status: 'pending', assigned_team: null, deadline })
    setShowCreate(false)
    setForm({ request_type: 'access', subject_name: '', subject_email: '', description: '' })
  }

  const handleAssign = async (id: number) => {
    if (teamInput.trim()) {
      await assignTeam(id, teamInput.trim())
      if (expandedId === id) {
        fetchRequestTimeline(id)
      }
      setShowAssign(null)
      setTeamInput('')
    }
  }

  const handleStartProcessing = async (id: number) => {
    await startProcessing(id)
    if (expandedId === id) {
      fetchRequestTimeline(id)
    }
  }

  const handleComplete = async (id: number) => {
    if (!resultInput.trim()) {
      setResultError('请填写处理结论')
      return
    }
    setResultError('')
    await completeRequest(id, resultInput.trim())
    if (expandedId === id) {
      fetchRequestTimeline(id)
    }
    setShowComplete(null)
    setResultInput('')
  }

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      fetchRequestTimeline(id)
    }
  }

  const openCompleteModal = (id: number) => {
    setResultInput('')
    setResultError('')
    setShowComplete(id)
  }

  const typeLabel = (t: string) => ({ access: '访问', deletion: '删除', export: '导出' }[t] || t)
  const typeVariant = (t: string): 'info' | 'danger' | 'success' => {
    const map: Record<string, 'info' | 'danger' | 'success'> = { access: 'info', deletion: 'danger', export: 'success' }
    return map[t] || 'info'
  }
  const statusLabel = (s: string) => ({ pending: '待处理', assigned: '已分配', processing: '处理中', completed: '已完成', overdue: '已逾期' }[s] || s)
  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = { pending: 'neutral', assigned: 'info', processing: 'warning', completed: 'success', overdue: 'danger' }
    return map[s] || 'neutral'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="assigned">已分配</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="overdue">已逾期</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
            <option value="all">全部类型</option>
            <option value="access">访问</option>
            <option value="deletion">删除</option>
            <option value="export">导出</option>
          </select>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus size={18} />新建请求
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((req) => (
          <div key={req.id} className="bg-white rounded-xl card-shadow-md overflow-hidden">
            <div className="p-5 cursor-pointer hover:bg-gray-50" onClick={() => handleExpand(req.id)}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge label={typeLabel(req.request_type)} variant={typeVariant(req.request_type)} />
                  <div>
                    <span className="font-medium text-gray-800">{req.subject_name}</span>
                    <span className="text-sm text-gray-500 ml-2">{req.subject_email}</span>
                  </div>
                  {req.was_overdue && (
                    <span className="inline-flex items-center gap-1 text-xs text-critical-600 bg-critical-50 px-2 py-0.5 rounded-full border border-critical-200">
                      <AlertTriangle size={12} />曾逾期
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge label={statusLabel(req.status)} variant={statusVariant(req.status)} />
                  {req.assigned_team && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{req.assigned_team}</span>}
                  {req.status !== 'completed' && <CountdownTimer deadline={req.deadline} />}
                  {expandedId === req.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>
              {req.description && <p className="mt-2 text-sm text-gray-600">{req.description}</p>}
            </div>

            {expandedId === req.id && (
              <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {req.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); setShowAssign(req.id) }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200">
                      <UserCheck size={14} />分配团队
                    </button>
                  )}
                  {(req.status === 'assigned' || req.status === 'overdue') && (
                    <button onClick={(e) => { e.stopPropagation(); handleStartProcessing(req.id) }} className="flex items-center gap-1 px-3 py-1.5 bg-warning-100 text-warning-700 rounded-lg text-sm font-medium hover:bg-warning-200">
                      <Play size={14} />开始处理
                    </button>
                  )}
                  {(req.status === 'assigned' || req.status === 'overdue') && (
                    <button onClick={(e) => { e.stopPropagation(); setShowAssign(req.id) }} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100">
                      <UserCheck size={14} />更换团队
                    </button>
                  )}
                  {(req.status === 'processing' || req.status === 'overdue') && (
                    <button onClick={(e) => { e.stopPropagation(); openCompleteModal(req.id) }} className="flex items-center gap-1 px-3 py-1.5 bg-accent-100 text-accent-700 rounded-lg text-sm font-medium hover:bg-accent-200">
                      <CheckCircle size={14} />完成处理
                    </button>
                  )}
                </div>

                {showAssign === req.id && (
                  <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">分配处理团队</label>
                    <div className="flex items-center gap-2">
                      <input value={teamInput} onChange={(e) => setTeamInput(e.target.value)} placeholder="输入团队名称" className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
                      <button onClick={() => handleAssign(req.id)} className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">确认</button>
                      <button onClick={() => { setShowAssign(null); setTeamInput('') }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">取消</button>
                    </div>
                  </div>
                )}

                {showComplete === req.id && (
                  <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">处理结果说明（必填）</label>
                    <textarea
                      value={resultInput}
                      onChange={(e) => { setResultInput(e.target.value); setResultError('') }}
                      placeholder={`请填写${typeLabel(req.request_type)}请求的处理结果，如：已提供数据副本 / 已删除全部相关数据 / 已导出可携格式数据...`}
                      rows={3}
                      required
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none mb-2 ${resultError ? 'border-critical-400' : ''}`}
                    />
                    {resultError && <p className="text-critical-600 text-xs mb-3">{resultError}</p>}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleComplete(req.id)} className="px-4 py-2 bg-accent-600 text-white rounded-lg text-sm hover:bg-accent-700">确认完成</button>
                      <button onClick={() => { setShowComplete(null); setResultInput(''); setResultError('') }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">取消</button>
                    </div>
                  </div>
                )}

                <h4 className="text-sm font-medium text-gray-700 mb-2">处理时间线</h4>
                {requestTimelines.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无时间线记录</p>
                ) : (
                  <div className="space-y-2">
                    {requestTimelines.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <span className="text-gray-600">{t.action}</span>
                          <span className="text-gray-400 ml-2">- {t.performed_by}</span>
                        </div>
                        <span className="text-gray-400 text-xs whitespace-nowrap">{new Date(t.performed_at).toLocaleString('zh-CN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据主体请求</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading text-lg font-semibold text-primary-800">新建请求</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求类型</label>
                <select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
                  <option value="access">访问</option>
                  <option value="deletion">删除</option>
                  <option value="export">导出</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主体名称</label>
                <input type="text" value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主体邮箱</label>
                <input type="email" value={form.subject_email} onChange={(e) => setForm({ ...form, subject_email: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">创建</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
