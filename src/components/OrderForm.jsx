// ── نموذج الطلب الاحترافي — يدعم منتجات متعددة (Order Items) ────────
import { useState, useEffect, useCallback } from 'react'
import { supabase, SOURCES, PAYMENT_STATUSES, ALL_STATUSES, STATUS_COLORS,
         PRODUCT_TYPES, SHIPPING_TYPES, DISCOUNT_TYPES, GOVERNORATES, fmt } from '../lib/supabase'
import OrderItemsEditor, { emptyItem } from './OrderItemsEditor'
import { X, Save, DollarSign, Truck, FileText, Settings2, StickyNote } from 'lucide-react'

const Field = ({ label, children }) => (
  <div><label className="label">{label}</label>{children}</div>
)

// ── تحويل بيانات order_items من DB إلى صيغة الـ Editor ──────────────
function dbItemsToEditorItems(dbItems) {
  return dbItems.map(item => ({
    _id:               item.id || Math.random().toString(36).slice(2),
    _dbId:             item.id,
    product_type:      item.product_type || 'نظارات طبية',
    glasses_type:      item.glasses_type || '',
    frame_id:          item.frame_id || '',
    frame_name:        item.frame_name || '',
    frame_type:        item.frame_type || '',
    frame_variant_id:  item.frame_variant_id || '',
    frame_color:       item.frame_color || '',
    frame_size:        item.frame_size || '',
    qty:               item.qty || 1,
    lens_brand_id:     item.lens_brand_id || '',
    lens_brand_name:   item.lens_brand_name || '',
    lens_variant_id:   item.lens_variant_id || '',
    lens_variant_name: item.lens_variant_name || '',
    contact_lens_brand:    item.contact_lens_brand || '',
    contact_lens_type:     item.contact_lens_type || '',
    contact_lens_power_od: item.contact_lens_power_od || '',
    contact_lens_power_os: item.contact_lens_power_os || '',
    contact_lens_bc:       item.contact_lens_bc || '',
    contact_lens_diameter: item.contact_lens_diameter || '',
    contact_lens_quantity: item.contact_lens_quantity || 1,
    prescription: {
      sph_od: item.presc_sph_od || '', cyl_od: item.presc_cyl_od || '', axis_od: item.presc_axis_od || '',
      sph_os: item.presc_sph_os || '', cyl_os: item.presc_cyl_os || '', axis_os: item.presc_axis_os || '',
      pd: item.presc_pd || '', add_power: item.presc_add || '',
    },
    unit_price:    Number(item.unit_price) || 0,
    item_discount: item.item_discount || 0,
    frame_cost:    item.frame_cost || 0,
    lens_cost:     item.lens_cost || 0,
    contact_lens_cost: item.contact_lens_cost || 0,
    manuf_cost:    item.manuf_cost || 0,
    notes:         item.notes || '',
    _expanded:     false,
    _frameVariants:[],
    _lensVariants: [],
  }))
}

