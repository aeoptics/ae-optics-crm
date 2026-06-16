import { useState, useEffect, useMemo } from 'react'
import { supabase, STATUS_COLORS, fmt } from '../lib/supabase'
import { RefreshCw, Phone, Package, Truck, CheckCircle, Wrench, Clock, XCircle, AlertTriangle, Search, Filter } from 'lucide-react'

const PIPELINE = [
  { status: 'Confirmed',             icon: CheckCircle, color: 'teal' },
  { status: 'In Preparation',        icon: Package,     color: 'yellow' },
  { status: 'Sent to Workshop',      icon: Wrench,      color: 'orange' },
  { status: 'Returned from Workshop',icon: Wrench,      color: 'orange' },
  { status: 'Ready to Ship',         icon: Package,     color: 'purple' },
  { status: 'Shipped',               icon: Truck,       color: 'blue' },
  { status: 'Delivered',             icon: CheckCircle, color: 'green' },
]

const SPECIAL = [
  { status: 'Pending Confirmation', icon: Clock,    color: 'amber' },
  { status: 'Refused on Delivery',  icon: XCircle,  color: 'red' },
  { status: 'Returned',             icon: XCircle,  color: 'rose' },
  { status: 'Cancelled',            icon: XCircle,  color: 'gray' },
]

const ALL_FILTER_STATUSES = [
  { value: 'Pending Confirmation',   label: 'انتظار التأكيد' },
  { value: 'Confirmed',              label: 'مؤكد' },
  { value: 'In Preparation',         label: 'تحت التجهيز' },
  { value: 'Sent to Workshop',       label: 'في الورشة' },
  { value: 'Returned from Workshop', label: 'رجع من الورشة' },
  { value: 'Ready to Ship',          label: 'جاهز للشحن' },
  { value: 'Shipped',                label: 'تم الشحن' },
  { value: 'Delivered',              label: 'تم التسليم' },
  { value: 'Refused on Delivery',    label: 'مرفوض' },
  { value: 'Returned',               label: 'مرتجع' },
  { value: 'Cancelled',              label: 'ملغي' },
]

const COL_COLORS = {
  teal:   'bg-teal-500',   yellow: 'bg-yellow-400',
  orange: 'bg-orange-500', purple: 'bg-purple-500',
  blue:   'bg-blue-500',   green:  'bg-green-500',
  amber:  'bg-amber-400',  red:    'bg-red-500',
  rose:   'bg-rose-500',   gray:   'bg-gray-400',
}
const COL_BG = {
  teal:   'bg-teal-50',   yellow: 'bg-yellow-50',
  orange: 'bg-orange-50', purple: 'bg-purple-50',
  blue:   'bg-blue-50',   green:  'bg-green-50',
  amber:  'bg-amber-50',  red:    'bg-red-50',
  rose:   'bg-rose-50',   gray:   'bg-gray-50',
}
const COL_TEXT = {
  teal:   'text-teal-700',   yellow: 'text-yellow-700',
  orange: 'text-orange-700', purple: 'text-purple-700',
  blue:   'text-blue-700',   green:  'text-green-700',
  amber:  'text-amber-700',  red:    'text-red-700',
  rose:   'text-rose-700',   gray:   'text-gray-600',
}

function OrderCard({ order }) {
  const sc = STATUS_COLORS[order.status] || STATUS_COLORS['Pending Confirmation']
  const isOverdue = order.expected_delivery &&
    new Date(order.expected_delivery) < new Date() &&
    !['Delivered','Cancelled','Refused on Delivery','Returned'].includes(order.status)

  return (
    <div className={`rounded-xl border p-3 mb-2 text-xs shadow-sm transition-all hover:shadow-md
      ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-blue-600 text-xs">{order.order_number}</span>
        {isOverdue && <AlertTriangle size={12} className="text-red-500"/>}
      </div>
      <div className="font-semibold text-gray-800 text-sm truncate">{order.customer_name}</div>
      <div className="text-gray-400 font-mono mt-0.5" dir="ltr">{order.customer_phone}</div>
      <div className="flex items-center gap-1 mt-2 text-gray-500">
        <Package size={11}/> <span className="truncate">{order.glasses_type || order.product_type}</span>
      </div>
      {order.frame_name && (
        <div className="text-gray-400 mt-0.5 truncate">{order.frame_name}</div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="font-bold text-gray-700">{fmt(order.total_final)}</span>
        <span className="text-gray-400">{order.order_date}</span>
      </div>
      {order.expected_delivery && (
        <div className={`mt-1 text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
          📅 التسليم: {order.expected_delivery}
          {isOverdue && ' ⚠️ متأخر'}
        </div>
      )}
      {order.shipping_company_name && (
        <div className="mt-1 text-gray-400">🚚 {order.shipping_company_name}</div>
      )}
    </div>
  )
}

