// ── محرر عناصر الطلب — نظام متعدد المنتجات (v4.2 fixed) ─────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PrescriptionForm from './PrescriptionForm'
import { Plus, Trash2, ChevronDown, ChevronUp, Eye, Layers, Copy, AlertCircle } from 'lucide-react'

const PRODUCT_TYPES = ['نظارات طبية', 'نظارات شمسية', 'عدسات لاصقة']
const CONTACT_TYPES = ['يومية', 'شهرية', 'سنوية', 'ملونة يومية', 'ملونة شهرية', 'طبية']

const isMedical    = t => t === 'نظارات طبية'
const isContact    = t => t === 'عدسات لاصقة'
const isSunglasses = t => t === 'نظارات شمسية'

// نوع النظارة حسب نوع المنتج
const glassesTypesFor = (productType) => {
  if (isMedical(productType))    return ['طبية رجالي', 'طبية نسائي', 'طبية أطفال']
  if (isSunglasses(productType)) return ['شمس رجالي',  'شمس نسائي',  'شمس أطفال']
  return []
}

// تصفية الفريمات حسب نوع المنتج (طبية → type='طبية'، شمس → type='شمس')
const framesFor = (frames, productType) => {
  if (isContact(productType)) return []
  if (isMedical(productType))    return frames.filter(f => !f.type || f.type === 'طبية')
  if (isSunglasses(productType)) return frames.filter(f => !f.type || f.type === 'شمس')
  return frames
}

export const emptyItem = () => ({
  _id:              Math.random().toString(36).slice(2),
  product_type:     'نظارات طبية',
  glasses_type:     '',
  frame_id:         '',
  frame_name:       '',
  frame_type:       '',
  frame_variant_id: '',
  frame_color:      '',
  frame_size:       '',
  qty:              1,
  lens_brand_id:    '',
  lens_brand_name:  '',
  lens_variant_id:  '',
  lens_variant_name:'',
  contact_lens_brand:    '',
  contact_lens_type:     '',
  contact_lens_power_od: '',
  contact_lens_power_os: '',
  contact_lens_bc:       '',
  contact_lens_diameter: '',
  contact_lens_quantity: 1,
  prescription: { sph_od:'',cyl_od:'',axis_od:'',sph_os:'',cyl_os:'',axis_os:'',pd:'',add_power:'' },
  // BUG FIX: unit_price يبدأ بـ 0 مش '' حتى لا يُفعّل الـ validation block
  unit_price:    0,
  item_discount: 0,
  frame_cost:    0,
  lens_cost:     0,
  contact_lens_cost: 0,
  manuf_cost:    0,
  notes:         '',
  _expanded:     true,
  _frameVariants:[],
})

