import { useState, useEffect } from 'react'
import { supabase, STATUS_COLORS, fmt, fmtPct } from '../lib/supabase'
import { TrendingUp, TrendingDown, Package, Truck, CheckCircle, XCircle, Clock, AlertTriangle, Wrench, DollarSign, ShoppingBag, BarChart3, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const PIE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#84CC16']

function KpiCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    rose:   'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return (
    <div className="card flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={20} strokeWidth={2}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      {trend != null && (
        <div className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [workshop, setWorkshop] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = async () => {
    setLoading(true)
    const { data: ord } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    const { data: ws } = await supabase.from('workshop_accounts').select('*')
    setOrders(ord || [])
    setWorkshop(ws || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Computed stats ──────────────────────────────────────────────────
  const total = orders.length
  const revenue = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + (o.total_final || 0), 0)
  const profit = orders.filter(o => o.status === 'Delivered').reduce((s, o) => s + (o.actual_profit || 0), 0)
  const avgOrder = total > 0 ? revenue / (orders.filter(o => o.status === 'Delivered').length || 1) : 0
  const avgMargin = orders.filter(o => o.status === 'Delivered' && o.profit_margin).reduce((s, o, _, a) => s + o.profit_margin / a.length, 0)

  const byStatus = {}
  orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1 })

  const overdue = orders.filter(o =>
    o.expected_delivery && new Date(o.expected_delivery) < new Date() &&
    !['Delivered','Cancelled','Refused on Delivery','Returned'].includes(o.status)
  ).length

  // Monthly data
  const monthlyData = MONTHS_AR.map((m, i) => {
    const mo = orders.filter(o => o.order_date && new Date(o.order_date).getMonth() === i)
    return {
      name: m.slice(0, 3),
      طلبات: mo.length,
      إيرادات: mo.filter(o => o.status === 'Delivered').reduce((s, o) => s + (o.total_final || 0), 0),
    }
  })

  // Source breakdown
  const sourceData = {}
  orders.forEach(o => { if (o.source) sourceData[o.source] = (sourceData[o.source] || 0) + 1 })
  const sourcePie = Object.entries(sourceData).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, value]) => ({ name, value }))

  // Type breakdown
  const typeData = {}
  orders.forEach(o => { if (o.glasses_type) typeData[o.glasses_type] = (typeData[o.glasses_type] || 0) + 1 })
  const typePie = Object.entries(typeData).map(([name, value]) => ({ name, value }))

  // Workshop totals
  const wsTotal = workshop.reduce((s, w) => s + (w.manuf_cost || 0), 0)
  const wsPaid = workshop.reduce((s, w) => s + (w.amount_paid || 0), 0)
  const wsRemaining = workshop.reduce((s, w) => s + (w.amount_remaining || 0), 0)
  const wsUnpaid = workshop.filter(w => w.paid !== 'نعم').length

  // Recent orders
  const recent = orders.slice(0, 8)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.name === 'إيرادات' ? fmt(p.value) : p.value}</p>
        ))}
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="text-sm text-gray-400 mt-0.5">آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={15}/> تحديث
        </button>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={ShoppingBag}   label="إجمالي الطلبات"    value={total}           color="blue"/>
        <KpiCard icon={DollarSign}    label="إجمالي الإيرادات"  value={fmt(revenue)}    color="green"/>
        <KpiCard icon={TrendingUp}    label="إجمالي الأرباح"    value={fmt(profit)}     color="teal"/>
        <KpiCard icon={BarChart3}     label="متوسط هامش الربح"  value={fmtPct(avgMargin/100)} color="indigo"/>
        <KpiCard icon={CheckCircle}   label="تم التسليم"         value={byStatus['Delivered'] || 0} color="green"/>
        <KpiCard icon={AlertTriangle} label="طلبات متأخرة"       value={overdue} color="red"/>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { status: 'Pending Confirmation', icon: Clock },
          { status: 'Confirmed',            icon: CheckCircle },
          { status: 'In Preparation',       icon: Package },
          { status: 'Sent to Workshop',     icon: Wrench },
          { status: 'Returned from Workshop', icon: Wrench },
          { status: 'Ready to Ship',        icon: Package },
          { status: 'Shipped',              icon: Truck },
          { status: 'Refused on Delivery',  icon: XCircle },
        ].map(({ status, icon: Icon }) => {
          const sc = STATUS_COLORS[status]
          return (
            <div key={status} className={`rounded-xl p-3 border border-gray-100 ${sc.bg}`}>
              <div className={`text-xs font-semibold ${sc.text} leading-tight mb-1`}>{sc.label}</div>
              <div className={`text-2xl font-extrabold ${sc.text}`}>{byStatus[status] || 0}</div>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly bar chart */}
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">الطلبات الشهرية</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={14}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="طلبات" fill="#3B82F6" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source pie */}
        <div className="card">
          <h3 className="section-title mb-4">مصادر الطلبات</h3>
          {sourcePie.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-gray-300 text-sm">لا توجد بيانات</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={sourcePie} dataKey="value" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                    {sourcePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs font-semibold border border-gray-100">
                      {payload[0].name}: {payload[0].value}
                    </div>
                  ) : null}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {sourcePie.map(({ name, value }, i) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-gray-600">{name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Workshop + Type row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workshop payables */}
        <div className="card">
          <h3 className="section-title">مستحقات الورشة</h3>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'إجمالي المصنعية', value: fmt(wsTotal), color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'إجمالي المدفوع', value: fmt(wsPaid), color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'المتبقي (مستحق)', value: fmt(wsRemaining), color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl p-3 ${bg}`}>
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`text-lg font-extrabold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">طلبات غير مسددة</span>
            <span className="font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{wsUnpaid}</span>
          </div>
        </div>

        {/* Type breakdown */}
        <div className="card">
          <h3 className="section-title">توزيع أنواع النظارات</h3>
          {typePie.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-300 text-sm">لا توجد بيانات</div>
          ) : (
            <div className="space-y-2 mt-4">
              {typePie.sort((a, b) => b.value - a.value).map(({ name, value }, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 truncate">{name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${(value / total) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-6 text-left">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <h3 className="section-title">آخر الطلبات</h3>
        {recent.length === 0 ? (
          <div className="text-center py-12 text-gray-300">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-50"/>
            <p className="text-sm">لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['رقم الطلب','العميل','النظارة','الإجمالي','الحالة','التاريخ'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(o => {
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS['Pending Confirmation']
                  const isOverdue = o.expected_delivery && new Date(o.expected_delivery) < new Date() &&
                    !['Delivered','Cancelled','Refused on Delivery','Returned'].includes(o.status)
                  return (
                    <tr key={o.id} className={`table-row ${isOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="table-cell font-mono text-xs font-bold text-blue-600">{o.order_number}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-gray-800">{o.customer_name}</div>
                        <div className="text-xs text-gray-400">{o.customer_phone}</div>
                      </td>
                      <td className="table-cell text-xs">{o.glasses_type}</td>
                      <td className="table-cell font-bold">{fmt(o.total_final)}</td>
                      <td className="table-cell">
                        <span className={`badge ${sc.badge}`}>
                          <span className={`status-dot ${sc.dot}`}/>
                          {sc.label}
                          {isOverdue && ' ⚠️'}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-400">{o.order_date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
