import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { useAppStore, type DataAsset } from '@/stores/appStore'
import StatusBadge from '@/components/StatusBadge'

const emptyForm = { system_name: '', data_type: '', processing_purpose: '', subject_type: '用户', retention_period: '', legal_basis: '' }

export default function DataAssets() {
  const { dataAssets, fetchDataAssets, createDataAsset, updateDataAsset, deleteDataAsset } = useAppStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DataAsset | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<DataAsset | null>(null)

  useEffect(() => { fetchDataAssets() }, [])

  const filtered = dataAssets.filter((a) =>
    a.system_name.includes(search) || a.data_type.includes(search) || a.processing_purpose.includes(search)
  )

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (asset: DataAsset) => {
    setEditing(asset)
    setForm({ system_name: asset.system_name, data_type: asset.data_type, processing_purpose: asset.processing_purpose, subject_type: asset.subject_type, retention_period: asset.retention_period, legal_basis: asset.legal_basis })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await updateDataAsset(editing.id, form)
    } else {
      await createDataAsset(form)
    }
    setShowModal(false)
  }

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteDataAsset(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const subjectBadgeVariant = (type: string): 'success' | 'warning' | 'info' => {
    if (type === '员工') return 'info'
    if (type === '合作方') return 'warning'
    return 'success'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="搜索数据资产..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
          />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus size={18} />新增数据资产
        </button>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{asset.system_name}</td>
                  <td className="px-4 py-3 text-gray-600">{asset.data_type}</td>
                  <td className="px-4 py-3 text-gray-600">{asset.processing_purpose}</td>
                  <td className="px-4 py-3"><StatusBadge label={asset.subject_type} variant={subjectBadgeVariant(asset.subject_type)} /></td>
                  <td className="px-4 py-3 text-gray-600">{asset.retention_period}</td>
                  <td className="px-4 py-3 text-gray-600">{asset.legal_basis}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(asset)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary-600">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(asset)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-critical-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无数据资产</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-heading text-lg font-semibold text-primary-800">{editing ? '编辑数据资产' : '新增数据资产'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Field label="系统名称" value={form.system_name} onChange={(v) => setForm({ ...form, system_name: v })} required />
              <Field label="数据类型" value={form.data_type} onChange={(v) => setForm({ ...form, data_type: v })} required />
              <Field label="处理目的" value={form.processing_purpose} onChange={(v) => setForm({ ...form, processing_purpose: v })} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">数据主体类型</label>
                <select value={form.subject_type} onChange={(e) => setForm({ ...form, subject_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none">
                  <option value="用户">用户</option>
                  <option value="员工">员工</option>
                  <option value="合作方">合作方</option>
                </select>
              </div>
              <Field label="保留期限" value={form.retention_period} onChange={(v) => setForm({ ...form, retention_period: v })} required />
              <Field label="法律依据" value={form.legal_basis} onChange={(v) => setForm({ ...form, legal_basis: v })} required />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-lg text-sm hover:bg-primary-700">{editing ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="font-heading text-lg font-semibold text-primary-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">确定要删除数据资产「{deleteTarget.system_name}」吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-critical-500 text-white rounded-lg text-sm hover:bg-critical-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:outline-none"
      />
    </div>
  )
}
