import { useEffect, useMemo } from 'react'
import { Database, FileText, FileCheck, ShieldAlert, Activity } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import CountdownTimer from '@/components/CountdownTimer'
import StatusBadge from '@/components/StatusBadge'

export default function Dashboard() {
  const { dashboardStats, subjectRequests, breachEvents, dataAssets, consentRecords, fetchDashboardStats, fetchSubjectRequests, fetchBreachEvents, fetchDataAssets, fetchConsentRecords } = useAppStore()

  useEffect(() => {
    fetchDashboardStats()
    fetchSubjectRequests()
    fetchBreachEvents()
    fetchDataAssets()
    fetchConsentRecords()
  }, [])

  const complianceScore = useMemo(() => {
    let score = 0
    if (dataAssets.length > 0) score += 25
    if (consentRecords.some((r) => r.is_granted)) score += 25
    if (!subjectRequests.some((r) => r.status === 'overdue')) score += 25
    if (!breachEvents.some((b) => b.status !== 'resolved')) score += 25
    return score
  }, [dataAssets, consentRecords, subjectRequests, breachEvents])

  const pendingRequests = subjectRequests
    .filter((r) => r.status !== 'completed')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)

  const recentEvents = useMemo(() => {
    const items = [
      ...subjectRequests.map((r) => ({
        type: 'request' as const,
        title: `${r.subject_name} 提交了${requestTypeLabel(r.request_type)}请求`,
        date: r.created_at,
      })),
      ...breachEvents.map((b) => ({
        type: 'breach' as const,
        title: `泄露事件: ${b.title}`,
        date: b.discovered_at,
      })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }, [subjectRequests, breachEvents])

  const statCards = [
    { label: '总数据资产', value: dashboardStats.totalAssets, icon: Database, color: 'bg-primary-500' },
    { label: '待处理请求', value: dashboardStats.pendingRequests, icon: FileText, color: 'bg-warning-500' },
    { label: '活跃同意', value: dashboardStats.consentStats?.granted ?? 0, icon: FileCheck, color: 'bg-accent-500' },
    { label: '泄露事件', value: dashboardStats.openBreaches, icon: ShieldAlert, color: 'bg-critical-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl p-5 card-shadow-md flex items-center gap-4">
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-500 font-body">{card.label}</div>
                <div className="text-2xl font-heading font-bold text-primary-800">{card.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white rounded-xl p-6 card-shadow-md">
          <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">合规评分</h2>
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={complianceScore >= 75 ? '#10b981' : complianceScore >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(complianceScore / 100) * 326.73} 326.73`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-heading font-bold text-primary-800">{complianceScore}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 font-body">
              {complianceScore >= 75 ? '合规状态良好' : complianceScore >= 50 ? '部分合规项需关注' : '存在合规风险，请尽快处理'}
            </p>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl p-6 card-shadow-md">
          <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">待处理请求</h2>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">暂无待处理请求</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <StatusBadge label={requestTypeLabel(req.request_type)} variant="info" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{req.subject_name}</div>
                      <div className="text-xs text-gray-500">{req.subject_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge label={statusLabel(req.status)} variant={statusVariant(req.status)} />
                    <CountdownTimer deadline={req.deadline} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 card-shadow-md">
        <h2 className="font-heading text-lg font-semibold text-primary-800 mb-4">近期事件</h2>
        {recentEvents.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">暂无近期事件</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {recentEvents.map((event, i) => (
                <div key={i} className="relative pl-10">
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${event.type === 'breach' ? 'bg-critical-500' : 'bg-primary-500'}`} />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{event.title}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(event.date).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function requestTypeLabel(type: string) {
  const map: Record<string, string> = { access: '访问', deletion: '删除', export: '导出' }
  return map[type] || type
}

function statusLabel(status: string) {
  const map: Record<string, string> = { pending: '待处理', assigned: '已分配', processing: '处理中', completed: '已完成', overdue: '已逾期' }
  return map[status] || status
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    pending: 'neutral', assigned: 'info', processing: 'warning', completed: 'success', overdue: 'danger',
  }
  return map[status] || 'neutral'
}
