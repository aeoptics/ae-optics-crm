// ── إدارة المرتجعات — متطلب #15 ──────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase, fmt } from '../lib/supabase'
import { Plus, Save, X, RotateCcw, Package, AlertTriangle, Edit3, Search, TrendingDown } from 'lucide-react'

const RETURN_REASONS = ['المنتج تالف','مقاس خاطئ','لون مختلف','لم يعجب العميل','طلب خاطئ','عيب صناعي','أسباب أخرى']
const PRODUCT_CONDITION = ['سليم — يعود للمخزون','تالف — خسارة']
const SHIP_PAID_BY = ['دفع العميل رسوم الشحن','المتجر دفع رسوم الشحن (خسارة)']

function ReturnForm({ ret, onClose, onSave }) {
  const isEdit = !!ret?.id
  const [orders, setOrders] = useState([])
  const [f, setF] = useState({
    order_id:          ret?.order_id || '',
    order_number:      ret?.order_number || '',
    customer_name:     ret?.customer_name || '',
    customer_phone:    ret?.customer_phone || '',
    return_date:       ret?.return_date || new Date().toISOString().split('T')[0],
    reason:            ret?.reason || '',
    product_condition: ret?.product_condition || 'سليم — يعود للمخزون',
    shipping_paid_by:  ret?.shipping_paid_by || 'المتجر دفع رسوم الشحن (خسارة)',
    shipping_cost:     ret?.shipping_cost || '',
    customer_paid_shipping: ret?.customer_paid_shipping || 0,
    product_cost:      ret?.product_cost || '',
    notes:             ret?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.from('orders')
      .select('id,order_number,customer_name,customer_phone,total_final,actual_profit,status,store_shipping_cost,frame_cost')
      .in('status', ['Delivered','Refused on Delivery','Returned','Shipped'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []))
  }, [])

  // Auto-fill من الطلب المختار
  const handleOrderSelect = (oid) => {
    const o = orders.find(o => o.id === oid)
    if (o) setF(p => ({
      ...p,
      order_id:       o.id,
      order_number:   o.order_number,
      customer_name:  o.customer_name,
      customer_phone: o.customer_phone,
      shipping_cost:  o.store_shipping_cost || 0,
      product_cost:   o.frame_cost || 0,
    }))
  }

  const shippingLoss = f.shipping_paid_by === 'المتجر دفع رسوم الشحن (خسارة)'
    ? Number(f.shipping_cost) || 0
    : (Number(f.shipping_cost) || 0) - (Number(f.customer_paid_shipping) || 0)

  const totalLoss = (f.product_condition === 'تالف — خسارة' ? Number(f.product_cost) || 0 : 0)
    + Math.max(shippingLoss, 0)

  const handleSave = async () => {
    if (!f.order_id || !f.reason) return
    setSaving(true)
    const payload = {
      ...f,
      shipping_cost: Number(f.shipping_cost) || 0,
      customer_paid_shipping: Number(f.customer_paid_shipping) || 0,
      product_cost: Number(f.product_cost) || 0,
      shipping_loss: Math.max(shippingLoss, 0),
      product_loss:  f.product_condition === 'تالف — خسارة' ? Number(f.product_cost) || 0 : 0,
      total_loss: totalLoss,
      return_to_inventory: f.product_condition === 'سليم — يعود للمخزون',
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    let err
    if (isEdit) ({ error: err } = await supabase.from('returns').update(payload).eq('id', ret.id))
    else ({ error: err } = await supabase.from('returns').insert(payload))

    // تحديث حالة الطلب الأصلي إلى Returned
    if (!err && !isEdit) {
      await supabase.from('orders').update({ status: 'Returned' }).eq('id', f.order_id)
    }
    setSaving(false)
    if (!err) onSave()
    else console.error(err)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل المرتجع' : 'تسجيل مرتجع جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* اختيار الطلب */}
          <div>
            <label className="label">الطلب الأصلي *</label>
            <select className="select" value={f.order_id} onChange={e => handleOrderSelect(e.target.value)}>
              <option value="">اختر الطلب...</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.customer_name} — {fmt(o.total_final)}
                </option>
              ))}
            </select>
          </div>

          {f.order_number && (
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-semibold">
              📦 {f.order_number} | 👤 {f.customer_name} | 📞 {f.customer_phone}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">تاريخ المرتجع</label>
              <input type="date" className="input" value={f.return_date} onChange={e => up('return_date', e.target.value)}/>
            </div>
            <div>
              <label className="label">سبب المرتجع *</label>
              <select className="select" value={f.reason} onChange={e => up('reason', e.target.value)}>
                <option value="">اختر سبباً...</option>
                {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* حالة المنتج */}
          <div>
            <label className="label">حالة المنتج عند العودة</label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_CONDITION.map(c => (
                <button key={c} onClick={() => up('product_condition', c)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    f.product_condition === c
                      ? c.includes('سليم') ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {c.includes('سليم') ? '✅' : '❌'} {c}
                </button>
              ))}
            </div>
            {f.product_condition === 'تالف — خسارة' && (
              <div className="mt-2">
                <label className="label">تكلفة المنتج التالف (ج)</label>
                <input type="number" className="input" value={f.product_cost}
                  onChange={e => up('product_cost', e.target.value)} placeholder="0"/>
              </div>
            )}
          </div>

          {/* رسوم الشحن */}
          <div>
            <label className="label">رسوم الشحن</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SHIP_PAID_BY.map(s => (
                <button key={s} onClick={() => up('shipping_paid_by', s)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    f.shipping_paid_by === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>{s.includes('العميل') ? '👤' : '🏪'} {s}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">تكلفة الشحن الفعلية (ج)</label>
                <input type="number" className="input" value={f.shipping_cost}
                  onChange={e => up('shipping_cost', e.target.value)} placeholder="0"/>
              </div>
              {f.shipping_paid_by !== 'دفع العميل رسوم الشحن' && (
                <div>
                  <label className="label">ما دفعه العميل (ج)</label>
                  <input type="number" className="input" value={f.customer_paid_shipping}
                    onChange={e => up('customer_paid_shipping', e.target.value)} placeholder="0"/>
                </div>
              )}
            </div>
          </div>

          {/* ملخص الخسارة */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-600 mb-2">📊 ملخص الخسارة</p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">خسارة الشحن</span>
              <span className="font-bold text-red-600">{fmt(Math.max(shippingLoss, 0))}</span>
            </div>
            {f.product_condition === 'تالف — خسارة' && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">خسارة المنتج التالف</span>
                <span className="font-bold text-red-600">{fmt(Number(f.product_cost) || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-red-200 pt-2 mt-1">
              <span className="text-red-700">إجمالي الخسارة</span>
              <span className="text-red-700 text-lg">{fmt(totalLoss)}</span>
            </div>
          </div>

          <div>
            <label className="label">ملاحظات الموظف</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving || !f.order_id || !f.reason} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ المرتجع'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Returns() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRet, setEditRet] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('returns').select('*').order('return_date', { ascending: false })
    setReturns(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = returns.filter(r =>
    !search || r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.order_number?.includes(search) || r.customer_phone?.includes(search)
  )

  const totalLoss      = returns.reduce((s, r) => s + (r.total_loss || 0), 0)
  const shippingLoss   = returns.reduce((s, r) => s + (r.shipping_loss || 0), 0)
  const productLoss    = returns.reduce((s, r) => s + (r.product_loss || 0), 0)
  const damagedCount   = returns.filter(r => r.product_condition === 'تالف — خسارة').length
  const returnedToStock= returns.filter(r => r.return_to_inventory).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">إدارة المرتجعات</h1>
          <p className="text-sm text-gray-400 mt-0.5">{returns.length} مرتجع مسجل</p>
        </div>
        <button onClick={() => { setEditRet(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16}/> تسجيل مرتجع
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي المرتجعات',  value: returns.length,      color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'إجمالي الخسائر',    value: fmt(totalLoss),      color: 'text-red-700',    bg: 'bg-red-50' },
          { label: 'خسارة الشحن',       value: fmt(shippingLoss),   color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'منتجات تالفة',      value: damagedCount,        color: 'text-rose-600',   bg: 'bg-rose-50' },
          { label: 'عاد للمخزون',       value: returnedToStock,     color: 'text-green-600',  bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* بحث */}
      <div className="card !p-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9" placeholder="بحث بالاسم، رقم الطلب، الهاتف..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* جدول */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <RotateCcw size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-sm text-gray-400">لا توجد مرتجعات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['رقم الطلب','العميل','تاريخ المرتجع','السبب','حالة المنتج','رسوم الشحن','إجمالي الخسارة','ملاحظات','إجراءات'].map(h => (
                    <th key={h} className="table-header text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="table-row group">
                    <td className="table-cell font-mono text-xs font-bold text-blue-600">{r.order_number}</td>
                    <td className="table-cell">
                      <div className="font-semibold text-gray-800 text-sm">{r.customer_name}</div>
                      <div className="text-xs text-gray-400">{r.customer_phone}</div>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{r.return_date}</td>
                    <td className="table-cell text-xs">{r.reason}</td>
                    <td className="table-cell">
                      <span className={`badge ${r.return_to_inventory ? 'pill-green' : 'pill-red'}`}>
                        {r.return_to_inventory ? '✅ للمخزون' : '❌ تالف'}
                      </span>
                    </td>
                    <td className="table-cell text-xs">
                      <div className={`font-semibold ${r.shipping_paid_by?.includes('العميل') ? 'text-green-600' : 'text-red-600'}`}>
                        {r.shipping_paid_by?.includes('العميل') ? '👤 العميل' : '🏪 المتجر'}
                      </div>
                      <div className="text-gray-400">{fmt(r.shipping_cost)}</div>
                    </td>
                    <td className="table-cell">
                      <span className="font-extrabold text-red-600">{fmt(r.total_loss)}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-400 max-w-24 truncate">{r.notes || '—'}</td>
                    <td className="table-cell">
                      <button onClick={() => { setEditRet(r); setShowForm(true) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 size={13}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ReturnForm ret={editRet}
          onClose={() => { setShowForm(false); setEditRet(null) }}
          onSave={() => { setShowForm(false); setEditRet(null); load() }}
        />
      )}
    </div>
  )
}
