import { useState, useEffect, useCallback } from 'react'
import { supabase, SOURCES, GLASSES_TYPES, LENS_TYPES, FRAME_TYPES, DELIVERY_RESULTS, REFUSAL_REASONS, PAYMENT_STATUSES, ALL_STATUSES, STATUS_COLORS, PRODUCT_TYPES, SHIPPING_TYPES, DISCOUNT_TYPES, CONTACT_LENS_TYPES, GOVERNORATES } from '../lib/supabase'
import PrescriptionForm from './PrescriptionForm'
import { X, Save, Eye } from 'lucide-react'

const isMedical    = t => t === 'نظارات طبية'
const isContact    = t => t === 'عدسات لاصقة'
const isSunglasses = t => t === 'نظارات شمسية'

// ─── Field + Inp + Sel خارج الـ component تماماً لمنع إعادة الإنشاء ───
const Field = ({ label, children }) => (
  <div><label className="label">{label}</label>{children}</div>
)

// Inp and Sel are pure presentational — we pass value and onChange explicitly
const Inp = ({ value, onChange, type = 'text', placeholder = '', dir, step }) => (
  <input
    type={type} step={step} className="input" placeholder={placeholder}
    value={value ?? ''} onChange={onChange} dir={dir}
  />
)

const Sel = ({ value, onChange, opts, placeholder = 'اختر...' }) => (
  <select className="select" value={value ?? ''} onChange={onChange}>
    <option value="">{placeholder}</option>
    {opts.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
)

export default function OrderForm({ order, onClose, onSave }) {
  const isEdit = !!order?.id
  const [frames, setFrames]                    = useState([])
  const [pricing, setPricing]                  = useState({})
  const [shippingCos, setShippingCos]          = useState([])
  const [customerPrescriptions, setCustPrescs] = useState([])
  const [selectedPresc, setSelectedPresc]      = useState(null)
  const [prescMode, setPrescMode]              = useState('new')
  const [saving, setSaving]                    = useState(false)
  const [activeTab, setActiveTab]              = useState('basic')

  const [f, setF] = useState({
    product_type: order?.product_type || 'نظارات طبية',
    order_date: order?.order_date || new Date().toISOString().split('T')[0],
    customer_name: order?.customer_name || '',
    customer_phone: order?.customer_phone || '',
    source: order?.source || '',
    glasses_type: order?.glasses_type || '',
    frame_name: order?.frame_name || '',
    frame_type: order?.frame_type || '',
    lens_type: order?.lens_type || '',
    order_value: order?.order_value || '',
    shipping_company_id: order?.shipping_company_id || '',
    governorate: order?.governorate || '',
    shipping_type: order?.shipping_type || 'عادي',
    customer_shipping_price: order?.customer_shipping_price || 0,
    store_shipping_cost: order?.store_shipping_cost || 0,
    discount_type: order?.discount_type || 'نقدي',
    discount: order?.discount || '',
    discount_percent: order?.discount_percent || '',
    payment_status: order?.payment_status || 'عند الاستلام',
    confirmed: order?.confirmed || false,
    status: order?.status || 'Pending Confirmation',
    needs_workshop: order?.needs_workshop ?? null,
    workshop_sent_date: order?.workshop_sent_date || '',
    workshop_return_date: order?.workshop_return_date || '',
    shipping_date: order?.shipping_date || '',
    tracking_number: order?.tracking_number || '',
    expected_delivery: order?.expected_delivery || '',
    actual_delivery: order?.actual_delivery || '',
    delivery_result: order?.delivery_result || '',
    refusal_reason: order?.refusal_reason || '',
    lead_source_detail: order?.lead_source_detail || '',
    assigned_to: order?.assigned_to || '',
    notes: order?.notes || '',
    actual_shipping_cost: order?.actual_shipping_cost || '',
    frame_cost: order?.frame_cost || 0,
    lens_cost: order?.lens_cost || '',
    contact_lens_brand: order?.contact_lens_brand || '',
    contact_lens_type: order?.contact_lens_type || '',
    contact_lens_power_od: order?.contact_lens_power_od || '',
    contact_lens_power_os: order?.contact_lens_power_os || '',
    contact_lens_bc: order?.contact_lens_bc || '',
    contact_lens_diameter: order?.contact_lens_diameter || '',
    contact_lens_quantity: order?.contact_lens_quantity || '',
    contact_lens_cost: order?.contact_lens_cost || '',
  })

  const [prescription, setPrescription] = useState({
    sph_od:'', cyl_od:'', axis_od:'',
    sph_os:'', cyl_os:'', axis_os:'',
    pd:'', pd_right:'', pd_left:'', add_power:'', notes:''
  })

  useEffect(() => {
    supabase.from('inventory').select('id,name,cost_price,sell_price,frame_type').gt('qty_available', 0)
      .then(({ data }) => setFrames(data || []))
    supabase.from('pricing_settings').select('*').then(({ data }) => {
      const map = {}; data?.forEach(p => { map[p.frame_type] = p.manuf_cost }); setPricing(map)
    })
    supabase.from('shipping_companies').select('*').eq('is_active', true)
      .then(({ data }) => setShippingCos(data || []))
  }, [])

  // Auto workshop based on product type
  useEffect(() => {
    setF(p => ({ ...p, needs_workshop: isMedical(p.product_type) }))
  }, [f.product_type])

  // Auto-fill frame_type from selected frame in inventory
  useEffect(() => {
    if (f.frame_name) {
      const frameObj = frames.find(fr => fr.name === f.frame_name)
      if (frameObj?.frame_type) {
        setF(p => ({ ...p, frame_type: frameObj.frame_type }))
      }
    }
  }, [f.frame_name, frames])

  // Load shipping rates when company + governorate change
  useEffect(() => {
    if (f.shipping_company_id && f.governorate && f.shipping_type === 'عادي') {
      supabase.from('shipping_rates')
        .select('customer_price,store_cost')
        .eq('company_id', f.shipping_company_id)
        .eq('governorate', f.governorate)
        .single()
        .then(({ data }) => {
          if (data) setF(p => ({ ...p,
            customer_shipping_price: data.customer_price,
            store_shipping_cost: data.store_cost
          }))
        })
    } else if (f.shipping_type === 'استلام من الفرع') {
      setF(p => ({ ...p, customer_shipping_price: 0, store_shipping_cost: 0 }))
    } else if (f.shipping_type === 'مجاني') {
      setF(p => ({ ...p, customer_shipping_price: 0 }))
    }
  }, [f.shipping_company_id, f.governorate, f.shipping_type])

  // Auto-detect repeat customer by phone
  useEffect(() => {
    if (f.customer_phone?.length >= 10 && !isEdit) {
      supabase.from('customers').select('id,name').eq('phone', f.customer_phone).single()
        .then(({ data: cust }) => {
          if (cust) {
            // Existing customer → set source to Repeat Customer if not already set
            setF(p => ({
              ...p,
              customer_name: p.customer_name || cust.name,
              source: p.source || 'Repeat Customer'
            }))
            // Load prescriptions
            supabase.from('prescriptions').select('*').eq('customer_id', cust.id)
              .order('created_at', { ascending: false }).then(({ data }) => setCustPrescs(data || []))
          }
        })
    }
  }, [f.customer_phone])

  // Auto-set workshop timestamps when status changes
  useEffect(() => {
    const prev = f._prevStatus
    if (!prev || prev === f.status) return

    if (f.status === 'Sent to Workshop') {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      setF(p => ({ ...p, workshop_sent_date: dateStr, _workshopSentAt: now.toISOString() }))
    }
    if (f.status === 'Returned from Workshop') {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      setF(p => ({ ...p, workshop_return_date: dateStr, _workshopReturnAt: now.toISOString() }))
    }
  }, [f.status])

  // Track previous status for auto-timestamp logic
  const up = useCallback((k, v) => {
    setF(p => {
      const next = { ...p, [k]: v }
      if (k === 'status') next._prevStatus = p.status
      return next
    })
  }, [])

  // Computed values
  const frameObj     = frames.find(fr => fr.name === f.frame_name)
  const frameCostAuto = frameObj?.cost_price || 0
  const manufCost    = pricing[f.frame_type] || 0

  const discountAmt = f.discount_type === 'نقدي'
    ? (Number(f.discount) || 0)
    : (Number(f.order_value) || 0) * (Number(f.discount_percent) || 0) / 100

  const shippingForClient = f.shipping_type === 'استلام من الفرع' ? 0
    : f.shipping_type === 'مجاني' ? 0
    : Number(f.customer_shipping_price) || 0

  const totalFinal = (Number(f.order_value) || 0) + shippingForClient - discountAmt

  const storeShipCost   = f.shipping_type === 'استلام من الفرع' ? 0 : Number(f.store_shipping_cost) || 0
  const shippingSupport = Math.max(storeShipCost - shippingForClient, 0)

  const lensC        = Number(f.lens_cost) || 0
  const contactLensC = Number(f.contact_lens_cost) || 0
  const totalCost    = frameCostAuto + manufCost + lensC + contactLensC + storeShipCost
  const profit       = totalFinal - totalCost
  const margin       = totalFinal > 0 ? profit / totalFinal : 0

  const handleSave = async () => {
    if (!f.customer_name || !f.order_date) return
    setSaving(true)

    const { data: custId } = await supabase.rpc('get_or_create_customer', {
      p_phone: f.customer_phone || 'unknown', p_name: f.customer_name
    })

    let prescriptionId = order?.prescription_id || null
    const needsPresc = isMedical(f.product_type) || isContact(f.product_type)
    if (needsPresc && prescMode === 'new' && prescription.sph_od) {
      const { data: pd } = await supabase.from('prescriptions').insert({ ...prescription, customer_id: custId }).select().single()
      prescriptionId = pd?.id
    } else if (prescMode === 'saved' && selectedPresc) {
      prescriptionId = selectedPresc.id
    }

    // Remove internal tracking keys before save
    const { _prevStatus, _workshopSentAt, _workshopReturnAt, ...fClean } = f

    const payload = {
      ...fClean,
      customer_id: custId,
      prescription_id: prescriptionId,
      order_value: Number(f.order_value) || 0,
      shipping_value: shippingForClient,
      discount: discountAmt,
      actual_shipping_cost: storeShipCost,
      customer_shipping_price: shippingForClient,
      store_shipping_cost: storeShipCost,
      frame_cost: frameCostAuto,
      manuf_cost: manufCost,
      lens_cost: lensC,
      contact_lens_cost: contactLensC,
      total_cost: totalCost,
      actual_profit: profit,
      profit_margin: margin,
      contact_lens_quantity: Number(f.contact_lens_quantity) || null,
      shipping_company_id: f.shipping_company_id || null,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    let error
    if (isEdit) ({ error } = await supabase.from('orders').update(payload).eq('id', order.id))
    else ({ error } = await supabase.from('orders').insert(payload))
    setSaving(false)
    if (!error) onSave()
    else console.error(error)
  }

  const tabs = [
    { id: 'basic', label: 'الطلب' },
    { id: 'prescription', label: isMedical(f.product_type) ? 'الوصفة 👁️' : isContact(f.product_type) ? 'العدسات 👁️' : null },
    { id: 'shipping', label: 'الشحن' },
    { id: 'cost', label: 'التكاليف' },
    { id: 'notes', label: 'ملاحظات' },
  ].filter(t => t.label)

  const sc = STATUS_COLORS[f.status] || STATUS_COLORS['Pending Confirmation']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل الطلب' : 'طلب جديد'}</h2>
            {isEdit && <p className="text-xs text-gray-400 font-mono">{order.order_number}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${sc.badge}`}><span className={`status-dot ${sc.dot}`}/>{sc.label}</span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
          </div>
        </div>

        {/* Product type */}
        <div className="px-6 pt-4 flex gap-2">
          {PRODUCT_TYPES.map(pt => (
            <button key={pt} onClick={() => up('product_type', pt)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                f.product_type === pt ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'
              }`}>
              {pt === 'نظارات طبية' ? '👓' : pt === 'نظارات شمسية' ? '🕶️' : '👁️'} {pt}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 mt-3 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>{t.label}</button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* BASIC TAB */}
          {activeTab === 'basic' && <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم العميل *">
                <Inp value={f.customer_name} onChange={e => up('customer_name', e.target.value)} placeholder="الاسم الكامل"/>
              </Field>
              <Field label="رقم الهاتف">
                <div className="relative">
                  <Inp value={f.customer_phone} onChange={e => up('customer_phone', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr"/>
                  {customerPrescriptions.length > 0 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      {customerPrescriptions.length} وصفة
                    </span>
                  )}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الطلب *">
                <Inp value={f.order_date} onChange={e => up('order_date', e.target.value)} type="date"/>
              </Field>
              <Field label="مصدر الطلب">
                <Sel value={f.source} onChange={e => up('source', e.target.value)} opts={SOURCES}/>
              </Field>
            </div>

            {!isContact(f.product_type) && <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="نوع النظارة">
                  <select className="select" value={f.glasses_type} onChange={e => up('glasses_type', e.target.value)}>
                    <option value="">اختر...</option>
                    {GLASSES_TYPES.filter(t => isSunglasses(f.product_type) ? t.includes('شمس') : t.includes('طبية')).map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="الفريم (من المخزون)">
                  <select className="select" value={f.frame_name} onChange={e => up('frame_name', e.target.value)}>
                    <option value="">اختر فريم...</option>
                    {frames.map(fr => <option key={fr.id} value={fr.name}>{fr.name}</option>)}
                  </select>
                </Field>
              </div>
              {/* frame_type auto-filled, shown read-only */}
              {f.frame_type && (
                <div className="bg-gray-50 rounded-xl px-4 py-2 text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-bold">نوع الإطار:</span>
                  <span className="font-semibold text-gray-700">{f.frame_type}</span>
                  <span className="text-gray-400">(محدد تلقائياً من المنتج)</span>
                </div>
              )}
              {isMedical(f.product_type) && (
                <Field label="نوع العدسة">
                  <Sel value={f.lens_type} onChange={e => up('lens_type', e.target.value)} opts={LENS_TYPES}/>
                </Field>
              )}
            </>}

            <Field label="قيمة الطلب (ج)">
              <Inp value={f.order_value} onChange={e => up('order_value', e.target.value)} type="number" placeholder="0"/>
            </Field>

            {/* Discount */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-gray-500">الخصم</p>
              <div className="flex gap-2">
                {DISCOUNT_TYPES.map(dt => (
                  <button key={dt} onClick={() => up('discount_type', dt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      f.discount_type === dt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                    }`}>{dt}</button>
                ))}
              </div>
              {f.discount_type === 'نقدي'
                ? <Field label="قيمة الخصم (ج)"><Inp value={f.discount} onChange={e => up('discount', e.target.value)} type="number" placeholder="0"/></Field>
                : <Field label="نسبة الخصم %"><Inp value={f.discount_percent} onChange={e => up('discount_percent', e.target.value)} type="number" placeholder="0"/></Field>
              }
              {discountAmt > 0 && <div className="text-xs text-green-600 font-semibold">الخصم: {discountAmt.toLocaleString()} ج</div>}
            </div>

            {/* Total preview */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-700">الإجمالي النهائي للعميل</span>
              <span className="text-2xl font-extrabold text-blue-700">{totalFinal.toLocaleString()} ج</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="الحالة">
                <select className="select" value={f.status} onChange={e => up('status', e.target.value)}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label} ({s})</option>)}
                </select>
              </Field>
              <Field label="حالة الدفع">
                <Sel value={f.payment_status} onChange={e => up('payment_status', e.target.value)} opts={PAYMENT_STATUSES}/>
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={f.confirmed} onChange={e => up('confirmed', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
              <span className="text-sm font-semibold text-gray-700">تم التأكيد مع العميل؟</span>
            </label>
          </>}

          {/* PRESCRIPTION TAB */}
          {activeTab === 'prescription' && isMedical(f.product_type) && <>
            {customerPrescriptions.length > 0 && (
              <div className="flex gap-2 mb-2">
                {[{ id: 'new', label: '➕ وصفة جديدة' }, { id: 'saved', label: `📋 محفوظة (${customerPrescriptions.length})` }].map(m => (
                  <button key={m.id} onClick={() => setPrescMode(m.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      prescMode === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>{m.label}</button>
                ))}
              </div>
            )}
            {prescMode === 'new' && <PrescriptionForm value={prescription} onChange={setPrescription}/>}
            {prescMode === 'saved' && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customerPrescriptions.map((p, i) => (
                  <div key={p.id} onClick={() => setSelectedPresc(p)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${selectedPresc?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-bold text-gray-500">وصفة {i + 1} — {new Date(p.created_at).toLocaleDateString('ar-EG')}</span>
                      {selectedPresc?.id === p.id && <span className="text-blue-600 font-bold">✓ محددة</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs font-mono text-center text-gray-600">
                      <span/>
                      {['SPH', 'CYL', 'AXIS'].map(h => <span key={h} className="text-gray-400">{h}</span>)}
                      <span className="font-bold">OD</span><span>{p.sph_od ?? '—'}</span><span>{p.cyl_od ?? '—'}</span><span>{p.axis_od ?? '—'}</span>
                      <span className="font-bold">OS</span><span>{p.sph_os ?? '—'}</span><span>{p.cyl_os ?? '—'}</span><span>{p.axis_os ?? '—'}</span>
                    </div>
                    {p.pd && <div className="text-xs text-gray-400 mt-1">PD: {p.pd}</div>}
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* CONTACT LENS TAB */}
          {activeTab === 'prescription' && isContact(f.product_type) && <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ماركة العدسة">
                <Inp value={f.contact_lens_brand} onChange={e => up('contact_lens_brand', e.target.value)} placeholder="مثال: Acuvue"/>
              </Field>
              <Field label="نوع العدسة">
                <Sel value={f.contact_lens_type} onChange={e => up('contact_lens_type', e.target.value)} opts={CONTACT_LENS_TYPES}/>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="قوة OD (يمين)">
                <Inp value={f.contact_lens_power_od} onChange={e => up('contact_lens_power_od', e.target.value)} type="number" step="0.25" placeholder="-2.00"/>
              </Field>
              <Field label="قوة OS (يسار)">
                <Inp value={f.contact_lens_power_os} onChange={e => up('contact_lens_power_os', e.target.value)} type="number" step="0.25" placeholder="-2.00"/>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="BC"><Inp value={f.contact_lens_bc} onChange={e => up('contact_lens_bc', e.target.value)} type="number" step="0.1" placeholder="8.6"/></Field>
              <Field label="Diameter"><Inp value={f.contact_lens_diameter} onChange={e => up('contact_lens_diameter', e.target.value)} type="number" step="0.1" placeholder="14.2"/></Field>
              <Field label="الكمية"><Inp value={f.contact_lens_quantity} onChange={e => up('contact_lens_quantity', e.target.value)} type="number" placeholder="1"/></Field>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1"><Eye size={12}/> وصفة طبية (اختياري)</p>
              <PrescriptionForm value={prescription} onChange={setPrescription}/>
            </div>
          </>}

          {/* SHIPPING TAB */}
          {activeTab === 'shipping' && <>
            <div>
              <label className="label">نوع الشحن</label>
              <div className="flex gap-2">
                {SHIPPING_TYPES.map(st => (
                  <button key={st} onClick={() => up('shipping_type', st)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      f.shipping_type === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>{st}</button>
                ))}
              </div>
            </div>

            {f.shipping_type !== 'استلام من الفرع' && <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="شركة الشحن">
                  <select className="select" value={f.shipping_company_id} onChange={e => up('shipping_company_id', e.target.value)}>
                    <option value="">اختر شركة...</option>
                    {shippingCos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="المحافظة">
                  <Sel value={f.governorate} onChange={e => up('governorate', e.target.value)} opts={GOVERNORATES}/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-xs text-blue-600 mb-1">الشحن على العميل</div>
                  <div className="text-xl font-extrabold text-blue-700">{shippingForClient} ج</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-xs text-red-600 mb-1">تكلفة الشحن الفعلية</div>
                  <div className="text-xl font-extrabold text-red-700">{storeShipCost} ج</div>
                </div>
              </div>
              {f.shipping_type === 'مجاني' && (
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 font-semibold">
                  ⚠️ الشحن مجاني للعميل — تكلفة الشحن تُحتسب ضمن مصروفات المتجر
                </div>
              )}
            </>}

            {f.shipping_type === 'استلام من الفرع' && (
              <div className="bg-teal-50 rounded-xl p-3 text-sm text-teal-700 font-semibold">
                ✅ استلام من الفرع — لا يوجد رسوم شحن
              </div>
            )}

            {/* Workshop dates — auto-filled but editable */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ إرسال الورشة">
                <Inp value={f.workshop_sent_date} onChange={e => up('workshop_sent_date', e.target.value)} type="date"/>
                {f.workshop_sent_date && <p className="text-xs text-teal-600 mt-1">✅ مسجل تلقائياً</p>}
              </Field>
              <Field label="تاريخ رجوع الورشة">
                <Inp value={f.workshop_return_date} onChange={e => up('workshop_return_date', e.target.value)} type="date"/>
                {f.workshop_return_date && <p className="text-xs text-teal-600 mt-1">✅ مسجل تلقائياً</p>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الشحن">
                <Inp value={f.shipping_date} onChange={e => up('shipping_date', e.target.value)} type="date"/>
              </Field>
              <Field label="رقم التتبع">
                <Inp value={f.tracking_number} onChange={e => up('tracking_number', e.target.value)} dir="ltr" placeholder="TRK-..."/>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ التسليم المتوقع">
                <Inp value={f.expected_delivery} onChange={e => up('expected_delivery', e.target.value)} type="date"/>
              </Field>
              <Field label="تاريخ التسليم الفعلي">
                <Inp value={f.actual_delivery} onChange={e => up('actual_delivery', e.target.value)} type="date"/>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نتيجة التسليم">
                <Sel value={f.delivery_result} onChange={e => up('delivery_result', e.target.value)} opts={DELIVERY_RESULTS}/>
              </Field>
              {(f.delivery_result === 'رفض الاستلام' || f.delivery_result === 'مرتجع') &&
                <Field label="سبب الرفض">
                  <Sel value={f.refusal_reason} onChange={e => up('refusal_reason', e.target.value)} opts={REFUSAL_REASONS}/>
                </Field>}
            </div>
          </>}

          {/* COST TAB */}
          {activeTab === 'cost' && <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              ⚠️ هذه التكاليف للحساب الداخلي فقط
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">تكلفة الفريم</div>
                <div className="text-lg font-bold text-gray-700">{frameCostAuto} ج</div>
                <div className="text-xs text-gray-400">{f.frame_name || '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400">تكلفة المصنعية</div>
                <div className="text-lg font-bold text-gray-700">{manufCost} ج</div>
                <div className="text-xs text-gray-400">{f.frame_type || '—'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تكلفة العدسة (ج)">
                <Inp value={f.lens_cost} onChange={e => up('lens_cost', e.target.value)} type="number" placeholder="0"/>
              </Field>
              {isContact(f.product_type) && (
                <Field label="تكلفة العدسات اللاصقة (ج)">
                  <Inp value={f.contact_lens_cost} onChange={e => up('contact_lens_cost', e.target.value)} type="number" placeholder="0"/>
                </Field>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              <div className="bg-orange-50 rounded-xl p-3"><div className="text-xs text-orange-600">دعم الشحن</div><div className="text-lg font-bold text-orange-700">{shippingSupport.toFixed(0)} ج</div></div>
              <div className="bg-red-50 rounded-xl p-3"><div className="text-xs text-red-600">إجمالي التكلفة</div><div className="text-lg font-bold text-red-700">{totalCost.toFixed(0)} ج</div></div>
              <div className={`rounded-xl p-3 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-xs ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>الربح الفعلي</div>
                <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{profit.toFixed(0)} ج</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3"><div className="text-xs text-indigo-600">هامش الربح</div><div className="text-lg font-bold text-indigo-700">{(margin * 100).toFixed(1)}%</div></div>
            </div>
          </>}

          {/* NOTES TAB */}
          {activeTab === 'notes' && <>
            <Field label="منسوب للموظف">
              <Inp value={f.assigned_to} onChange={e => up('assigned_to', e.target.value)} placeholder="اسم الموظف"/>
            </Field>
            <Field label="تفاصيل المصدر">
              <Inp value={f.lead_source_detail} onChange={e => up('lead_source_detail', e.target.value)}/>
            </Field>
            <Field label="ملاحظات">
              <textarea className="input h-28 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
            </Field>
          </>}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
          </button>
        </div>
      </div>
    </div>
  )
}