export default function OrderForm({ order, onClose, onSave }) {
  const isEdit = !!order?.id

  // ── Reference data ──────────────────────────────────────────────
  const [frames, setFrames]             = useState([])
  const [lensBrands, setLensBrands]     = useState([])
  const [allLensVariants, setAllLensVariants] = useState([])
  const [pricingMap, setPricingMap]     = useState({})
  const [shippingCos, setShippingCos]   = useState([])
  const [customers, setCustomers]       = useState([])
  const [custSugg, setCustSugg]         = useState([])
  const [saving, setSaving]             = useState(false)
  const [activeTab, setActiveTab]       = useState('items')

  // ── Order header fields ──────────────────────────────────────────
  const [h, setH] = useState({
    order_date:              order?.order_date || new Date().toISOString().split('T')[0],
    customer_name:           order?.customer_name || '',
    customer_phone:          order?.customer_phone || '',
    customer_phone2:         order?.customer_phone2 || '',
    source:                  order?.source || '',
    shipping_type:           order?.shipping_type || 'عادي',
    shipping_company_id:     order?.shipping_company_id || '',
    governorate:             order?.governorate || '',
    customer_shipping_price: order?.customer_shipping_price || 0,
    store_shipping_cost:     order?.store_shipping_cost || 0,
    discount_type:           order?.discount_type || 'نقدي',
    discount:                order?.discount || '',
    discount_percent:        order?.discount_percent || '',
    payment_status:          order?.payment_status || 'عند الاستلام',
    amount_paid:             order?.amount_paid || '',
    confirmed:               order?.confirmed || false,
    status:                  order?.status || 'Pending Confirmation',
    assigned_to:             order?.assigned_to || '',
    notes:                   order?.notes || '',
    needs_workshop:          order?.needs_workshop ?? null,
    workshop_sent_date:      order?.workshop_sent_date || '',
    workshop_return_date:    order?.workshop_return_date || '',
    shipping_date:           order?.shipping_date || '',
    tracking_number:         order?.tracking_number || '',
    expected_delivery:       order?.expected_delivery || '',
    actual_delivery:         order?.actual_delivery || '',
  })

  // ── Order items ─────────────────────────────────────────────────
  const [items, setItems] = useState([emptyItem()])

  // ── Load reference data ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [
        { data: invData },
        { data: pricingData },
        { data: shippingData },
        { data: brandsData },
        { data: variantsData },
        { data: custData },
      ] = await Promise.all([
        supabase.from('inventory').select('id,name,frame_type').order('name'),
        supabase.from('pricing_settings').select('*'),
        supabase.from('shipping_companies').select('*').eq('is_active', true),
        supabase.from('lens_brands').select('*').order('name'),
        supabase.from('lens_variants').select('*').eq('is_active', true).order('name'),
        supabase.from('customers').select('id,name,phone,phone2').order('name'),
      ])
      setFrames(invData || [])
      const pm = {}
      pricingData?.forEach(p => { pm[p.frame_type] = p.manuf_cost })
      setPricingMap(pm)
      setShippingCos(shippingData || [])
      setLensBrands(brandsData || [])
      setAllLensVariants(variantsData || [])
      setCustomers(custData || [])
    }
    load()
  }, [])

  // ── Load existing items when editing ────────────────────────────
  useEffect(() => {
    if (isEdit && order?.id) {
      supabase.from('order_items').select('*')
        .eq('order_id', order.id).order('sort_order')
        .then(({ data }) => {
          if (data && data.length > 0) setItems(dbItemsToEditorItems(data))
          else setItems([emptyItem()])
        })
    }
  }, [isEdit, order?.id])

  // ── Customer autocomplete ────────────────────────────────────────
  useEffect(() => {
    const q = h.customer_phone
    if (q?.length >= 3) {
      setCustSugg(customers.filter(c =>
        c.phone?.includes(q) || c.phone2?.includes(q) ||
        c.name?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5))
    } else {
      setCustSugg([])
    }
  }, [h.customer_phone, customers])

  const selectCustomer = (cust) => {
    setH(p => ({ ...p, customer_name: cust.name, customer_phone: cust.phone, customer_phone2: cust.phone2 || '' }))
    setCustSugg([])
  }

  const upH = useCallback((k, v) => setH(p => ({ ...p, [k]: v })), [])

  // ── Auto-fill shipping price from company+governorate ────────────
  useEffect(() => {
    if (h.shipping_company_id && h.governorate && h.shipping_type === 'عادي') {
      supabase.from('shipping_rates')
        .select('customer_price,store_cost').eq('company_id', h.shipping_company_id).eq('governorate', h.governorate).single()
        .then(({ data }) => {
          if (data) setH(p => ({ ...p, customer_shipping_price: data.customer_price, store_shipping_cost: data.store_cost }))
        })
    }
    if (h.shipping_type === 'استلام من الفرع') setH(p => ({ ...p, customer_shipping_price: 0, store_shipping_cost: 0 }))
    if (h.shipping_type === 'مجاني') setH(p => ({ ...p, customer_shipping_price: 0 }))
  }, [h.shipping_company_id, h.governorate, h.shipping_type])

  // ── Calculations ─────────────────────────────────────────────────
  const itemsSubtotal = items.reduce((s, item) => {
    return s + (Number(item.unit_price)||0) * (Number(item.qty)||1) - (Number(item.item_discount)||0)
  }, 0)

  const shippingForClient = h.shipping_type === 'استلام من الفرع' || h.shipping_type === 'مجاني'
    ? 0 : Number(h.customer_shipping_price) || 0

  const orderLevelDiscount = h.discount_type === 'نقدي'
    ? (Number(h.discount) || 0)
    : itemsSubtotal * (Number(h.discount_percent) || 0) / 100

  const totalFinal   = itemsSubtotal + shippingForClient - orderLevelDiscount

  const totalItemsCost = items.reduce((s, item) =>
    s + (Number(item.frame_cost)||0) + (Number(item.lens_cost)||0) +
        (Number(item.contact_lens_cost)||0) + (Number(item.manuf_cost)||0), 0)
  const storeShip    = h.shipping_type === 'استلام من الفرع' ? 0 : Number(h.store_shipping_cost) || 0
  const totalCost    = totalItemsCost + storeShip
  const totalProfit  = totalFinal - totalCost

  const amountPaid   = h.payment_status === 'مدفوع' ? totalFinal
    : h.payment_status === 'جزئي' ? (Number(h.amount_paid) || 0) : 0
  const amountRem    = totalFinal - amountPaid

  // ── Save ────────────────────────────────────────────────────────
  const handleSave = async () => {
    // BUG FIX: validation أبسط — اسم العميل والتاريخ فقط مطلوبان
    if (!h.customer_name?.trim()) {
      alert('يرجى إدخال اسم العميل')
      return
    }
    if (!h.order_date) {
      alert('يرجى إدخال تاريخ الطلب')
      return
    }
    setSaving(true)

    // Get or create customer — fallback if RPC not yet deployed
    let custId = null
    const rpcRes = await supabase.rpc('get_or_create_customer_v2', {
      p_phone:  h.customer_phone || 'unknown',
      p_name:   h.customer_name,
      p_phone2: h.customer_phone2 || null,
    })
    if (rpcRes.error) {
      // Fallback: upsert manually
      const existing = await supabase.from('customers')
        .select('id').eq('phone', h.customer_phone || 'unknown').maybeSingle()
      if (existing.data?.id) {
        custId = existing.data.id
      } else {
        const inserted = await supabase.from('customers')
          .insert({ name: h.customer_name, phone: h.customer_phone || 'unknown', phone2: h.customer_phone2 || null })
          .select('id').single()
        custId = inserted.data?.id
      }
    } else {
      custId = rpcRes.data
    }

    // Save prescriptions for medical items
    const itemsWithPrescIds = await Promise.all(items.map(async item => {
      const needsPresc = item.product_type === 'نظارات طبية' || item.product_type === 'عدسات لاصقة'
      if (!needsPresc) return item
      const p = item.prescription
      const hasPrescData = p?.sph_od || p?.sph_os
      if (!hasPrescData) return item
      const { data: pd } = await supabase.from('prescriptions').insert({
        customer_id: custId,
        sph_od: p.sph_od || null, cyl_od: p.cyl_od || null, axis_od: p.axis_od || null,
        sph_os: p.sph_os || null, cyl_os: p.cyl_os || null, axis_os: p.axis_os || null,
        pd: p.pd || null, add_power: p.add_power || null,
      }).select().single()
      return { ...item, prescription_id: pd?.id }
    }))

    // Build order header payload
    const orderPayload = {
      customer_id:             custId,
      customer_name:           h.customer_name,
      customer_phone:          h.customer_phone,
      customer_phone2:         h.customer_phone2 || null,
      order_date:              h.order_date,
      source:                  h.source || null,
      shipping_type:           h.shipping_type,
      shipping_company_id:     h.shipping_company_id || null,
      governorate:             h.governorate || null,
      customer_shipping_price: shippingForClient,
      store_shipping_cost:     storeShip,
      shipping_value:          shippingForClient,
      discount:                orderLevelDiscount,
      discount_type:           h.discount_type,
      discount_percent:        Number(h.discount_percent) || 0,
      payment_status:          h.payment_status,
      amount_paid:             amountPaid,
      confirmed:               h.confirmed,
      status:                  h.status,
      assigned_to:             h.assigned_to || null,
      notes:                   h.notes || null,
      needs_workshop:          h.needs_workshop,
      workshop_sent_date:      h.workshop_sent_date || null,
      workshop_return_date:    h.workshop_return_date || null,
      shipping_date:           h.shipping_date || null,
      tracking_number:         h.tracking_number || null,
      expected_delivery:       h.expected_delivery || null,
      actual_delivery:         h.actual_delivery || null,
      // Aggregated from items
      order_value:    itemsSubtotal,
      total_cost:     totalCost,
      actual_profit:  totalProfit,
      profit_margin:  totalFinal > 0 ? totalProfit / totalFinal : 0,
      has_items:      true,
      items_count:    items.length,
      // Legacy single-item fields (first item for backward compat)
      product_type:   items[0]?.product_type || 'نظارات طبية',
      glasses_type:   items[0]?.glasses_type || null,
      frame_id:       items[0]?.frame_id || null,
      frame_name:     items[0]?.frame_name || null,
      frame_type:     items[0]?.frame_type || null,
      frame_variant_id: items[0]?.frame_variant_id || null,
      lens_brand_id:  items[0]?.lens_brand_id || null,
      lens_variant_id: items[0]?.lens_variant_id || null,
    }

    let orderId = order?.id
    if (isEdit) {
      const { error: updateErr } = await supabase.from('orders').update(orderPayload).eq('id', orderId)
      if (updateErr) {
        console.error('Order update error:', updateErr)
        alert('خطأ في تعديل الطلب: ' + updateErr.message)
        setSaving(false)
        return
      }
    } else {
      const { data: newOrder, error: insertErr } = await supabase.from('orders').insert(orderPayload).select().single()
      if (insertErr) {
        console.error('Order insert error:', insertErr)
        alert('خطأ في حفظ الطلب: ' + insertErr.message)
        setSaving(false)
        return
      }
      orderId = newOrder?.id
    }

    if (!orderId) { setSaving(false); return }

    // Delete old items if editing
    if (isEdit) {
      await supabase.from('order_items').delete().eq('order_id', orderId)
      // Restore old inventory
      await supabase.rpc('restore_items_inventory', { p_order_id: orderId }).catch(() => {})
    }

    // Insert new items
    const itemsPayload = itemsWithPrescIds.map((item, idx) => ({
      order_id:            orderId,
      product_type:        item.product_type,
      glasses_type:        item.glasses_type || null,
      frame_id:            item.frame_id || null,
      frame_name:          item.frame_name || null,
      frame_type:          item.frame_type || null,
      frame_variant_id:    item.frame_variant_id || null,
      frame_color:         item.frame_color || null,
      frame_size:          item.frame_size || null,
      qty:                 Number(item.qty) || 1,
      lens_brand_id:       item.lens_brand_id || null,
      lens_brand_name:     item.lens_brand_name || null,
      lens_variant_id:     item.lens_variant_id || null,
      lens_variant_name:   item.lens_variant_name || null,
      contact_lens_brand:  item.contact_lens_brand || null,
      contact_lens_type:   item.contact_lens_type || null,
      contact_lens_power_od: Number(item.contact_lens_power_od) || null,
      contact_lens_power_os: Number(item.contact_lens_power_os) || null,
      contact_lens_bc:     Number(item.contact_lens_bc) || null,
      contact_lens_diameter: Number(item.contact_lens_diameter) || null,
      contact_lens_quantity: Number(item.contact_lens_quantity) || null,
      prescription_id:     item.prescription_id || null,
      presc_sph_od: item.prescription?.sph_od ? Number(item.prescription.sph_od) : null,
      presc_cyl_od: item.prescription?.cyl_od ? Number(item.prescription.cyl_od) : null,
      presc_axis_od: item.prescription?.axis_od ? Number(item.prescription.axis_od) : null,
      presc_sph_os: item.prescription?.sph_os ? Number(item.prescription.sph_os) : null,
      presc_cyl_os: item.prescription?.cyl_os ? Number(item.prescription.cyl_os) : null,
      presc_axis_os: item.prescription?.axis_os ? Number(item.prescription.axis_os) : null,
      presc_pd:    item.prescription?.pd ? Number(item.prescription.pd) : null,
      presc_add:   item.prescription?.add_power ? Number(item.prescription.add_power) : null,
      unit_price:       Number(item.unit_price) || 0,
      item_discount:    Number(item.item_discount) || 0,
      frame_cost:       Number(item.frame_cost) || 0,
      lens_cost:        Number(item.lens_cost) || 0,
      contact_lens_cost: Number(item.contact_lens_cost) || 0,
      manuf_cost:       Number(item.manuf_cost) || 0,
      notes:            item.notes || null,
      sort_order:       idx + 1,
    }))

    // Insert new items (order_items table - requires supabase_patch_v4_2 to be run)
    const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload)
    if (itemsErr) {
      console.warn('order_items insert failed (patch v4.2 may not be applied yet):', itemsErr.message)
      // Still continue — the order header was saved successfully
    }

    // Deduct inventory
    await supabase.rpc('deduct_items_inventory', { p_order_id: orderId }).catch(() => {})

    setSaving(false)
    onSave()
  }

  const sc = STATUS_COLORS[h.status] || STATUS_COLORS['Pending Confirmation']
  const tabs = [
    { id: 'items',    label: `المنتجات (${items.length})`, icon: '🛍️' },
    { id: 'customer', label: 'العميل',                     icon: '👤' },
    { id: 'shipping', label: 'الشحن',                      icon: '🚚' },
    { id: 'payment',  label: 'الدفع',                      icon: '💰' },
    { id: 'notes',    label: 'ملاحظات',                    icon: '📝' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              {isEdit ? `تعديل طلب` : 'طلب جديد'}
            </h2>
            {isEdit && <p className="text-xs font-mono text-gray-400">{order.order_number}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${sc.badge}`}>
              <span className={`status-dot ${sc.dot}`}/>{sc.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 bg-white overflow-x-auto flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── ITEMS TAB ── */}
          {activeTab === 'items' && (
            <OrderItemsEditor
              items={items}
              onChange={setItems}
              frames={frames}
              lensBrands={lensBrands}
              allLensVariants={allLensVariants}
              pricingMap={pricingMap}
            />
          )}

          {/* ── CUSTOMER TAB ── */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="تاريخ الطلب *">
                  <input type="date" className="input" value={h.order_date} onChange={e => upH('order_date', e.target.value)}/>
                </Field>
                <Field label="مصدر الطلب">
                  <select className="select" value={h.source} onChange={e => upH('source', e.target.value)}>
                    <option value="">اختر...</option>
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="اسم العميل *">
                <input className="input" value={h.customer_name}
                  onChange={e => upH('customer_name', e.target.value)} placeholder="الاسم الكامل"/>
              </Field>

              <Field label="الهاتف الأساسي">
                <div className="relative">
                  <input className="input" dir="ltr" value={h.customer_phone}
                    onChange={e => upH('customer_phone', e.target.value)} placeholder="01xxxxxxxxx"/>
                  {custSugg.length > 0 && (
                    <div className="absolute z-50 top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {custSugg.map(c => (
                        <button key={c.id} onMouseDown={() => selectCustomer(c)}
                          className="w-full text-right px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between">
                          <span className="font-semibold text-gray-700">{c.name}</span>
                          <span className="text-gray-400 font-mono text-xs">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="الهاتف الاحتياطي">
                <input className="input" dir="ltr" value={h.customer_phone2}
                  onChange={e => upH('customer_phone2', e.target.value)} placeholder="رقم بديل (اختياري)"/>
              </Field>

              <Field label="الحالة">
                <select className="select" value={h.status} onChange={e => upH('status', e.target.value)}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_COLORS[s]?.label} ({s})</option>)}
                </select>
              </Field>

              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3">
                <input type="checkbox" checked={h.confirmed} onChange={e => upH('confirmed', e.target.checked)}
                  className="w-4 h-4 accent-blue-600"/>
                <span className="text-sm font-semibold text-gray-700">تم التأكيد مع العميل؟</span>
              </label>
            </div>
          )}

          {/* ── SHIPPING TAB ── */}
          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <div>
                <label className="label">نوع الشحن</label>
                <div className="flex gap-2">
                  {SHIPPING_TYPES.map(st => (
                    <button key={st} onClick={() => upH('shipping_type', st)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        h.shipping_type === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>{st}</button>
                  ))}
                </div>
              </div>

              {h.shipping_type !== 'استلام من الفرع' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="شركة الشحن">
                      <select className="select" value={h.shipping_company_id} onChange={e => upH('shipping_company_id', e.target.value)}>
                        <option value="">اختر...</option>
                        {shippingCos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="المحافظة">
                      <select className="select" value={h.governorate} onChange={e => upH('governorate', e.target.value)}>
                        <option value="">اختر...</option>
                        {GOVERNORATES.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="text-xs text-blue-600 mb-1">الشحن على العميل</div>
                      <div className="text-2xl font-extrabold text-blue-700">{shippingForClient} ج</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <div className="text-xs text-red-600 mb-1">تكلفة الشحن الفعلية</div>
                      <div className="text-2xl font-extrabold text-red-700">{storeShip} ج</div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="تاريخ الشحن">
                  <input type="date" className="input" value={h.shipping_date} onChange={e => upH('shipping_date', e.target.value)}/>
                </Field>
                <Field label="رقم التتبع">
                  <input className="input" dir="ltr" value={h.tracking_number}
                    onChange={e => upH('tracking_number', e.target.value)} placeholder="TRK-..."/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="التسليم المتوقع">
                  <input type="date" className="input" value={h.expected_delivery} onChange={e => upH('expected_delivery', e.target.value)}/>
                </Field>
                <Field label="التسليم الفعلي">
                  <input type="date" className="input" value={h.actual_delivery} onChange={e => upH('actual_delivery', e.target.value)}/>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="تاريخ الورشة">
                  <input type="date" className="input" value={h.workshop_sent_date} onChange={e => upH('workshop_sent_date', e.target.value)}/>
                </Field>
                <Field label="تاريخ العودة من الورشة">
                  <input type="date" className="input" value={h.workshop_return_date} onChange={e => upH('workshop_return_date', e.target.value)}/>
                </Field>
              </div>
            </div>
          )}

          {/* ── PAYMENT TAB ── */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              {/* Order-level discount */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase">خصم على مستوى الطلب</p>
                <div className="flex gap-2">
                  {DISCOUNT_TYPES.map(dt => (
                    <button key={dt} onClick={() => upH('discount_type', dt)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        h.discount_type === dt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'
                      }`}>{dt}</button>
                  ))}
                </div>
                {h.discount_type === 'نقدي'
                  ? <Field label="قيمة الخصم (ج)">
                      <input type="number" className="input" value={h.discount}
                        onChange={e => upH('discount', e.target.value)} placeholder="0"/>
                    </Field>
                  : <Field label="نسبة الخصم %">
                      <input type="number" className="input" value={h.discount_percent}
                        onChange={e => upH('discount_percent', e.target.value)} placeholder="0"/>
                    </Field>
                }
              </div>

              {/* Price breakdown */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase mb-3">تفاصيل الفاتورة</p>
                {[
                  ['إجمالي المنتجات', fmt(itemsSubtotal), 'text-gray-700'],
                  shippingForClient > 0 && ['الشحن', fmt(shippingForClient), 'text-gray-700'],
                  orderLevelDiscount > 0 && ['الخصم', '− ' + fmt(orderLevelDiscount), 'text-green-600'],
                ].filter(Boolean).map(([label, val, cls]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-semibold ${cls}`}>{val}</span>
                  </div>
                ))}
                <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-blue-700">الإجمالي النهائي</span>
                  <span className="text-2xl font-extrabold text-blue-700">{fmt(totalFinal)}</span>
                </div>
              </div>

              <Field label="حالة الدفع">
                <select className="select" value={h.payment_status} onChange={e => upH('payment_status', e.target.value)}>
                  {PAYMENT_STATUSES.map(p => <option key={p}>{p}</option>)}
                </select>
              </Field>

              {h.payment_status === 'جزئي' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-700">💰 الدفع الجزئي</p>
                  <Field label="المبلغ المدفوع (ج)">
                    <input type="number" className="input" value={h.amount_paid}
                      onChange={e => upH('amount_paid', e.target.value)} placeholder="0"/>
                  </Field>
                  {h.amount_paid > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-green-600">المدفوع: {fmt(Number(h.amount_paid))}</span>
                      <span className="text-red-600">المتبقي: {fmt(amountRem)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cost summary (internal) */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase">التكاليف الداخلية</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xs text-gray-400">التكلفة</div><div className="font-bold text-red-600">{fmt(totalCost)}</div></div>
                  <div><div className="text-xs text-gray-400">الربح</div><div className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalProfit)}</div></div>
                  <div><div className="text-xs text-gray-400">الهامش</div><div className="font-bold text-indigo-600">{totalFinal > 0 ? (totalProfit/totalFinal*100).toFixed(1) : 0}%</div></div>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <Field label="منسوب للموظف">
                <input className="input" value={h.assigned_to} onChange={e => upH('assigned_to', e.target.value)}/>
              </Field>
              <Field label="ملاحظات الطلب">
                <textarea className="input h-32 resize-none" value={h.notes} onChange={e => upH('notes', e.target.value)}/>
              </Field>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="text-sm">
            <span className="text-gray-400">{items.length} منتج — الإجمالي:</span>
            <span className="font-extrabold text-blue-700 text-lg ms-2">{fmt(totalFinal)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : <Save size={15}/>}
              {saving ? 'جارٍ الحفظ...' : 'حفظ الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
