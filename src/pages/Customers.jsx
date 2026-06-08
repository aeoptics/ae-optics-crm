// ── صفحة العملاء مع التقييم التلقائي (متطلب #16) ───────────────────
import { useState, useEffect } from 'react'
import { supabase, fmt, STATUS_COLORS } from '../lib/supabase'
import { Users, DollarSign, ShoppingBag, Search, Star, TrendingDown, Phone } from 'lucide-react'

const RATING_COLORS = {
  'ممتاز':    { badge: 'bg-green-100 text-green-700',  icon: '⭐', label: 'ممتاز' },
  'متوسط':   { badge: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'متوسط' },
  'منخفض':   { badge: 'bg-red-100 text-red-700',       icon: '🔴', label: 'منخفض' },
}

function calcRating(c) {
  const { total, delivered, returned, cancelled } = c
  if (total === 0) return 'متوسط'
  const deliverRate = delivered / total
  const returnRate  = returned / total
  if (deliverRate >= 0.85 && returnRate <= 0.05) return 'ممتاز'
  if (deliverRate < 0.50 || returnRate > 0.30 || (cancelled / total) > 0.30) return 'منخفض'
  return 'متوسط'
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [sortBy, setSortBy]       = useState('orders')

  useEffect(() => {
    setLoading(true)
    supabase.from('orders')
      .select('customer_name,customer_phone,order_date,order_number,total_final,status,actual_profit,source')
      .order('order_date', { ascending: false })
      .then(({ data }) => {
        const map = {}
        ;(data || []).forEach(o => {
          const key = o.customer_phone || o.customer_name
          if (!map[key]) map[key] = {
            name: o.customer_name,
            phone: o.customer_phone,
            orders: [], total: 0, profit: 0,
            lastDate: o.order_date, lastStatus: o.status,
            delivered: 0, returned: 0, cancelled: 0, refused: 0,
            sources: new Set(),
          }
          map[key].orders.push(o)
          map[key].total  += (o.total_final || 0)
          map[key].profit += (o.actual_profit || 0)
          if (o.order_date > map[key].lastDate) { map[key].lastDate = o.order_date; map[key].lastStatus = o.status }
          if (o.status === 'Delivered')            map[key].delivered++
          if (o.status === 'Returned')             map[key].returned++
          if (o.status === 'Cancelled')            map[key].cancelled++
          if (o.status === 'Refused on Delivery')  map[key].refused++
          if (o.source) map[key].sources.add(o.source)
        })

        const list = Object.values(map).map(c => ({
          ...c,
          total_orders: c.orders.length,
          delivery_rate: c.orders.length > 0 ? (c.delivered / c.orders.length) : 0,
          rating: calcRating({ total: c.orders.length, delivered: c.delivered, returned: c.returned + c.refused, cancelled: c.cancelled }),
          is_repeat: c.orders.length > 1,
          sources_list: [...c.sources].join(' / '),
        }))

        setCustomers(list)
        setLoading(false)
      })
  }, [])

  const filtered = customers
    .filter(c => (!search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)))
    .filter(c => (!filterRating || c.rating === filterRating))
    .sort((a, b) => {
      if (sortBy === 'orders')    return b.total_orders - a.total_orders
      if (sortBy === 'revenue')   return b.total - a.total
      if (sortBy === 'delivery')  return b.delivery_rate - a.delivery_rate
      if (sortBy === 'profit')    return b.profit - a.profit
      return 0
    })

  const totalCustomers  = customers.length
  const repeatCustomers = customers.filter(c => c.is_repeat).length
  const excellentCount  = customers.filter(c => c.rating === 'ممتاز').length
  const lowCount        = customers.filter(c => c.rating === 'منخفض').length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="page-title">أرشيف العملاء</h1>
        <p className="text-sm text-gray-400 mt-0.5">{totalCustomers} عميل</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العملاء',   value: totalCustomers,  icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'عملاء متكررون',    value: repeatCustomers, icon: ShoppingBag, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'عملاء ممتازون',    value: excellentCount,  icon: Star,        color: 'text-teal-600',   bg: 'bg-teal-50' },
          { label: 'عملاء منخفضون',   value: lowCount,        icon: TrendingDown,color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card flex items-center gap-3 ${bg} border-0`}>
            <Icon size={20} className={color}/>
            <div>
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`text-xl font-extrabold ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card !p-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-44 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9" placeholder="بحث بالاسم أو الموبايل..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="select w-auto min-w-32" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="">كل التقييمات</option>
          {['ممتاز','متوسط','منخفض'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="select w-auto min-w-32" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="orders">ترتيب: عدد الطلبات</option>
          <option value="revenue">ترتيب: الإنفاق</option>
          <option value="delivery">ترتيب: نسبة الاستلام</option>
          <option value="profit">ترتيب: الربح</option>
        </select>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <Users size={40} className="mx-auto mb-3"/>
            <p className="text-sm text-gray-400">لا توجد بيانات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['العميل','الموبايل','عدد الطلبات','المستلم','نسبة الاستلام','إجمالي الإنفاق','إجمالي الربح','التقييم','آخر حالة'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const rc  = RATING_COLORS[c.rating] || RATING_COLORS['متوسط']
                  const sc  = STATUS_COLORS[c.lastStatus] || STATUS_COLORS['Pending Confirmation']
                  const pct = (c.delivery_rate * 100).toFixed(0)
                  return (
                    <tr key={i} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                            {c.name?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{c.name}</div>
                            {c.is_repeat && <span className="text-xs text-green-600 font-semibold">🔄 متكرر</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm font-mono text-gray-500" dir="ltr">
                        <div className="flex items-center gap-1">
                          <Phone size={11} className="text-gray-300"/>
                          {c.phone}
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge ${c.total_orders > 1 ? 'pill-green' : 'pill-blue'}`}>
                          {c.total_orders}
                        </span>
                      </td>
                      <td className="table-cell text-center text-sm font-semibold text-green-700">{c.delivered}</td>
                      <td className="table-cell text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-12">
                            <div className={`h-1.5 rounded-full ${Number(pct) >= 80 ? 'bg-green-500' : Number(pct) >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}/>
                          </div>
                          <span className={`text-xs font-bold ${Number(pct) >= 80 ? 'text-green-600' : Number(pct) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="table-cell font-bold text-sm">{fmt(c.total)}</td>
                      <td className="table-cell">
                        <span className={`font-bold text-sm ${c.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {fmt(c.profit)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${rc.badge}`}>{rc.icon} {rc.label}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${sc.badge}`}>
                          <span className={`status-dot ${sc.dot}`}/>{sc.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customers by rating summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {['ممتاز','متوسط','منخفض'].map(r => {
            const rc   = RATING_COLORS[r]
            const list = customers.filter(c => c.rating === r)
            return (
              <div key={r} className={`card ${r === 'ممتاز' ? 'bg-green-50 border-green-100' : r === 'منخفض' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${rc.badge}`}>{rc.icon} {rc.label}</span>
                  <span className="text-2xl font-extrabold text-gray-800">{list.length}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>متوسط نسبة الاستلام</span>
                    <span className="font-bold">{list.length ? (list.reduce((s,c) => s + c.delivery_rate, 0) / list.length * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي الإنفاق</span>
                    <span className="font-bold">{fmt(list.reduce((s,c) => s + c.total, 0))}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
