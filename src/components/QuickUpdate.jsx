// ── QuickUpdate — مع تسجيل تلقائي لتاريخ الورشة (متطلب #2) ──────────
import { useState } from 'react'
import { supabase, STATUS_COLORS, ALL_STATUSES, DELIVERY_RESULTS, REFUSAL_REASONS } from '../lib/supabase'
import { X, Zap, Save } from 'lucide-react'

export default function QuickUpdate({ order, onClose, onSave }) {
  const [status, setStatus]                   = useState(order.status)
  const [trackingNumber, setTrackingNumber]   = useState(order.tracking_number || '')
  const [shippingDate, setShippingDate]       = useState(order.shipping_date || '')
  const [expectedDelivery, setExpectedDelivery] = useState(order.expected_delivery || '')
  const [actualDelivery, setActualDelivery]   = useState(order.actual_delivery || '')
  const [deliveryResult, setDeliveryResult]   = useState(order.delivery_result || '')
  const [refusalReason, setRefusalReason]     = useState(order.refusal_reason || '')
  const [workshopSent, setWorkshopSent]       = useState(order.workshop_sent_date || '')
  const [workshopReturn, setWorkshopReturn]   = useState(order.workshop_return_date || '')
  const [saving, setSaving]                   = useState(false)

  // عند تغيير الحالة: تسجيل تلقائي لتواريخ الورشة (متطلب #2)
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    if (newStatus === 'Sent to Workshop' && !workshopSent) {
      setWorkshopSent(dateStr)
    }
    if (newStatus === 'Returned from Workshop' && !workshopReturn) {
      setWorkshopReturn(dateStr)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const now = new Date()

    const payload = {
      status,
      tracking_number:  trackingNumber || null,
      shipping_date:    shippingDate || null,
      expected_delivery: expectedDelivery || null,
      actual_delivery:  actualDelivery || null,
      delivery_result:  deliveryResult || null,
      refusal_reason:   refusalReason || null,
      workshop_sent_date:   workshopSent || null,
      workshop_return_date: workshopReturn || null,
    }

    // تسجيل الوقت الدقيق للورشة عند التغيير
    if (status === 'Sent to Workshop' && order.status !== 'Sent to Workshop') {
      payload.workshop_sent_at = now.toISOString()
      if (!workshopSent) payload.workshop_sent_date = now.toISOString().split('T')[0]
    }
    if (status === 'Returned from Workshop' && order.status !== 'Returned from Workshop') {
      payload.workshop_return_at = now.toISOString()
      if (!workshopReturn) payload.workshop_return_date = now.toISOString().split('T')[0]
    }

    const { error } = await supabase.from('orders').update(payload).eq('id', order.id)
    setSaving(false)
    if (!error) onSave()
  }

  const sc = STATUS_COLORS[status] || STATUS_COLORS['Pending Confirmation']

  const isطبية = order.product_type === 'نظارات طبية' || order.glasses_type?.startsWith('طبية')
  const FLOW = isطبية
    ? ['Confirmed', 'Sent to Workshop', 'Returned from Workshop', 'Ready to Ship', 'Shipped', 'Delivered']
    : ['Confirmed', 'In Preparation', 'Ready to Ship', 'Shipped', 'Delivered']
  const currentIdx = FLOW.indexOf(status)

  const needsShipping = ['Shipped', 'Delivered'].includes(status)
  const needsWorkshop = ['Sent to Workshop', 'Returned from Workshop'].includes(status)
  const needsResult   = ['Refused on Delivery', 'Returned'].includes(status)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-500"/>
              <h2 className="text-base font-bold text-gray-900">تحديث سريع</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono font-bold text-blue-600">{order.order_number}</span>
              {' — '}{order.customer_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* مسار الطلب */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">المسار المتوقع</p>
            <div className="flex items-center gap-1 flex-wrap">
              {FLOW.map((s, i) => {
                const isCurrent = s === status
                const isPast    = currentIdx > i
                return (
                  <div key={s} className="flex items-center gap-1">
                    <button onClick={() => handleStatusChange(s)}
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${
                        isCurrent ? `${STATUS_COLORS[s]?.badge} ring-2 ring-offset-1 ring-blue-400`
                        : isPast ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                      {STATUS_COLORS[s]?.label}
                    </button>
                    {i < FLOW.length - 1 && <span className="text-gray-300 text-xs">←</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* اختيار الحالة الكاملة */}
          <div>
            <label className="label">الحالة</label>
            <select className="select" value={status} onChange={e => handleStatusChange(e.target.value)}>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_COLORS[s]?.label} ({s})</option>
              ))}
            </select>
          </div>

          {/* الحالة الحالية */}
          <div className={`rounded-xl p-3 ${sc.bg} flex items-center gap-2`}>
            <span className={`status-dot ${sc.dot}`}/>
            <span className={`text-sm font-bold ${sc.text}`}>{sc.label}</span>
            {(status === 'Sent to Workshop' && workshopSent) && (
              <span className="text-xs text-teal-600 ms-auto">✅ تاريخ الإرسال: {workshopSent}</span>
            )}
            {(status === 'Returned from Workshop' && workshopReturn) && (
              <span className="text-xs text-teal-600 ms-auto">✅ تاريخ العودة: {workshopReturn}</span>
            )}
          </div>

          {/* حقول الورشة */}
          {needsWorkshop && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">تاريخ الإرسال للورشة</label>
                <input type="date" className="input" value={workshopSent} onChange={e => setWorkshopSent(e.target.value)}/>
                {status === 'Sent to Workshop' && workshopSent === new Date().toISOString().split('T')[0] && (
                  <p className="text-xs text-teal-600 mt-1">✅ مسجل تلقائياً</p>
                )}
              </div>
              <div>
                <label className="label">تاريخ العودة من الورشة</label>
                <input type="date" className="input" value={workshopReturn} onChange={e => setWorkshopReturn(e.target.value)}/>
                {status === 'Returned from Workshop' && workshopReturn === new Date().toISOString().split('T')[0] && (
                  <p className="text-xs text-teal-600 mt-1">✅ مسجل تلقائياً</p>
                )}
              </div>
            </div>
          )}

          {/* حقول الشحن */}
          {needsShipping && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">تاريخ الشحن</label>
                <input type="date" className="input" value={shippingDate} onChange={e => setShippingDate(e.target.value)}/>
              </div>
              <div>
                <label className="label">رقم التتبع</label>
                <input className="input" dir="ltr" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="TRK-..."/>
              </div>
            </div>
          )}
          {needsShipping && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">التسليم المتوقع</label>
                <input type="date" className="input" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)}/>
              </div>
              <div>
                <label className="label">التسليم الفعلي</label>
                <input type="date" className="input" value={actualDelivery} onChange={e => setActualDelivery(e.target.value)}/>
              </div>
            </div>
          )}

          {/* نتيجة التسليم */}
          {(needsShipping || needsResult) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">نتيجة التسليم</label>
                <select className="select" value={deliveryResult} onChange={e => setDeliveryResult(e.target.value)}>
                  <option value="">اختر...</option>
                  {DELIVERY_RESULTS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              {(deliveryResult === 'رفض الاستلام' || deliveryResult === 'مرتجع') && (
                <div>
                  <label className="label">سبب الرفض</label>
                  <select className="select" value={refusalReason} onChange={e => setRefusalReason(e.target.value)}>
                    <option value="">اختر...</option>
                    {REFUSAL_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}
