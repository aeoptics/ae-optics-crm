// ── محرر عناصر الطلب (Order Items) — نظام متعدد المنتجات ────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import PrescriptionForm from './PrescriptionForm'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Eye,
  Package, Layers, Copy, AlertCircle
} from 'lucide-react'

const PRODUCT_TYPES  = ['نظارات طبية', 'نظارات شمسية', 'عدسات لاصقة']
const GLASSES_TYPES  = ['طبية رجالي','طبية نسائي','طبية أطفال','شمس رجالي','شمس نسائي','شمس أطفال']
const CONTACT_TYPES  = ['يومية','شهرية','سنوية','ملونة يومية','ملونة شهرية','طبية']
const isMedical   = t => t === 'نظارات طبية'
const isContact   = t => t === 'عدسات لاصقة'
const isSunglasses= t => t === 'نظارات شمسية'

const emptyItem = () => ({
  _id:             Math.random().toString(36).slice(2),
  product_type:    'نظارات طبية',
  glasses_type:    '',
  frame_id:        '',
  frame_name:      '',
  frame_type:      '',
  frame_variant_id:'',
  frame_color:     '',
  frame_size:      '',
  qty:             1,
  lens_brand_id:   '',
  lens_brand_name: '',
  lens_variant_id: '',
  lens_variant_name:'',
  contact_lens_brand:'',
  contact_lens_type: '',
  contact_lens_power_od:'',
  contact_lens_power_os:'',
  contact_lens_bc: '',
  contact_lens_diameter:'',
  contact_lens_quantity: 1,
  prescription: { sph_od:'',cyl_od:'',axis_od:'',sph_os:'',cyl_os:'',axis_os:'',pd:'',add_power:'' },
  unit_price:    '',
  item_discount: 0,
  frame_cost:    0,
  lens_cost:     0,
  contact_lens_cost: 0,
  manuf_cost:    0,
  notes:         '',
  _expanded:     true,
  _frameVariants:[],
  _lensVariants: [],
})

