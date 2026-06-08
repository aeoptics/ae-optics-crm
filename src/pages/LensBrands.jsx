// ── صفحة شركات العدسات (Lens Brands) — متطلب #5 ────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Save, X, Edit3, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Layers } from 'lucide-react'

// ── نموذج Variant ──────────────────────────────────────────────────
function VariantForm({ brandId, variant, onClose, onSave }) {
  const isEdit = !!variant?.id
  const [f, setF] = useState({
    name: variant?.name || '',
    cost_price: variant?.cost_price || '',
    sell_price: variant?.sell_price || '',
    manuf_cost: variant?.manuf_cost || '',
    is_active: variant?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.name) { setError('اسم الـ Variant مطلوب'); return }
    setSaving(true)
    const payload = {
      brand_id: brandId,
      name: f.name,
      cost_price: Number(f.cost_price) || 0,
      sell_price: Number(f.sell_price) || 0,
      manuf_cost: Number(f.manuf_cost) || 0,
      is_active: f.is_active,
    }
    let err
    if (isEdit) ({ error: err } = await supabase.from('lens_variants').update(payload).eq('id', variant.id))
    else ({ error: err } = await supabase.from('lens_variants').insert(payload))
    setSaving(false)
    if (err) setError(err.message)
    else onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'تعديل Variant' : 'إضافة Variant'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">اسم الـ Variant *</label>
            <input className="input" value={f.name} onChange={e => up('name', e.target.value)} placeholder="مثال: Blue Protect"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">سعر التكلفة (ج)</label>
              <input type="number" className="input" value={f.cost_price} onChange={e => up('cost_price', e.target.value)} placeholder="0"/>
            </div>
            <div>
              <label className="label">سعر البيع (ج)</label>
              <input type="number" className="input" value={f.sell_price} onChange={e => up('sell_price', e.target.value)} placeholder="0"/>
            </div>
          </div>
          <div>
            <label className="label">المصنعية الخاصة (ج) — اختياري</label>
            <input type="number" className="input" value={f.manuf_cost} onChange={e => up('manuf_cost', e.target.value)} placeholder="0"/>
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3">
            <input type="checkbox" checked={f.is_active} onChange={e => up('is_active', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
            <span className="text-sm font-semibold text-gray-700">نشط</span>
          </label>
          {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── نموذج Brand ────────────────────────────────────────────────────
function BrandForm({ brand, onClose, onSave }) {
  const isEdit = !!brand?.id
  const [name, setName] = useState(brand?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('اسم الشركة مطلوب'); return }
    setSaving(true)
    let err
    if (isEdit) ({ error: err } = await supabase.from('lens_brands').update({ name: name.trim() }).eq('id', brand.id))
    else ({ error: err } = await supabase.from('lens_brands').insert({ name: name.trim() }))
    setSaving(false)
    if (err) setError(err.message)
    else onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'تعديل الشركة' : 'إضافة شركة عدسات'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">اسم الشركة *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="مثال: Zeiss"/>
          </div>
          {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── الصفحة الرئيسية ─────────────────────────────────────────────────
export default function LensBrands() {
  const [brands, setBrands] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [editBrand, setEditBrand] = useState(null)
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editVariant, setEditVariant] = useState(null)
  const [activeBrandId, setActiveBrandId] = useState(null)

  const load = async () => {
    setLoading(true)
    const [{ data: b }, { data: v }] = await Promise.all([
      supabase.from('lens_brands').select('*').order('name'),
      supabase.from('lens_variants').select('*').order('name'),
    ])
    setBrands(b || [])
    setVariants(v || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const deleteBrand = async (id) => {
    if (!window.confirm('حذف هذه الشركة وجميع Variants الخاصة بها؟')) return
    await supabase.from('lens_brands').delete().eq('id', id)
    load()
  }

  const deleteVariant = async (id) => {
    if (!window.confirm('حذف هذا الـ Variant؟')) return
    await supabase.from('lens_variants').delete().eq('id', id)
    load()
  }

  const toggleVariantActive = async (v) => {
    await supabase.from('lens_variants').update({ is_active: !v.is_active }).eq('id', v.id)
    load()
  }

  const totalVariants = variants.length
  const activeVariants = variants.filter(v => v.is_active).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">شركات العدسات</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {brands.length} شركة — {totalVariants} Variant — {activeVariants} نشط
          </p>
        </div>
        <button onClick={() => { setEditBrand(null); setShowBrandForm(true) }} className="btn-primary">
          <Plus size={16}/> إضافة شركة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي الشركات', value: brands.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي Variants', value: totalVariants, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Variants نشطة', value: activeVariants, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-2xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16 card">
          <Layers size={40} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm text-gray-400">لا توجد شركات عدسات بعد</p>
          <button onClick={() => setShowBrandForm(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={14}/> إضافة أول شركة
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map(brand => {
            const bv = variants.filter(v => v.brand_id === brand.id)
            const isOpen = expanded[brand.id]
            return (
              <div key={brand.id} className="card !p-0 overflow-hidden">
                {/* Brand header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(brand.id)}>
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-extrabold text-sm">
                    {brand.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{brand.name}</div>
                    <div className="text-xs text-gray-400">{bv.length} Variant — {bv.filter(v => v.is_active).length} نشط</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setActiveBrandId(brand.id); setEditVariant(null); setShowVariantForm(true) }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 text-xs font-semibold flex items-center gap-1">
                      <Plus size={13}/> Variant
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditBrand(brand); setShowBrandForm(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Edit3 size={14}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteBrand(brand.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 size={14}/>
                    </button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                  </div>
                </div>

                {/* Variants list */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {bv.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">
                        لا توجد Variants — اضغط "+ Variant" لإضافة أول واحد
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            {['اسم الـ Variant','سعر التكلفة','سعر البيع','مصنعية خاصة','الحالة','إجراءات'].map(h => (
                              <th key={h} className="table-header text-xs">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bv.map(v => (
                            <tr key={v.id} className={`table-row group ${!v.is_active ? 'opacity-50' : ''}`}>
                              <td className="table-cell font-semibold text-gray-800 text-sm">{v.name}</td>
                              <td className="table-cell text-sm text-red-600">{v.cost_price} ج</td>
                              <td className="table-cell text-sm font-bold text-green-700">{v.sell_price} ج</td>
                              <td className="table-cell text-sm text-gray-500">
                                {v.manuf_cost > 0 ? `${v.manuf_cost} ج` : '—'}
                              </td>
                              <td className="table-cell">
                                <span className={`badge ${v.is_active ? 'pill-green' : 'pill-gray'}`}>
                                  {v.is_active ? 'نشط' : 'غير نشط'}
                                </span>
                              </td>
                              <td className="table-cell">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => toggleVariantActive(v)}
                                    className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500">
                                    {v.is_active ? <EyeOff size={13}/> : <Eye size={13}/>}
                                  </button>
                                  <button onClick={() => { setActiveBrandId(brand.id); setEditVariant(v); setShowVariantForm(true) }}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                                    <Edit3 size={13}/>
                                  </button>
                                  <button onClick={() => deleteVariant(v.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                                    <Trash2 size={13}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showBrandForm && (
        <BrandForm brand={editBrand}
          onClose={() => { setShowBrandForm(false); setEditBrand(null) }}
          onSave={() => { setShowBrandForm(false); setEditBrand(null); load() }}
        />
      )}
      {showVariantForm && (
        <VariantForm brandId={activeBrandId} variant={editVariant}
          onClose={() => { setShowVariantForm(false); setEditVariant(null); setActiveBrandId(null) }}
          onSave={() => { setShowVariantForm(false); setEditVariant(null); setActiveBrandId(null); load() }}
        />
      )}
    </div>
  )
}