export default function DeliveryTracker() {
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [showFilters, setShowFilters]     = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id,order_number,order_date,customer_name,customer_phone,glasses_type,product_type,frame_name,total_final,status,expected_delivery,shipping_company_id,shipping_companies(name)')
      .order('created_at', { ascending: false })
    const mapped = (data || []).map(o => ({
      ...o,
      shipping_company_name: o.shipping_companies?.name || '',
    }))
    setOrders(mapped)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleStatus = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const filteredOrders = useMemo(() => {
    let result = orders
    if (selectedStatuses.length > 0) {
      result = result.filter(o => selectedStatuses.includes(o.status))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.order_number?.toLowerCase().includes(q)
      )
    }
    return result
  }, [orders, selectedStatuses, search])

  const byStatus = (status) => filteredOrders.filter(o => o.status === status)
  const countByStatus = (status) => orders.filter(o => o.status === status).length

  const overdue = orders.filter(o =>
    o.expected_delivery && new Date(o.expected_delivery) < new Date() &&
    !['Delivered','Cancelled','Refused on Delivery','Returned'].includes(o.status)
  )

  const showPipeline = selectedStatuses.length === 0 || PIPELINE.some(p => selectedStatuses.includes(p.status))
  const showSpecial  = selectedStatuses.length === 0 || SPECIAL.some(p => selectedStatuses.includes(p.status))

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">متابعة التوصيل</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {filteredOrders.length} طلب معروض {orders.length !== filteredOrders.length ? `من ${orders.length}` : ''}
          </p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={15}/> تحديث
        </button>
      </div>

      {/* Filters panel */}
      <div className="card !p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pr-9" placeholder="بحث بالاسم أو الموبايل أو رقم الطلب..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button onClick={() => setShowFilters(p => !p)}
            className={`btn-secondary gap-1.5 ${selectedStatuses.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}>
            <Filter size={14}/>
            فلاتر {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
          </button>
          {(selectedStatuses.length > 0 || search) && (
            <button onClick={() => { setSelectedStatuses([]); setSearch('') }}
              className="text-xs text-red-500 font-semibold hover:underline">مسح الكل</button>
          )}
        </div>

        {showFilters && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">تصفية حسب الحالة (يمكن اختيار أكثر من حالة):</p>
            <div className="flex flex-wrap gap-2">
              {ALL_FILTER_STATUSES.map(({ value, label }) => {
                const count = countByStatus(value)
                const active = selectedStatuses.includes(value)
                const sc = STATUS_COLORS[value]
                return (
                  <button key={value} onClick={() => toggleStatus(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      active ? `${sc?.badge || 'bg-blue-100 text-blue-700'} border-current shadow-sm` : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {label}
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      active ? 'bg-white/50' : 'bg-gray-200 text-gray-600'
                    }`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0"/>
          <div>
            <p className="text-sm font-bold text-red-700">{overdue.length} طلب متأخر عن موعد التسليم!</p>
            <p className="text-xs text-red-500 mt-0.5">الطلبات المتأخرة محددة بخلفية حمراء</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* Pipeline board */}
          {showPipeline && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">مراحل التنفيذ</h2>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {PIPELINE
                  .filter(({ status }) => selectedStatuses.length === 0 || selectedStatuses.includes(status))
                  .map(({ status, icon: Icon, color }) => {
                    const items = byStatus(status)
                    const sc = STATUS_COLORS[status]
                    return (
                      <div key={status} className="flex-shrink-0 w-56">
                        <div className={`rounded-xl p-3 mb-2 ${COL_BG[color]}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className={`flex items-center gap-1.5 font-bold text-sm ${COL_TEXT[color]}`}>
                              <Icon size={15}/>
                              <span>{sc?.label}</span>
                            </div>
                            <span className={`w-6 h-6 rounded-full ${COL_COLORS[color]} text-white text-xs font-bold flex items-center justify-center`}>
                              {items.length}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                          {items.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-100 p-4 text-center text-gray-300 text-xs">
                              لا توجد طلبات
                            </div>
                          ) : items.map(o => <OrderCard key={o.id} order={o}/>)}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Special statuses */}
          {showSpecial && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">حالات أخرى</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SPECIAL
                  .filter(({ status }) => selectedStatuses.length === 0 || selectedStatuses.includes(status))
                  .map(({ status, icon: Icon, color }) => {
                    const items = byStatus(status)
                    const sc = STATUS_COLORS[status]
                    return (
                      <div key={status} className={`rounded-xl p-4 ${COL_BG[color]} border border-${color}-100`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-1.5 font-bold text-sm ${COL_TEXT[color]}`}>
                            <Icon size={15}/>
                            <span>{sc?.label}</span>
                          </div>
                          <span className={`w-7 h-7 rounded-full ${COL_COLORS[color]} text-white text-sm font-bold flex items-center justify-center`}>
                            {items.length}
                          </span>
                        </div>
                        {items.slice(0, 3).map(o => (
                          <div key={o.id} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                            <span className="font-semibold">{o.customer_name}</span>
                            <span className="text-gray-400 ms-1 font-mono">{o.order_number}</span>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <div className={`text-xs mt-1 font-semibold ${COL_TEXT[color]}`}>+ {items.length - 3} أخرى</div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {filteredOrders.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <Package size={40} className="mx-auto mb-3"/>
              <p className="text-sm text-gray-400">لا توجد طلبات تطابق الفلاتر المحددة</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
