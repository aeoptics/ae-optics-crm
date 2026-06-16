import { useState, useEffect, useMemo } from 'react'
import { supabase, STATUS_COLORS, ALL_STATUSES, SOURCES, PRODUCT_TYPES, fmt } from '../lib/supabase'
import OrderForm from '../components/OrderForm'
import QuickUpdate from '../components/QuickUpdate'
import { Plus, Search, X, AlertTriangle, Download, Edit3, Trash2, Zap, DollarSign } from 'lucide-react'

const ROW_BG = {
  'Delivered':              'bg-green-50/70',
  'Shipped':                'bg-blue-50/70',
  'Ready to Ship':          'bg-purple-50/70',
  'Returned from Workshop': 'bg-orange-50/50',
  'Sent to Workshop':       'bg-orange-50/70',
  'In Preparation':         'bg-yellow-50/70',
  'Confirmed':              'bg-teal-50/50',
  'Pending Confirmation':   'bg-amber-50/50',
  'Refused on Delivery':    'bg-red-50/80',
  'Returned':               'bg-rose-50/80',
  'Cancelled':              'bg-gray-50',
}

export default function Orders() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [quickOrder, setQuickOrder] = useState(null)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [page, setPage]           = useState(1)
  const PER_PAGE = 50

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const isOverdue = o =>
    o.expected_delivery && new Date(o.expected_delivery) < new Date() &&
    !['Delivered', 'Cancelled', 'Refused on Delivery', 'Returned'].includes(o.status)

  const filtered = useMemo(() => {
    let r = orders
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(o =>
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.customer_phone2?.includes(q) ||
        o.order_number?.toLowerCase().includes(q) ||
        o.frame_name?.toLowerCase().includes(q) ||
        o.governorate?.includes(q)
      )
    }
    if (filterStatus)  r = r.filter(o => o.status === filterStatus)
    if (filterSource)  r = r.filter(o => o.source === filterSource)
    if (filterType)    r = r.filter(o => o.product_type === filterType)
    if (filterPayment) r = r.filter(o => o.payment_status === filterPayment)
    return r
  }, [orders, search, filterStatus, filterSource, filterType, filterPayment])

  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return
    // Restore inventory for all order items
    await supabase.rpc('restore_items_inventory', { p_order_id: id }).catch(() => {})
    // order_items deleted via ON DELETE CASCADE
    await supabase.from('orders').delete().eq('id', id)
    load()
  }

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterSource('')
    setFilterType(''); setFilterPayment(''); setPage(1)
  }
  const hasFilters = search || filterStatus || filterSource || filterType || filterPayment

  const exportCSV = () => {
    const cols = ['order_number','order_date','customer_name','customer_phone','source','product_type','glasses_type','frame_name','frame_type','lens_type','order_value','shipping_value','discount','total_final','amount_paid','status','payment_status','actual_profit','profit_margin','tracking_number','expected_delivery','actual_delivery','workshop_sent_date','workshop_return_date','notes']
    const header = cols.join(',')
    const rows   = filtered.map(o => cols.map(c => `"${o[c] ?? ''}"`).join(','))
    const csv    = [header, ...rows].join('\n')
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a      = document.createElement('a')
    a.href       = URL.createObjectURL(blob)
    a.download   = `orders_ae_optics_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Stats
  const overdueCount   = orders.filter(isOverdue).length
  const partialCount   = orders.filter(o => o.payment_status === 'جزئي').length
  const totalRevenue   = orders.reduce((s, o) => s + (o.total_final || 0), 0)
  const totalPaid      = orders.reduce((s, o) => s + (o.amount_paid || 0), 0)
  const totalRemaining = totalRevenue - totalPaid

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">الطلبات</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} طلب — {filtered.length} معروض</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary hidden sm:flex">
            <Download size={15}/> تصدير CSV
          </button>
          <button onClick={() => { setEditOrder(null); setShowForm(true) }} className="btn-primary">
            <Plus size={16}/> طلب جديد
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {partialCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-600"/>
            <span className="text-sm font-bold text-amber-700">{partialCount} طلب بدفع جزئي</span>
          </div>
          <div className="text-sm text-amber-600">
            متبقي إجمالي: <strong>{fmt(totalRemaining)}</strong>
          </div>
        </div>
      )}

      {/* Status summary badges */}
      <div className="flex gap-2 flex-wrap">
        {ALL_STATUSES.filter(s => orders.filter(o => o.status === s).length > 0).map(s => {
          const cnt = orders.filter(o => o.status === s).length
          const sc  = STATUS_COLORS[s]
          return (
            <button key={s} onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1) }}
              className={`badge cursor-pointer transition-all hover:opacity-80 ${filterStatus === s ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${sc.badge}`}>
              <span className={`status-dot ${sc.dot}`}/>{sc.label} ({cnt})
            </button>
          )
        })}
        {overdueCount > 0 && (
          <span className="badge bg-red-100 text-red-700">
            <AlertTriangle size={11}/> متأخرة ({overdueCount})
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="card !p-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-44 relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pr-9 text-sm" placeholder="بحث بالاسم، الموبايل، رقم الطلب، المحافظة..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/>
          </div>
          <select className="select w-auto min-w-36 text-sm" value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">كل الحالات</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label}</option>)}
          </select>
          <select className="select w-auto min-w-28 text-sm" value={filterSource}
            onChange={e => { setFilterSource(e.target.value); setPage(1) }}>
            <option value="">كل المصادر</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select w-auto min-w-28 text-sm" value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}>
            <option value="">كل الأنواع</option>
            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select w-auto min-w-28 text-sm" value={filterPayment}
            onChange={e => { setFilterPayment(e.target.value); setPage(1) }}>
            <option value="">كل الدفعات</option>
            {['مدفوع','عند الاستلام','جزئي','لم يتم'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary">
              <X size={13}/> مسح
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <Search size={40} className="mx-auto mb-3 opacity-40"/>
            <p className="text-sm text-gray-400">لا توجد طلبات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['رقم الطلب','التاريخ','العميل','الموبايل','المنتجات','المصدر','الإجمالي','مدفوع','الحالة','الدفع','إجراءات'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(o => {
                  const sc      = STATUS_COLORS[o.status] || STATUS_COLORS['Pending Confirmation']
                  const overdue = isOverdue(o)
                  const rowBg   = overdue ? 'bg-red-50' : (ROW_BG[o.status] || '')
                  const srcEmoji = { Website:'🌐', WhatsApp:'💬', Messenger:'📱', TikTok:'🎵', Referral:'👥', 'Repeat Customer':'🔄' }
                  const isPartial  = o.payment_status === 'جزئي'
                  const amountPaid = o.amount_paid || 0
                  const remaining  = (o.total_final || 0) - amountPaid

                  return (
                    <tr key={o.id} className={`table-row ${rowBg} group`}>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-bold text-blue-600">{o.order_number}</span>
                          {overdue && <AlertTriangle size={11} className="text-red-500 flex-shrink-0"/>}
                        </div>
                      </td>
                      <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{o.order_date}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-gray-800 text-sm">{o.customer_name}</div>
                        {o.governorate && <div className="text-xs text-gray-400">{o.governorate}</div>}
                      </td>
                      <td className="table-cell text-xs text-gray-500 font-mono" dir="ltr">
                        <div>{o.customer_phone}</div>
                        {o.customer_phone2 && <div className="text-gray-400">{o.customer_phone2}</div>}
                      </td>
                      <td className="table-cell text-xs">
                        {o.has_items && o.items_count > 1 ? (
                          <div className="flex items-center gap-1">
                            <span className="badge bg-indigo-100 text-indigo-700">
                              {o.items_count} منتجات
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600">
                            {o.product_type === 'نظارات طبية' ? '👓' : o.product_type === 'نظارات شمسية' ? '🕶️' : '👁️'}{' '}
                            {o.product_type}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-xs">
                        <span>{srcEmoji[o.source] || ''} {o.source || '—'}</span>
                      </td>
                      <td className="table-cell font-bold text-sm">{fmt(o.total_final)}</td>
                      <td className="table-cell">
                        {isPartial ? (
                          <div>
                            <div className="text-xs font-bold text-green-600">{fmt(amountPaid)}</div>
                            <div className="text-xs text-red-500">باقي: {fmt(remaining)}</div>
                          </div>
                        ) : o.payment_status === 'مدفوع' ? (
                          <span className="text-xs font-bold text-green-600">✓ كامل</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${sc.badge}`}>
                          <span className={`status-dot ${sc.dot}`}/>{sc.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge text-xs ${
                          o.payment_status === 'مدفوع'        ? 'bg-green-100 text-green-700' :
                          o.payment_status === 'عند الاستلام' ? 'bg-blue-100 text-blue-700' :
                          o.payment_status === 'جزئي'         ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{o.payment_status || '—'}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="تحديث سريع" onClick={() => setQuickOrder(o)}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500 transition">
                            <Zap size={14}/>
                          </button>
                          <button title="تعديل كامل" onClick={() => { setEditOrder(o); setShowForm(true) }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition">
                            <Edit3 size={14}/>
                          </button>
                          <button title="حذف" onClick={() => handleDelete(o.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-400">
              صفحة {page} من {totalPages} — {filtered.length} طلب
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">السابق</button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
                    {p}
                  </button>
                )
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-40">التالي</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <OrderForm
          order={editOrder}
          onClose={() => { setShowForm(false); setEditOrder(null) }}
          onSave={() => { setShowForm(false); setEditOrder(null); load() }}
        />
      )}
      {quickOrder && (
        <QuickUpdate
          order={quickOrder}
          onClose={() => setQuickOrder(null)}
          onSave={() => { setQuickOrder(null); load() }}
        />
      )}
    </div>
  )
}
