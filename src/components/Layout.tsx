import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, Database, FileCheck, FileText, ShieldAlert, ClipboardCheck, Menu, X, Shield } from 'lucide-react'

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/data-assets', label: '数据资产', icon: Database },
  { path: '/consent', label: '同意管理', icon: FileCheck },
  { path: '/requests', label: '主体请求', icon: FileText },
  { path: '/breaches', label: '泄露事件', icon: ShieldAlert },
  { path: '/audit', label: '合规审计', icon: ClipboardCheck },
]

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/data-assets': '数据资产地图',
  '/consent': '同意管理',
  '/requests': '数据主体请求',
  '/breaches': '数据泄露事件',
  '/audit': '合规审计',
}

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentTitle = pageTitles[location.pathname] || 'PrivacyGuard'

  return (
    <div className="flex h-screen bg-gray-50 font-body">
      <div className="hidden lg:flex lg:flex-col lg:w-64 bg-primary-800 text-white fixed inset-y-0 z-30">
        <SidebarContent />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-primary-800 text-white z-50">
            <div className="flex justify-end p-2">
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-primary-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={20} className="text-gray-600" />
            </button>
            <h1 className="font-heading text-xl font-semibold text-primary-800">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white text-sm font-medium">
              DPO
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent() {
  const location = useLocation()

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 flex items-center gap-3">
        <Shield size={28} className="text-accent-400" />
        <span className="font-heading text-lg font-bold tracking-tight">PrivacyGuard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-primary-700">
        <div className="text-xs text-primary-300">v1.0.0</div>
        <div className="text-xs text-primary-400 mt-1">数据隐私合规管理平台</div>
      </div>
    </div>
  )
}