function ItemRow({ item, idx, frames, lensBrands, allLensVariants, pricingMap,
                   onChange, onRemove, onDuplicate, isOnly }) {

  const up = (k, v) => onChange({ ...item, [k]: v })

  // Auto-load frame variants when frame changes
  useEffect(() => {
    if (!item.frame_id) { onChange({ ...item, _frameVariants: [], frame_variant_id:'', frame_color:'', frame_size:'', frame_type:'', frame_name:'' }); return }
    const frame = frames.find(f => f.id === item.frame_id)
    supabase.from('inventory_variants').select('*').eq('frame_id', item.frame_id).gt('qty_available', 0)
      .then(({ data }) => onChange({
        ...item,
        _frameVariants: data || [],
        frame_name: frame?.name || '',
        frame_type: frame?.frame_type || '',
      }))
  }, [item.frame_id]) // eslint-disable-line

  // Filter lens variants by brand
  const filteredLensVariants = item.lens_brand_id
    ? allLensVariants.filter(v => v.brand_id === item.lens_brand_id && v.is_active)
    : []

  // Auto-fill from frame variant
  const handleVariantChange = (variantId) => {
    const v = item._frameVariants.find(fv => fv.id === variantId)
    onChange({ ...item,
      frame_variant_id: variantId,
      frame_color: v?.color || '',
      frame_size:  v?.size || '',
      frame_cost:  v?.cost_price || 0,
      manuf_cost:  pricingMap[item.frame_type] || 0,
    })
  }

  // Auto-fill from lens variant
  const handleLensVariantChange = (variantId) => {
    const v = allLensVariants.find(lv => lv.id === variantId)
    onChange({ ...item,
      lens_variant_id:   variantId,
      lens_variant_name: v?.name || '',
      lens_cost:         v?.cost_price || 0,
      unit_price:        item.unit_price || v?.sell_price || '',
    })
  }

  // Auto-fill lens brand
  const handleLensBrandChange = (brandId) => {
    const brand = lensBrands.find(b => b.id === brandId)
    onChange({ ...item,
      lens_brand_id:   brandId,
      lens_brand_name: brand?.name || '',
      lens_variant_id: '',
      lens_variant_name:'',
    })
  }

  const lineTotal = (Number(item.unit_price) || 0) * (Number(item.qty) || 1) - (Number(item.item_discount) || 0)
  const itemCost  = (Number(item.frame_cost)||0) + (Number(item.lens_cost)||0) +
                    (Number(item.contact_lens_cost)||0) + (Number(item.manuf_cost)||0)
  const itemProfit= lineTotal - itemCost
  const typeIcon  = isMedical(item.product_type) ? '👓' : isSunglasses(item.product_type) ? '🕶️' : '👁️'

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Row header */}
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
            {item.frame_name || item.product_type || 'منتج جديد'}
            {item.frame_color && <span className="text-gray-400 ms-1">· {item.frame_color}</span>}
            {item.lens_variant_name && <span className="text-blue-500 ms-1">· {item.lens_variant_name}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
            <span>الكمية: <strong className="text-gray-600">{item.qty}</strong></span>
            {item.unit_price > 0 && <span>السعر: <strong className="text-gray-700">{Number(item.unit_price).toLocaleString()} ج</strong></span>}
            {lineTotal > 0 && <span className="text-blue-600 font-bold">الإجمالي: {lineTotal.toLocaleString()} ج</span>}
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
          {item._expanded ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
        </div>
      </div>

      {/* Expanded content */}
      {item._expanded && (
        <div className="p-4 space-y-4">
          {/* Product type selector */}
          <div className="flex gap-2">
            {PRODUCT_TYPES.map(pt => (
              <button key={pt} onClick={() => up('product_type', pt)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  item.product_type === pt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'
                }`}>
                {pt === 'نظارات طبية' ? '👓' : pt === 'نظارات شمسية' ? '🕶️' : '👁️'} {pt}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Glasses type */}
            {!isContact(item.product_type) && (
              <div>
                <label className="label">نوع النظارة</label>
                <select className="select" value={item.glasses_type} onChange={e => up('glasses_type', e.target.value)}>
                  <option value="">اختر...</option>
                  {GLASSES_TYPES.filter(t =>
                    isSunglasses(item.product_type) ? t.includes('شمس') : t.includes('طبية')
                  ).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="label">الكمية</label>
              <input type="number" min="1" className="input" value={item.qty}
                onChange={e => up('qty', Math.max(1, Number(e.target.value) || 1))}/>
            </div>

            {/* Unit price */}
            <div>
              <label className="label">سعر الوحدة (ج) *</label>
              <input type="number" className="input font-bold" value={item.unit_price}
                onChange={e => up('unit_price', e.target.value)} placeholder="0"/>
            </div>

            {/* Item discount */}
            <div>
              <label className="label">خصم العنصر (ج)</label>
              <input type="number" className="input" value={item.item_discount}
                onChange={e => up('item_discount', e.target.value)} placeholder="0"/>
            </div>
          </div>

          {/* Frame from inventory */}
          {!isContact(item.product_type) && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-gray-500">الفريم (من المخزون)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">الفريم</label>
                  <select className="select" value={item.frame_id} onChange={e => up('frame_id', e.target.value)}>
                    <option value="">اختر فريم...</option>
                    {frames.map(fr => <option key={fr.id} value={fr.id}>{fr.name}</option>)}
                  </select>
                </div>
                {item._frameVariants?.length > 0 && (
                  <div>
                    <label className="label">اللون / المقاس</label>
                    <select className="select" value={item.frame_variant_id} onChange={e => handleVariantChange(e.target.value)}>
                      <option value="">اختر...</option>
                      {item._frameVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.color} {v.size} — متاح: {v.qty_available}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {item.frame_type && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400">نوع الإطار:</span>
                  <span className="font-semibold text-indigo-600">{item.frame_type}</span>
                  {item.frame_cost > 0 && <span className="text-gray-400 ms-auto">تكلفة: {item.frame_cost} ج</span>}
                </div>
              )}
            </div>
          )}

          {/* Lens brand + variant (for medical) */}
          {isMedical(item.product_type) && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                <Layers size={12}/> العدسات
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">شركة العدسة</label>
                  <select className="select" value={item.lens_brand_id} onChange={e => handleLensBrandChange(e.target.value)}>
                    <option value="">اختر الشركة...</option>
                    {lensBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">نوع العدسة</label>
                  {item.lens_brand_id ? (
                    <select className="select" value={item.lens_variant_id} onChange={e => handleLensVariantChange(e.target.value)}>
                      <option value="">اختر النوع...</option>
                      {filteredLensVariants.map(v => (
                        <option key={v.id} value={v.id}>{v.name} — {v.sell_price} ج</option>
                      ))}
                    </select>
                  ) : (
                    <select className="select" disabled><option>اختر الشركة أولاً</option></select>
                  )}
                </div>
              </div>
              {item.lens_cost > 0 && (
                <div className="text-xs text-blue-600 font-semibold">تكلفة العدسة: {item.lens_cost} ج</div>
              )}
            </div>
          )}

          {/* Contact lens data */}
          {isContact(item.product_type) && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-blue-600">بيانات العدسات اللاصقة</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ماركة العدسة</label>
                  <input className="input" value={item.contact_lens_brand}
                    onChange={e => up('contact_lens_brand', e.target.value)} placeholder="Acuvue"/>
                </div>
                <div>
                  <label className="label">نوع العدسة</label>
                  <select className="select" value={item.contact_lens_type} onChange={e => up('contact_lens_type', e.target.value)}>
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
                ].map(([label, key, ph]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input type="number" step="0.1" className="input text-center" value={item[key]}
                      onChange={e => up(key, e.target.value)} placeholder={ph}/>
                  </div>
                ))}
              </div>
              <div>
                <label className="label">الكمية (علب)</label>
                <input type="number" className="input w-24" value={item.contact_lens_quantity}
                  onChange={e => up('contact_lens_quantity', e.target.value)} min="1"/>
              </div>
            </div>
          )}

          {/* Prescription (inline for medical / contact) */}
          {(isMedical(item.product_type) || isContact(item.product_type)) && (
            <div className="border border-blue-100 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1">
                <Eye size={12}/> الوصفة الطبية
              </p>
              <PrescriptionForm value={item.prescription} onChange={presc => up('prescription', presc)}/>
            </div>
          )}

          {/* Line total */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-500 space-y-0.5">
              {itemCost > 0 && <div>التكلفة: <strong className="text-red-600">{itemCost.toLocaleString()} ج</strong></div>}
              {itemCost > 0 && <div>الربح: <strong className={itemProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{itemProfit.toLocaleString()} ج</strong></div>}
            </div>
            <div className="text-left">
              <div className="text-xs text-gray-400">{item.qty} × {Number(item.unit_price||0).toLocaleString()}</div>
              <div className="text-2xl font-extrabold text-blue-700">{lineTotal.toLocaleString()} ج</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">ملاحظات هذا العنصر</label>
            <input className="input text-sm" value={item.notes} onChange={e => up('notes', e.target.value)}
              placeholder="أي ملاحظات خاصة بهذا المنتج..."/>
          </div>
        </div>
      )}
    </div>
  )
}

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

  const subtotal    = items.reduce((s, item) => {
    const lt = (Number(item.unit_price)||0) * (Number(item.qty)||1) - (Number(item.item_discount)||0)
    return s + lt
  }, 0)
  const totalCost   = items.reduce((s, item) =>
    s + (Number(item.frame_cost)||0) + (Number(item.lens_cost)||0) +
        (Number(item.contact_lens_cost)||0) + (Number(item.manuf_cost)||0), 0)

  // Check inventory warnings
  const warnings = items.filter(item =>
    item.frame_variant_id &&
    item._frameVariants?.find(v => v.id === item.frame_variant_id)?.qty_available < item.qty
  )

  return (
    <div className="space-y-3">
      {/* Items */}
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

      {/* Inventory warning */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-amber-700 font-semibold">
            تحذير: بعض المنتجات لا تتوفر كميتها الكافية في المخزون
          </p>
        </div>
      )}

      {/* Add item button */}
      <button onClick={addItem}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-2xl
          text-blue-600 font-semibold text-sm hover:border-blue-500 hover:bg-blue-50 transition-all
          flex items-center justify-center gap-2">
        <Plus size={16}/> إضافة منتج آخر
      </button>

      {/* Summary bar */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs opacity-75">
              {items.length} منتج{items.length > 1 ? ' (مجموع الكميات: ' + items.reduce((s,i) => s + (Number(i.qty)||1), 0) + ')' : ''}
            </div>
            {totalCost > 0 && (
              <div className="text-xs opacity-75">
                التكلفة الإجمالية: {totalCost.toLocaleString()} ج
                {subtotal > 0 && <> — هامش: {((subtotal - totalCost) / subtotal * 100).toFixed(0)}%</>}
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

export { emptyItem }
