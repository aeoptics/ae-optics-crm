// ── الشحنات المفقودة والتعويضات — متطلب #17 ─────────────────────────
import { useState, useEffect } from 'react'
import { supabase, fmt } from '../lib/supabase'
import { Plus, Save, X, Search, Edit3, AlertTriangle, Package, Truck, DollarSign } from 'lucide-react'

const COMPENSATION_STATUS = ['لم يتم التعويض','تم التعويض بالكامل','تم التعويض جزئياً']

function LostShipmentForm({ entry, onClose, onSave }) {
  const isEdit = !!entry?.id
  const [orders, setOrders] = useState([])
  const [companies, setCompanies] = useState([])
  const [f, setF] = useState({
    order_id:              entry?.order_id || '',
    order_number:          entry?.order_number || '',
    customer_name:         entry?.customer_name || '',
    shipping_company_id:   entry?.shipping_company_id || '',
    shipping_company_name: entry?.shipping_company_name || '',
    tracking_number:       entry?.tracking_number || '',
    lost_date:             entry?.lost_date || new Date().toISOString().split('T')[0],
    order_value:           entry?.order_value || '',
    product_cost:          entry?.product_cost || '',
    shipping_cost:         entry?.shipping_cost || '',
    compensation_status:   entry?.compensation_status || 'لم يتم التعويض',
    compensation_amount:   entry?.compensation_amount || '',
    compensation_date:     entry?.compensation_date || '',
    compensation_ref:      entry?.compensation_ref || '',
    notes:                 entry?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('id,order_number,customer_name,customer_phone,total_final,store_shipping_cost,frame_cost,tracking_number,shipping_company_id').order('created_at',{ascending:false}).limit(200),
      supabase.from('shipping_companies').select('id,name').eq('is_active',true)
    ]).then(([{data:ord},{data:cos}]) => {
      setOrders(ord||[])
      setCompanies(cos||[])
    })
  }, [])

  const handleOrderSelect = (oid) => {
    const o = orders.find(o => o.id === oid)
    if (o) {
      const co = companies.find(c => c.id === o.shipping_company_id)
      setF(p => ({
        ...p,
        order_id:              o.id,
        order_number:          o.order_number,
        customer_name:         o.customer_name,
        order_value:           o.total_final || 0,
        product_cost:          o.frame_cost || 0,
        shipping_cost:         o.store_shipping_cost || 0,
        tracking_number:       o.tracking_number || '',
        shipping_company_id:   o.shipping_company_id || '',
        shipping_company_name: co?.name || '',
      }))
    }
  }

  const compAmt       = Number(f.compensation_amount) || 0
  const totalLoss     = (Number(f.product_cost) || 0) + (Number(f.shipping_cost) || 0)
  const netLoss       = Math.max(totalLoss - compAmt, 0)
  const isFullComp    = f.compensation_status === 'تم التعويض بالكامل'
  const isPartial     = f.compensation_status === 'تم التعويض جزئياً'
  const showCompFields= isFullComp || isPartial

  const handleSave = async () => {
    if (!f.order_id) return
    setSaving(true)
    const payload = {
      ...f,
      order_value:         Number(f.order_value) || 0,
      product_cost:        Number(f.product_cost) || 0,
      shipping_cost:       Number(f.shipping_cost) || 0,
      compensation_amount: compAmt,
      total_loss:          totalLoss,
      net_loss:            netLoss,
      is_compensated:      isFullComp || isPartial,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    let err
    if (isEdit) ({ error: err } = await supabase.from('lost_shipments').update(payload).eq('id', entry.id))
    else ({ error: err } = await supabase.from('lost_shipments').insert(payload))
    if (!err && !isEdit) {
      await supabase.from('orders').update({ status: 'Lost Shipment' }).eq('id', f.order_id)
    }
    setSaving(false)
    if (!err) onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل شحنة مفقودة' : 'تسجيل شحنة مفقودة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">الطلب الأصلي *</label>
            <select className="select" value={f.order_id} onChange={e => handleOrderSelect(e.target.value)}>
              <option value="">اختر الطلب...</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
            </select>
          </div>
          {f.order_number && (
            <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700 font-semibold">
              ⚠️ سيتم تغيير حالة الطلب إلى "Lost Shipment" عند الحفظ
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">شركة الشحن</label>
              <select className="select" value={f.shipping_company_id}
                onChange={e => {
                  const co = companies.find(c => c.id === e.target.value)
                  up('shipping_company_id', e.target.value)
                  up('shipping_company_name', co?.name || '')
                }}>
                <option value="">اختر...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">رقم الشحنة / التتبع</label>
              <input className="input" dir="ltr" value={f.tracking_number}
                onChange={e => up('tracking_number', e.target.value)} placeholder="TRK-..."/>
            </div>
          </div>
          <div>
            <label className="label">تاريخ الفقد</label>
            <input type="date" className="input" value={f.lost_date} onChange={e => up('lost_date', e.target.value)}/>
          </div>

          {/* القيم المالية */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">قيمة الطلب (ج)</label>
              <input type="number" className="input" value={f.order_value} onChange={e => up('order_value', e.target.value)}/>
            </div>
            <div>
              <label className="label">تكلفة المنتج (ج)</label>
              <input type="number" className="input" value={f.product_cost} onChange={e => up('product_cost', e.target.value)}/>
            </div>
            <div>
              <label className="label">تكلفة الشحن (ج)</label>
              <input type="number" className="input" value={f.shipping_cost} onChange={e => up('shipping_cost', e.target.value)}/>
            </div>
          </div>

          {/* التعويض */}
          <div>
            <label className="label">حالة التعويض</label>
            <div className="grid grid-cols-1 gap-2">
              {COMPENSATION_STATUS.map(s => (
                <button key={s} onClick={() => up('compensation_status', s)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-semibold border text-start transition-all ${
                    f.compensation_status === s
                      ? s.includes('الكامل') ? 'bg-green-600 text-white border-green-600'
                        : s.includes('جزئياً') ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-red-600 text-white border-red-600'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {s.includes('الكامل') ? '✅' : s.includes('جزئياً') ? '⚠️' : '❌'} {s}
                </button>
              ))}
            </div>
          </div>

          {showCompFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">قيمة التعويض (ج)</label>
                <input type="number" className="input" value={f.compensation_amount}
                  onChange={e => up('compensation_amount', e.target.value)} placeholder="0"/>
              </div>
              <div>
                <label className="label">تاريخ التعويض</label>
                <input type="date" className="input" value={f.compensation_date}
                  onChange={e => up('compensation_date', e.target.value)}/>
              </div>
              <div className="col-span-2">
                <label className="label">رقم مرجع التعويض — اختياري</label>
                <input className="input" dir="ltr" value={f.compensation_ref}
                  onChange={e => up('compensation_ref', e.target.value)} placeholder="REF-..."/>
              </div>
            </div>
          )}

          {/* ملخص الخسارة */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-red-700 mb-2">📊 ملخص الخسارة</p>
            <div className="flex justify-between text-xs"><span className="text-gray-500">إجمالي الخسارة</span><span className="font-bold text-red-600">{fmt(totalLoss)}</span></div>
            {compAmt > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">التعويض المستلم</span><span className="font-bold text-green-600">+{fmt(compAmt)}</span></div>}
            <div className="flex justify-between text-sm font-bold border-t border-red-200 pt-2">
              <span className="text-red-700">صافي الخسارة</span>
              <span className={`text-lg ${netLoss > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmt(netLoss)}</span>
            </div>
          </div>

          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving || !f.order_id} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LostShipments() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('lost_shipments').select('*').order('lost_date',{ascending:false})
    setItems(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const filtered = items.filter(i =>
    !search || i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.order_number?.includes(search) || i.tracking_number?.includes(search) ||
    i.shipping_company_name?.includes(search)
  )

  const totalLoss        = items.reduce((s,i)=>s+(i.net_loss||0),0)
  const totalComp        = items.reduce((s,i)=>s+(i.compensation_amount||0),0)
  const fullyComp        = items.filter(i=>i.compensation_status==='تم التعويض بالكامل').length
  const noComp           = items.filter(i=>i.compensation_status==='لم يتم التعويض').length

  // إحصاءات شركات الشحن
  const byCompany = {}
  items.forEach(i => {
    const n = i.shipping_company_name || 'غير محدد'
    if (!byCompany[n]) byCompany[n] = { total:0, compensated:0, lost:0 }
    byCompany[n].total++
    if (i.is_compensated) byCompany[n].compensated++
    else byCompany[n].lost++
  })

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">الشحنات المفقودة</h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} شحنة مفقودة مسجلة</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16}/> تسجيل شحنة مفقودة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المفقودة',      value: items.length, color: 'text-red-600',   bg: 'bg-red-50' },
          { label: 'صافي الخسائر',         value: fmt(totalLoss), color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'إجمالي التعويضات',    value: fmt(totalComp), color: 'text-green-600',bg: 'bg-green-50' },
          { label: 'بدون تعويض',           value: noComp, color: 'text-orange-600',      bg: 'bg-orange-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* تقييم شركات الشحن */}
      {Object.keys(byCompany).length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4">🚚 أداء شركات الشحن — الشحنات المفقودة</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['الشركة','إجمالي المفقودة','تم التعويض','بدون تعويض','نسبة التعويض'].map(h=>(
                    <th key={h} className="table-header text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCompany).map(([name, s]) => (
                  <tr key={name} className="table-row">
                    <td className="table-cell font-semibold">{name}</td>
                    <td className="table-cell text-center font-bold text-red-600">{s.total}</td>
                    <td className="table-cell text-center font-bold text-green-600">{s.compensated}</td>
                    <td className="table-cell text-center font-bold text-orange-600">{s.lost}</td>
                    <td className="table-cell text-center">
                      <span className={`badge ${s.compensated/s.total>=0.7?'pill-green':s.compensated/s.total>=0.4?'pill-yellow':'pill-red'}`}>
                        {s.total>0?(s.compensated/s.total*100).toFixed(0):0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* بحث */}
      <div className="card !p-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9" placeholder="بحث باسم العميل، رقم الطلب، رقم التتبع..."
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
            <Package size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-sm text-gray-400">لا توجد شحنات مفقودة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['رقم الطلب','العميل','شركة الشحن','رقم التتبع','تاريخ الفقد','قيمة الطلب','صافي الخسارة','التعويض','إجراءات'].map(h=>(
                    <th key={h} className="table-header text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i=>(
                  <tr key={i.id} className="table-row group">
                    <td className="table-cell font-mono text-xs font-bold text-blue-600">{i.order_number}</td>
                    <td className="table-cell">
                      <div className="font-semibold text-gray-800 text-sm">{i.customer_name}</div>
                    </td>
                    <td className="table-cell text-sm">{i.shipping_company_name || '—'}</td>
                    <td className="table-cell text-xs font-mono text-gray-400">{i.tracking_number || '—'}</td>
                    <td className="table-cell text-xs text-gray-500">{i.lost_date}</td>
                    <td className="table-cell font-semibold text-sm">{fmt(i.order_value)}</td>
                    <td className="table-cell">
                      <span className={`font-extrabold text-sm ${i.net_loss>0?'text-red-600':'text-green-600'}`}>
                        {fmt(i.net_loss)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge text-xs ${
                        i.compensation_status==='تم التعويض بالكامل' ? 'pill-green' :
                        i.compensation_status==='تم التعويض جزئياً' ? 'pill-yellow' : 'pill-red'
                      }`}>
                        {i.compensation_status==='تم التعويض بالكامل' ? '✅ كامل' :
                         i.compensation_status==='تم التعويض جزئياً' ? '⚠️ جزئي' : '❌ لا'}
                        {i.compensation_amount>0 && ` (${fmt(i.compensation_amount)})`}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => { setEditItem(i); setShowForm(true) }}
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
        <LostShipmentForm entry={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSave={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}
    </div>
  )
}
