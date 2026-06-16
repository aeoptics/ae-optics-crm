// ── صفحة العملاء مع دعم رقمين هاتف وتقييم تلقائي ───────────────────
import { useState, useEffect } from 'react'
import { supabase, fmt, STATUS_COLORS } from '../lib/supabase'
import { Users, DollarSign, ShoppingBag, Search, Star, TrendingDown, Phone, Plus, X, Save, Edit3 } from 'lucide-react'

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

function CustomerForm({ customer, onClose, onSave }) {
  const isEdit = !!customer?.id
  const [f, setF] = useState({
    name:   customer?.name  || '',
    phone:  customer?.phone  || '',
    phone2: customer?.phone2 || '',
    email:  customer?.email  || '',
    notes:  customer?.notes  || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.name.trim() || !f.phone.trim()) { setError('الاسم والهاتف مطلوبان'); return }
    setSaving(true)
    const payload = {
      name:   f.name.trim(),
      phone:  f.phone.trim(),
      phone2: f.phone2.trim() || null,
      email:  f.email.trim() || null,
      notes:  f.notes.trim() || null,
    }
    let err
    if (isEdit) {
      ({ error: err } = await supabase.from('customers').update(payload).eq('id', customer.id))
    } else {
      ({ error: err } = await supabase.from('customers').insert(payload))
    }
    setSaving(false)
    if (err) setError(err.message)
    else onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'تعديل بيانات العميل' : 'عميل جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">اسم العميل *</label>
            <input className="input" value={f.name} onChange={e => up('name', e.target.value)} placeholder="الاسم الكامل"/>
          </div>
          <div>
            <label className="label">رقم الهاتف الأساسي *</label>
            <input className="input" value={f.phone} onChange={e => up('phone', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr"/>
          </div>
          <div>
            <label className="label">رقم الهاتف الاحتياطي (اختياري)</label>
            <input className="input" value={f.phone2} onChange={e => up('phone2', e.target.value)} placeholder="رقم بديل" dir="ltr"/>
          </div>
          <div>
            <label className="label">البريد الإلكتروني (اختياري)</label>
            <input className="input" value={f.email} onChange={e => up('email', e.target.value)} placeholder="example@mail.com" dir="ltr"/>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
          </div>
          {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [sortBy, setSortBy]       = useState('orders')
  const [showForm, setShowForm]   = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)

  const loadCustomers = async () => {
    setLoading(true)

    // Load orders data for analytics
    const { data: ordersData } = await supabase
      .from('orders')
      .select('customer_id,customer_name,customer_phone,order_date,order_number,total_final,status,actual_profit,source')
      .order('order_date', { ascending: false })

    // Load customers from customers table (the source of truth)
    const { data: custData } = await supabase
      .from('customers')
      .select('id,name,phone,phone2,email,notes,created_at')
      .order('created_at', { ascending: false })

    // Build analytics map from orders
    const analyticsMap = {}
    ;(ordersData || []).forEach(o => {
      const key = o.customer_id || o.customer_phone
      if (!analyticsMap[key]) analyticsMap[key] = {
        orders: [], total: 0, profit: 0,
        lastDate: o.order_date, lastStatus: o.status,
        delivered: 0, returned: 0, cancelled: 0, refused: 0,
      }
      analyticsMap[key].orders.push(o)
      analyticsMap[key].total  += (o.total_final || 0)
      analyticsMap[key].profit += (o.actual_profit || 0)
      if (o.order_date > analyticsMap[key].lastDate) {
        analyticsMap[key].lastDate   = o.order_date
        analyticsMap[key].lastStatus = o.status
      }
      if (o.status === 'Delivered')            analyticsMap[key].delivered++
      if (o.status === 'Returned')             analyticsMap[key].returned++
      if (o.status === 'Cancelled')            analyticsMap[key].cancelled++
      if (o.status === 'Refused on Delivery')  analyticsMap[key].refused++
    })

    const list = (custData || []).map(cust => {
      const analytics = analyticsMap[cust.id] || analyticsMap[cust.phone] || {
        orders: [], total: 0, profit: 0, delivered: 0, returned: 0, cancelled: 0, refused: 0
      }
      const total_orders = analytics.orders.length
      const delivery_rate = total_orders > 0 ? analytics.delivered / total_orders : 0
      return {
        ...cust,
        ...analytics,
        total_orders,
        delivery_rate,
        rating: calcRating({
          total: total_orders,
          delivered: analytics.delivered,
          returned: analytics.returned + analytics.refused,
          cancelled: analytics.cancelled,
        }),
        is_repeat: total_orders > 1,
      }
    })

    setCustomers(list)
    setLoading(false)
  }

  useEffect(() => { loadCustomers() }, [])

  const filtered = customers
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.phone2?.includes(q)
    })
    .filter(c => (!filterRating || c.rating === filterRating))
    .sort((a, b) => {
      if (sortBy === 'orders')    return b.total_orders - a.total_orders
      if (sortBy === 'revenue')   return b.total - a.total
      if (sortBy === 'delivery')  return b.delivery_rate - a.delivery_rate
      if (sortBy === 'profit')    return b.profit - a.profit
      if (sortBy === 'newest')    return new Date(b.created_at) - new Date(a.created_at)
      return 0
    })

  const totalCustomers  = customers.length
  const repeatCustomers = customers.filter(c => c.is_repeat).length
  const excellentCount  = customers.filter(c => c.rating === 'ممتاز').length
  const lowCount        = customers.filter(c => c.rating === 'منخفض').length

  const handleCloseForm = () => { setShowForm(false); setEditCustomer(null) }
  const handleSaveForm  = () => { handleCloseForm(); loadCustomers() }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">أرشيف العملاء</h1>
          <p className="text-sm text-gray-400 mt-0.5">{totalCustomers} عميل</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16}/> عميل جديد
        </button>
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
          <input className="input pr-9" placeholder="بحث بالاسم أو أي رقم هاتف..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="select w-auto min-w-32" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
          <option value="">كل التقييمات</option>
          {['ممتاز','متوسط','منخفض'].map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="select w-auto min-w-40" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">ترتيب: الأحدث</option>
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
                  {['العميل','الهاتف الأساسي','هاتف احتياطي','عدد الطلبات','نسبة الاستلام','إجمالي الإنفاق','التقييم','آخر حالة',''].map(h => (
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
                    <tr key={c.id || i} className="table-row">
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
                      <td className="table-cell text-sm font-mono text-gray-400" dir="ltr">
                        {c.phone2 ? (
                          <div className="flex items-center gap-1">
                            <Phone size={11} className="text-gray-200"/>
                            {c.phone2}
                          </div>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge ${c.total_orders > 1 ? 'pill-green' : 'pill-blue'}`}>
                          {c.total_orders}
                        </span>
                      </td>
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
                        <span className={`badge ${rc.badge}`}>{rc.icon} {rc.label}</span>
                      </td>
                      <td className="table-cell">
                        {c.lastStatus ? (
                          <span className={`badge ${sc.badge}`}>
                            <span className={`status-dot ${sc.dot}`}/>{sc.label}
                          </span>
                        ) : <span className="text-gray-300 text-xs">لا يوجد طلبات</span>}
                      </td>
                      <td className="table-cell">
                        <button onClick={() => { setEditCustomer(c); setShowForm(true) }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                          <Edit3 size={14}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary by rating */}
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
                    <span className="font-bold">{fmt(list.reduce((s,c) => s + (c.total||0), 0))}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showForm || editCustomer) && (
        <CustomerForm
          customer={editCustomer}
          onClose={handleCloseForm}
          onSave={handleSaveForm}
        />
      )}
    </div>
  )
}