function ItemRow({ item, idx, frames, lensBrands, allLensVariants, pricingMap,
                   onChange, onRemove, onDuplicate, isOnly }) {

  const up = (k, v) => onChange({ ...item, [k]: v })

  // ── تحميل الـ variants عند تغيير الفريم ──────────────────────────
  useEffect(() => {
    if (!item.frame_id) {
      onChange({
        ...item,
        _frameVariants:  [],
        frame_variant_id:'',
        frame_color:     '',
        frame_size:      '',
        frame_type:      '',
        frame_name:      '',
        frame_cost:      0,
        manuf_cost:      0,
      })
      return
    }
    const frame = frames.find(f => f.id === item.frame_id)
    // جلب الـ variants بدون فلتر qty_available لأنه generated column
    supabase.from('inventory_variants')
      .select('id,color,size,cost_price,sell_price,qty_total,qty_reserved,qty_available,sku')
      .eq('frame_id', item.frame_id)
      .then(({ data }) => {
        // فلترة المتاح يدوياً (qty_total - qty_reserved > 0)
        const available = (data || []).filter(v => (v.qty_total - v.qty_reserved) > 0)
        onChange({
          ...item,
          _frameVariants: available,
          frame_name:     frame?.name       || '',
          frame_type:     frame?.frame_type || '',
        })
      })
  }, [item.frame_id]) // eslint-disable-line

  // ── عند تغيير نوع المنتج: مسح الفريم لو مش مناسب ────────────────
  const handleProductTypeChange = (newType) => {
    onChange({
      ...item,
      product_type:     newType,
      glasses_type:     '',
      frame_id:         '',
      frame_name:       '',
      frame_type:       '',
      frame_variant_id: '',
      frame_color:      '',
      frame_size:       '',
      frame_cost:       0,
      manuf_cost:       0,
      _frameVariants:   [],
    })
  }

  // ── اختيار variant → يملأ التكلفة + يضيف سعر الفريم للـ unit_price ─
  const handleVariantChange = (variantId) => {
    const v = item._frameVariants.find(fv => fv.id === variantId)
    if (!v) return
    const frameCost  = v.cost_price || 0
    const manufCost  = pricingMap[item.frame_type] || 0
    // BUG FIX: إضافة سعر بيع الفريم تلقائياً كقيمة مقترحة لـ unit_price
    const suggested  = v.sell_price || 0
    onChange({
      ...item,
      frame_variant_id: variantId,
      frame_color:      v.color || '',
      frame_size:       v.size  || '',
      frame_cost:       frameCost,
      manuf_cost:       manufCost,
      // إضافة سعر الفريم كقيمة مقترحة إذا لم يُدخَل سعر بعد
      unit_price: item.unit_price > 0 ? item.unit_price : suggested,
    })
  }

  const handleLensBrandChange = (brandId) => {
    const brand = lensBrands.find(b => b.id === brandId)
    onChange({
      ...item,
      lens_brand_id:    brandId,
      lens_brand_name:  brand?.name || '',
      lens_variant_id:  '',
      lens_variant_name:'',
      lens_cost:        0,
    })
  }

  const handleLensVariantChange = (variantId) => {
    const v = allLensVariants.find(lv => lv.id === variantId)
    if (!v) return
    onChange({
      ...item,
      lens_variant_id:   variantId,
      lens_variant_name: v.name || '',
      lens_cost:         v.cost_price || 0,
      // BUG FIX: سعر العدسة يُضاف فوق سعر الفريم الموجود
      unit_price: (Number(item.unit_price) || 0) > 0
        ? Number(item.unit_price) + (v.sell_price || 0)
        : v.sell_price || 0,
    })
  }

  const filteredLensVariants = item.lens_brand_id
    ? allLensVariants.filter(v => v.brand_id === item.lens_brand_id && v.is_active !== false)
    : []

  // BUG FIX: الأصناف المعروضة تتفلتر حسب نوع المنتج
  const filteredFrames = framesFor(frames, item.product_type)

  const lineTotal  = (Number(item.unit_price) || 0) * (Number(item.qty) || 1) - (Number(item.item_discount) || 0)
  const itemCost   = (Number(item.frame_cost)||0) + (Number(item.lens_cost)||0) +
                     (Number(item.contact_lens_cost)||0) + (Number(item.manuf_cost)||0)
  const itemProfit = lineTotal - itemCost
  const typeIcon   = isMedical(item.product_type) ? '👓' : isSunglasses(item.product_type) ? '🕶️' : '👁️'

  const selectedVariant = item._frameVariants.find(v => v.id === item.frame_variant_id)
  const availableQty    = selectedVariant ? (selectedVariant.qty_total - selectedVariant.qty_reserved) : null

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
          ${item._expanded ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-gray-50'}`}
        onClick={() => up('_expanded', !item._expanded)}
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </div>
        <span className="text-base">{typeIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm truncate">
            {item.frame_name || item.product_type}
            {item.frame_color && <span className="text-gray-400 ms-1">· {item.frame_color}</span>}
            {item.lens_variant_name && <span className="text-blue-500 ms-1">· {item.lens_variant_name}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
            <span>الكمية: <strong className="text-gray-600">{item.qty}</strong></span>
            {Number(item.unit_price) > 0 && (
              <span>السعر: <strong className="text-gray-700">{Number(item.unit_price).toLocaleString()} ج</strong></span>
            )}
            {lineTotal > 0 && (
              <span className="text-blue-600 font-bold">الإجمالي: {lineTotal.toLocaleString()} ج</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isOnly && (
            <button onMouseDown={e => { e.stopPropagation(); onDuplicate() }}
              className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400" title="نسخ">
              <Copy size={13}/>
            </button>
          )}
          {!isOnly && (
            <button onMouseDown={e => { e.stopPropagation(); onRemove() }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="حذف">
              <Trash2 size={13}/>
            </button>
          )}
          {item._expanded
            ? <ChevronUp size={15} className="text-gray-400"/>
            : <ChevronDown size={15} className="text-gray-400"/>}
        </div>
      </div>

      {/* Body */}
      {item._expanded && (
        <div className="p-4 space-y-4">

          {/* نوع المنتج */}
          <div className="flex gap-2">
            {PRODUCT_TYPES.map(pt => (
              <button key={pt}
                onClick={() => handleProductTypeChange(pt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  item.product_type === pt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'
                }`}>
                {pt === 'نظارات طبية' ? '👓' : pt === 'نظارات شمسية' ? '🕶️' : '👁️'} {pt}
              </button>
            ))}
          </div>

          {/* الكمية + السعر + الخصم */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">الكمية</label>
              <input type="number" min="1" className="input text-center"
                value={item.qty}
                onChange={e => up('qty', Math.max(1, parseInt(e.target.value) || 1))}/>
            </div>
            <div>
              <label className="label">سعر البيع للعميل (ج)</label>
              <input type="number" min="0" className="input font-bold text-blue-700"
                value={item.unit_price}
                onChange={e => up('unit_price', parseFloat(e.target.value) || 0)}
                placeholder="0"/>
            </div>
            <div>
              <label className="label">خصم العنصر (ج)</label>
              <input type="number" min="0" className="input"
                value={item.item_discount}
                onChange={e => up('item_discount', parseFloat(e.target.value) || 0)}
                placeholder="0"/>
            </div>
          </div>

          {/* نوع النظارة (للطبية والشمس فقط) */}
          {!isContact(item.product_type) && glassesTypesFor(item.product_type).length > 0 && (
            <div>
              <label className="label">نوع النظارة</label>
              <select className="select" value={item.glasses_type}
                onChange={e => up('glasses_type', e.target.value)}>
                <option value="">اختر...</option>
                {glassesTypesFor(item.product_type).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* الفريم من المخزون (مُصفَّى حسب النوع) */}
          {!isContact(item.product_type) && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
                الفريم من المخزون
                <span className="text-gray-300 font-normal">
                  ({filteredFrames.length} صنف {isMedical(item.product_type) ? 'طبي' : 'شمسي'})
                </span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">الفريم</label>
                  <select className="select" value={item.frame_id}
                    onChange={e => up('frame_id', e.target.value)}>
                    <option value="">اختر فريم...</option>
                    {filteredFrames.map(fr => (
                      <option key={fr.id} value={fr.id}>{fr.name}</option>
                    ))}
                  </select>
                  {filteredFrames.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      لا توجد فريمات مُضافة بنوع "{isMedical(item.product_type) ? 'طبية' : 'شمس'}" في المخزون
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">اللون / المقاس</label>
                  {item._frameVariants.length > 0 ? (
                    <select className="select" value={item.frame_variant_id}
                      onChange={e => handleVariantChange(e.target.value)}>
                      <option value="">اختر...</option>
                      {item._frameVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {[v.color, v.size].filter(Boolean).join(' — ')}
                          {' '}(متاح: {v.qty_total - v.qty_reserved})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select className="select" disabled>
                      <option>{item.frame_id ? 'لا يوجد مخزون متاح' : 'اختر الفريم أولاً'}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* تفاصيل الـ variant المختار */}
              {item.frame_variant_id && selectedVariant && (
                <div className="flex items-center gap-4 bg-white rounded-lg px-3 py-2 text-xs">
                  {item.frame_type && (
                    <span className="text-indigo-600 font-semibold">{item.frame_type}</span>
                  )}
                  <span className="text-gray-400">
                    تكلفة الفريم: <strong className="text-red-600">{item.frame_cost} ج</strong>
                  </span>
                  {item.manuf_cost > 0 && (
                    <span className="text-gray-400">
                      مصنعية: <strong className="text-red-600">{item.manuf_cost} ج</strong>
                    </span>
                  )}
                  <span className={`ms-auto font-bold ${availableQty > 3 ? 'text-green-600' : availableQty > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    متاح: {availableQty}
                  </span>
                </div>
              )}

              {/* تنبيه سعر الفريم مُضاف في السعر */}
              {item.frame_variant_id && Number(item.unit_price) > 0 && (
                <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
                  💡 السعر المقترح يشمل سعر الفريم. عدّله حسب الحاجة.
                </div>
              )}
            </div>
          )}

          {/* العدسات (للنظارات الطبية) */}
          {isMedical(item.product_type) && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                <Layers size={12}/> العدسات الطبية
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">شركة العدسة</label>
                  <select className="select" value={item.lens_brand_id}
                    onChange={e => handleLensBrandChange(e.target.value)}>
                    <option value="">اختر الشركة...</option>
                    {lensBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">نوع العدسة</label>
                  {item.lens_brand_id ? (
                    <select className="select" value={item.lens_variant_id}
                      onChange={e => handleLensVariantChange(e.target.value)}>
                      <option value="">اختر النوع...</option>
                      {filteredLensVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} — بيع: {v.sell_price} ج
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select className="select" disabled>
                      <option>اختر الشركة أولاً</option>
                    </select>
                  )}
                </div>
              </div>
              {item.lens_variant_id && (
                <div className="flex gap-4 text-xs bg-white rounded-lg px-3 py-2">
                  <span className="text-gray-400">
                    تكلفة العدسة: <strong className="text-red-600">{item.lens_cost} ج</strong>
                  </span>
                  <span className="text-gray-400 ms-auto">
                    السعر المقترح مُضاف تلقائياً للـ unit_price
                  </span>
                </div>
              )}
            </div>
          )}

          {/* العدسات اللاصقة */}
          {isContact(item.product_type) && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-blue-600">بيانات العدسات اللاصقة</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">الماركة</label>
                  <input className="input" value={item.contact_lens_brand}
                    onChange={e => up('contact_lens_brand', e.target.value)} placeholder="Acuvue"/>
                </div>
                <div>
                  <label className="label">النوع</label>
                  <select className="select" value={item.contact_lens_type}
                    onChange={e => up('contact_lens_type', e.target.value)}>
                    <option value="">اختر...</option>
                    {CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ['OD', 'contact_lens_power_od', '-2.00'],
                  ['OS', 'contact_lens_power_os', '-2.00'],
                  ['BC', 'contact_lens_bc', '8.6'],
                  ['DIA', 'contact_lens_diameter', '14.2'],
                ].map(([lbl, key, ph]) => (
                  <div key={key}>
                    <label className="label">{lbl}</label>
                    <input type="number" step="0.1" className="input text-center"
                      value={item[key]} onChange={e => up(key, e.target.value)} placeholder={ph}/>
                  </div>
                ))}
              </div>
              <div>
                <label className="label">الكمية (علب)</label>
                <input type="number" min="1" className="input w-28"
                  value={item.contact_lens_quantity}
                  onChange={e => up('contact_lens_quantity', parseInt(e.target.value) || 1)}/>
              </div>
            </div>
          )}

          {/* الوصفة الطبية */}
          {(isMedical(item.product_type) || isContact(item.product_type)) && (
            <div className="border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                <Eye size={12}/> الوصفة الطبية
              </p>
              <PrescriptionForm
                value={item.prescription}
                onChange={presc => up('prescription', presc)}
              />
            </div>
          )}

          {/* ملاحظات هذا العنصر */}
          <div>
            <label className="label">ملاحظات هذا المنتج</label>
            <input className="input text-sm" value={item.notes}
              onChange={e => up('notes', e.target.value)}
              placeholder="أي ملاحظات خاصة بهذا المنتج..."/>
          </div>

          {/* إجمالي العنصر */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            lineTotal > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className="text-xs space-y-0.5 opacity-80">
              {itemCost > 0 && (
                <div>التكلفة: <strong>{itemCost.toLocaleString()} ج</strong></div>
              )}
              {itemCost > 0 && lineTotal > 0 && (
                <div>الربح: <strong className={itemProfit >= 0 ? '' : 'text-red-300'}>
                  {itemProfit.toLocaleString()} ج
                </strong></div>
              )}
            </div>
            <div className="text-left">
              {item.qty > 1 && (
                <div className="text-xs opacity-75">{item.qty} × {Number(item.unit_price).toLocaleString()}</div>
              )}
              <div className="text-2xl font-extrabold">{lineTotal.toLocaleString()} ج</div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── المكوِّن الرئيسي ─────────────────────────────────────────────────
export default function OrderItemsEditor({ items, onChange, frames, lensBrands, allLensVariants, pricingMap }) {

  const addItem = () => onChange([...items, emptyItem()])

  const updateItem = (idx, newItem) => {
    const next = [...items]
    next[idx] = newItem
    onChange(next)
  }

  const removeItem = (idx) => {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== idx))
  }

  const duplicateItem = (idx) => {
    const copy = { ...items[idx], _id: Math.random().toString(36).slice(2), _expanded: true }
    const next = [...items]
    next.splice(idx + 1, 0, copy)
    onChange(next)
  }

  const subtotal  = items.reduce((s, it) =>
    s + (Number(it.unit_price)||0) * (Number(it.qty)||1) - (Number(it.item_discount)||0), 0)
  const totalCost = items.reduce((s, it) =>
    s + (Number(it.frame_cost)||0) + (Number(it.lens_cost)||0) +
        (Number(it.contact_lens_cost)||0) + (Number(it.manuf_cost)||0), 0)

  const warnings = items.filter(it => {
    if (!it.frame_variant_id || !it._frameVariants?.length) return false
    const v = it._frameVariants.find(fv => fv.id === it.frame_variant_id)
    return v && (v.qty_total - v.qty_reserved) < (Number(it.qty) || 1)
  })

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <ItemRow
          key={item._id}
          idx={idx}
          item={item}
          frames={frames}
          lensBrands={lensBrands}
          allLensVariants={allLensVariants}
          pricingMap={pricingMap}
          onChange={newItem => updateItem(idx, newItem)}
          onRemove={() => removeItem(idx)}
          onDuplicate={() => duplicateItem(idx)}
          isOnly={items.length === 1}
        />
      ))}

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-amber-700 font-semibold">
            تحذير: بعض المنتجات لا تتوفر كميتها الكافية في المخزون
          </p>
        </div>
      )}

      <button onClick={addItem}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-2xl
          text-blue-600 font-semibold text-sm hover:border-blue-500 hover:bg-blue-50 transition-all
          flex items-center justify-center gap-2">
        <Plus size={16}/> إضافة منتج آخر
      </button>

      {/* شريط الإجمالي */}
      <div className="bg-gradient-to-l from-blue-700 to-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs opacity-75">
              {items.length} منتج
              {items.length > 1 && ` — إجمالي الكميات: ${items.reduce((s, i) => s + (Number(i.qty)||1), 0)}`}
            </div>
            {totalCost > 0 && (
              <div className="text-xs opacity-75">
                التكلفة: {totalCost.toLocaleString()} ج
                {subtotal > 0 && (
                  <> — هامش: {((subtotal-totalCost)/subtotal*100).toFixed(0)}%</>
                )}
              </div>
            )}
          </div>
          <div className="text-left">
            <div className="text-xs opacity-75">إجمالي المنتجات</div>
            <div className="text-3xl font-extrabold">{subtotal.toLocaleString()} ج</div>
          </div>
        </div>
      </div>
    </div>
  )
}
