// ── Layout — ae Optics CRM بالهوية البصرية الرسمية ──────────────────
import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AELogoSquare, AELogoWithText, BRAND } from './AELogo'
import {
  LayoutDashboard, ShoppingBag, Wrench, Package, Users,
  TrendingUp, Settings, Menu, Truck, TrendingDown, UserCheck,
  Layers, LogOut, X, Link2, RotateCcw, AlertOctagon
} from 'lucide-react'

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/orders',       icon: ShoppingBag,     label: 'الطلبات' },
  { to: '/tracker',      icon: Truck,           label: 'متابعة التوصيل' },
  { to: '/workshop',     icon: Wrench,          label: 'الورشة' },
  { to: '/inventory',    icon: Package,         label: 'المخزون' },
  { to: '/lens-brands',  icon: Layers,          label: 'شركات العدسات' },
  { to: '/customers',    icon: Users,           label: 'العملاء' },
  { to: '/returns',      icon: RotateCcw,       label: 'المرتجعات' },
  { to: '/lost',         icon: AlertOctagon,    label: 'الشحنات المفقودة' },
  { to: '/revenue',      icon: TrendingUp,      label: 'الإيرادات' },
  { to: '/expenses',     icon: TrendingDown,    label: 'المصروفات' },
  { to: '/employees',    icon: UserCheck,       label: 'الموظفون' },
  { to: '/integrations', icon: Link2,           label: 'Store Integrations' },
  { to: '/shipping',     icon: Truck,           label: 'إعدادات الشحن' },
  { to: '/settings',     icon: Settings,        label: 'الإعدادات' },
]

function SidebarContent({ onClose }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#fff' }}>
      {/* Logo header — بالهوية الرسمية */}
      <div className="p-4 border-b border-gray-100">
        <AELogoWithText size={38}/>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: BRAND.green } : {}}
          >
            <Icon size={17} strokeWidth={2}/>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-semibold">
          <LogOut size={15}/> تسجيل الخروج
        </button>
        {/* Brand footer */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: BRAND.green }}>
          <AELogoSquare size={24}/>
          <div className="text-xs font-bold truncate" style={{ color: BRAND.cream }}>
            ae Optics CRM v1.0.0
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col bg-white border-l border-gray-100 shadow-sm flex-shrink-0"
        style={{ width: 232 }}>
        <SidebarContent onClose={() => {}}/>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}/>
          <aside className="absolute right-0 top-0 h-full bg-white shadow-2xl" style={{ width: 256 }}>
            <div className="absolute top-3 left-3 z-10">
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X size={18} className="text-gray-500"/>
              </button>
            </div>
            <SidebarContent onClose={() => setOpen(false)}/>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header بالهوية الرسمية */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <AELogoWithText size={30}/>
          <button onClick={() => setOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
            <Menu size={20} className="text-gray-600"/>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto"><Outlet/></div>
      </main>
    </div>
  )
}
