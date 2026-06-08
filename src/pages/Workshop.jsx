import { useState, useEffect } from 'react'
import { supabase, fmt } from '../lib/supabase'
import { Plus, Save, X, Wrench, CheckCircle, Clock, AlertTriangle, Edit3, Trash2 } from 'lucide-react'

const PAID_OPTS = ['نعم','لا','جزئي']
const PAID_COLORS = { 'نعم': 'pill-green', 'لا': 'pill-red', 'جزئي': 'pill-yellow' }

function WorkshopForm({ entry, orders, onClose, onSave }) {
  const isEdit = !!entry?.id
  const [f, setF] = useState({
    order_id: entry?.order_id || '',
    order_number: entry?.order_number || '',
    customer_name: entry?.customer_name || '',
    frame_type: entry?.frame_type || '',
    manuf_cost: entry?.manuf_cost || '',
    paid: entry?.paid || 'لا',
    amount_paid: entry?.amount_paid || '',
    sent_date: entry?.sent_date || '',
    received_date: entry?.received_date || '',
    notes: entry?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Auto-fill from order
  useEffect(() => {
    if (f.order_id) {
      const o = orders.find(o => o.id === f.order_id)
      if (o) setF(p => ({
        ...p,
        order_number: o.order_number,
        customer_name: o.customer_name,
        frame_type: o.frame_type || '',
        manuf_cost: o.manuf_cost || '',
        sent_date: o.workshop_sent_date || '',
        received_date: o.workshop_return_date || '',
      }))
    }
  }, [f.order_id])

  const remaining = Math.max((Number(f.manuf_cost) || 0) - (Number(f.amount_paid) || 0), 0)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...f,
      manuf_cost: Number(f.manuf_cost) || 0,
      amount_paid: Number(f.amount_paid) || 0,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    let error
    if (isEdit) ({ error } = await supabase.from('workshop_accounts').update(payload).eq('id', entry.id))
    else ({ error } = await supabase.from('workshop_accounts').insert(payload))
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل سجل الورشة' : 'إضافة سجل ورشة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">ربط بطلب موجود</label>
            <select className="select" value={f.order_id} onChange={e => up('order_id', e.target.value)}>
              <option value="">اختر طلب (اختياري)...</option>
              {orders.filter(o => o.needs_workshop).map(o => (
                <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">اسم العميل</label>
              <input className="input" value={f.customer_name} onChange={e => up('customer_name', e.target.value)}/></div>
            <div><label className="label">نوع الفريم</label>
              <select className="select" value={f.frame_type} onChange={e => up('frame_type', e.target.value)}>
                <option value="">اختر...</option>
                {['Full Frame','Half Frame','Rimless'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">تكلفة المصنعية (ج)</label>
            <input type="number" className="input" value={f.manuf_cost} onChange={e => up('manuf_cost', e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">هل تم الدفع؟</label>
              <select className="select" value={f.paid} onChange={e => up('paid', e.target.value)}>
                {PAID_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className="label">المبلغ المدفوع (ج)</label>
              <input type="number" className="input" value={f.amount_paid} onChange={e => up('amount_paid', e.target.value)}/></div>
          </div>
          {/* Remaining preview */}
          <div className={`rounded-xl p-3 flex items-center justify-between ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <span className={`text-sm font-semibold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {remaining > 0 ? '⏳ المتبقي' : '✅ مسدد بالكامل'}
            </span>
            <span className={`text-xl font-extrabold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {remaining.toLocaleString()} ج
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">تاريخ الإرسال</label>
              <input type="date" className="input" value={f.sent_date || ''} onChange={e => up('sent_date', e.target.value)}/></div>
            <div><label className="label">تاريخ الاستلام</label>
              <input type="date" className="input" value={f.received_date || ''} onChange={e => up('received_date', e.target.value)}/></div>
          </div>
          <div><label className="label">ملاحظات</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Workshop() {
  const [entries, setEntries] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  const load = async () => {
    setLoading(true)
    const [{ data: ws }, { data: ord }] = await Promise.all([
      supabase.from('workshop_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('id,order_number,customer_name,needs_workshop,frame_type,manuf_cost,workshop_sent_date,workshop_return_date').eq('needs_workshop', true)
    ])
    setEntries(ws || [])
    setOrders(ord || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const totalCost = entries.reduce((s, e) => s + (e.manuf_cost || 0), 0)
  const totalPaid = entries.reduce((s, e) => s + (e.amount_paid || 0), 0)
  const totalRemaining = entries.reduce((s, e) => s + (e.amount_remaining || 0), 0)
  const unpaid = entries.filter(e => e.paid !== 'نعم').length

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا السجل؟')) return
    await supabase.from('workshop_accounts').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">حسابات الورشة</h1>
          <p className="text-sm text-gray-400 mt-0.5">متابعة مستحقات المصنعية</p>
        </div>
        <button onClick={() => { setEditEntry(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16}/> إضافة سجل
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المصنعية', value: fmt(totalCost), color: 'text-blue-600', bg: 'bg-blue-50', icon: Wrench },
          { label: 'إجمالي المدفوع', value: fmt(totalPaid), color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: 'إجمالي المتبقي', value: fmt(totalRemaining), color: 'text-red-600', bg: 'bg-red-50', icon: Clock },
          { label: 'طلبات لم تُسدد', value: unpaid, color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`card flex items-center gap-3 ${bg} border-0`}>
            <Icon size={22} className={color}/>
            <div>
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`text-xl font-extrabold ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Wrench size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-sm text-gray-400">لا توجد سجلات ورشة بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['العميل','الفريم','تكلفة المصنعية','تم الدفع؟','المدفوع','المتبقي','تاريخ الإرسال','تاريخ الاستلام','إجراءات'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className={`table-row group ${e.paid === 'لا' ? 'bg-red-50/40' : e.paid === 'جزئي' ? 'bg-yellow-50/40' : ''}`}>
                    <td className="table-cell">
                      <div className="font-semibold text-gray-800">{e.customer_name}</div>
                      {e.order_number && <div className="text-xs text-blue-500 font-mono">{e.order_number}</div>}
                    </td>
                    <td className="table-cell text-xs">{e.frame_type || '—'}</td>
                    <td className="table-cell font-bold">{fmt(e.manuf_cost)}</td>
                    <td className="table-cell"><span className={`badge ${PAID_COLORS[e.paid] || 'pill-gray'}`}>{e.paid}</span></td>
                    <td className="table-cell text-green-600 font-semibold">{fmt(e.amount_paid)}</td>
                    <td className="table-cell">
                      <span className={`font-bold ${(e.amount_remaining || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(e.amount_remaining)}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">{e.sent_date || '—'}</td>
                    <td className="table-cell text-xs text-gray-400">{e.received_date || '—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditEntry(e); setShowForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <Edit3 size={14}/>
                        </button>
                        <button onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <WorkshopForm entry={editEntry} orders={orders}
          onClose={() => { setShowForm(false); setEditEntry(null) }}
          onSave={() => { setShowForm(false); setEditEntry(null); load() }}
        />
      )}
    </div>
  )
}
