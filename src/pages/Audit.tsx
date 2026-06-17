import { useEffect, useState } from 'react'
import { RefreshCw, Download, FileText, Copy, Check } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

export default function Audit() {
  const { dataAssets, fetchDataAssets, fetchAuditSummary } = useAppStore()
  const [showToast, setShowToast] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchDataAssets() }, [])

  const handleRefresh = async () => {
    await fetchDataAssets()
  }

  const handleExportCSV = () => {
    window.location.href = '/api/audit/ropa/export?format=csv'
  }

  const handleExportPDF = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const handleGenerateSummary = async () => {
    setLoadingSummary(true)
    try {
      const text = await fetchAuditSummary()
      setSummaryText(text)
      setShowSummary(true)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between mb-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary-800">数据处理活动记录 (RoPA)</h2>
            <p className="text-sm text-gray-500 mt-1">基于数据资产自动生成的合规审计记录</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
              <RefreshCw size={16} />刷新 RoPA
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
              <Download size={16} />导出 CSV
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700 text-sm font-medium">
              <FileText size={16} />导出 PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl card-shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">系统名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">数据类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">处理目的</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">数据主体类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">保留期限</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">法律依据</th>
                </tr>
              </thead>
              <tbody>
                {dataAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{asset.system_name}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.data_type}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.processing_purpose}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.subject_type}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.retention_period}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.legal_basis}</td>
                  </tr>
                ))}
                {dataAssets.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">暂无数据资产记录，请先添加数据资产</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between mb-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-primary-800">主体请求与撤回审计摘要</h2>
            <p className="text-sm text-gray-500 mt-1">包含请求处理时间线、处理结论与撤回任务完成情况，可直接复制用于合规审计报告</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleGenerateSummary} disabled={loadingSummary} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-60">
              {loadingSummary ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
              {loadingSummary ? '生成中...' : '生成审计摘要'}
            </button>
          </div>
        </div>

        {showSummary && (
          <div className="bg-white rounded-xl card-shadow-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-medium text-gray-700">审计摘要文本</span>
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 text-white rounded-md text-xs font-medium hover:bg-accent-700">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制到剪贴板'}
              </button>
            </div>
            <div className="p-5">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono leading-relaxed overflow-x-auto">
                {summaryText}
              </pre>
            </div>
          </div>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-primary-800 text-white px-5 py-3 rounded-lg card-shadow-lg flex items-center gap-2 z-50">
          <FileText size={18} />
          <span className="text-sm font-medium">功能开发中</span>
        </div>
      )}
    </div>
  )
}
