// ── مخزون الفريمات مع دعم Variants (متطلب #6) ──────────────────────
import { useState, useEffect } from 'react'
import { supabase, FRAME_TYPES, fmt } from '../lib/supabase'
import { Plus, Save, X, Package, Edit3, Trash2, Search, AlertTriangle, ChevronDown, ChevronUp, Layers } from 'lucide-react'

const GENDER = ['رجالي', 'نسائي', 'أطفال']
const TYPE   = ['طبية', 'شمس']
const STATUS_BADGE = { 'متاح': 'pill-green', 'منخفض': 'pill-yellow', 'نفد': 'pill-red' }
const statusOf = (qty) => qty <= 0 ? 'نفد' : qty <= 3 ? 'منخفض' : 'متاح'

// ── نموذج Variant ──────────────────────────────────────────────────
function VariantForm({ frameId, variant, onClose, onSave }) {
  const isEdit = !!variant?.id
  const [f, setF] = useState({
    sku:           variant?.sku || '',
    color:         variant?.color || '',
    size:          variant?.size || '',
    qty_total:     variant?.qty_total ?? '',
    qty_reserved:  variant?.qty_reserved ?? 0,
    cost_price:    variant?.cost_price ?? '',
    sell_price:    variant?.sell_price ?? '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))
  const available = (Number(f.qty_total) || 0) - (Number(f.qty_reserved) || 0)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      frame_id: frameId,
      sku:           f.sku,
      color:         f.color,
      size:          f.size,
      qty_total:     Number(f.qty_total) || 0,
      qty_reserved:  Number(f.qty_reserved) || 0,
      cost_price:    Number(f.cost_price) || 0,
      sell_price:    Number(f.sell_price) || 0,
    }
    let err
    if (isEdit) ({ error: err } = await supabase.from('inventory_variants').update(payload).eq('id', variant.id))
    else ({ error: err } = await supabase.from('inventory_variants').insert(payload))
    setSaving(false)
    if (!err) onSave()
    else console.error(err)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'تعديل Variant' : 'إضافة Variant'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">اللون</label>
              <input className="input" value={f.color} onChange={e => up('color', e.target.value)} placeholder="مثال: أسود"/>
            </div>
            <div>
              <label className="label">المقاس</label>
              <input className="input" value={f.size} onChange={e => up('size', e.target.value)} placeholder="مثال: 52" dir="ltr"/>
            </div>
          </div>
          <div>
            <label className="label">كود (SKU) — اختياري</label>
            <input className="input" value={f.sku} onChange={e => up('sku', e.target.value)} placeholder="مثال: RB-BLK-52" dir="ltr"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">الكمية الإجمالية</label>
              <input type="number" className="input" value={f.qty_total} onChange={e => up('qty_total', e.target.value)}/>
            </div>
            <div>
              <label className="label">المحجوزة</label>
              <input type="number" className="input" value={f.qty_reserved} onChange={e => up('qty_reserved', e.target.value)}/>
            </div>
          </div>
          <div className={`rounded-xl p-3 flex items-center justify-between ${available > 3 ? 'bg-green-50' : available > 0 ? 'bg-yellow-50' : 'bg-red-50'}`}>
            <span className="text-sm font-semibold text-gray-600">المتاح</span>
            <span className={`text-2xl font-extrabold ${available > 3 ? 'text-green-600' : available > 0 ? 'text-yellow-600' : 'text-red-600'}`}>{available}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">سعر التكلفة (ج)</label>
              <input type="number" className="input" value={f.cost_price} onChange={e => up('cost_price', e.target.value)}/>
            </div>
            <div>
              <label className="label">سعر البيع (ج)</label>
              <input type="number" className="input" value={f.sell_price} onChange={e => up('sell_price', e.target.value)}/>
            </div>
          </div>
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

// ── نموذج الفريم الأساسي ──────────────────────────────────────────
function FrameForm({ frame, onClose, onSave }) {
  const isEdit = !!frame?.id
  const [f, setF] = useState({
    name:       frame?.name || '',
    type:       frame?.type || '',
    gender:     frame?.gender || '',
    frame_type: frame?.frame_type || '',
    notes:      frame?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.name) return
    setSaving(true)
    let error
    if (isEdit) ({ error } = await supabase.from('inventory').update(f).eq('id', frame.id))
    else ({ error } = await supabase.from('inventory').insert(f))
    setSaving(false)
    if (!error) onSave()
    else console.error(error)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل فريم' : 'إضافة فريم'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">اسم الفريم *</label>
            <input className="input" value={f.name} onChange={e => up('name', e.target.value)} placeholder="مثال: Ray-Ban Classic"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">نوع النظارة</label>
              <select className="select" value={f.type} onChange={e => up('type', e.target.value)}>
                <option value="">اختر...</option>
                {TYPE.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">الجنس</label>
              <select className="select" value={f.gender} onChange={e => up('gender', e.target.value)}>
                <option value="">اختر...</option>
                {GENDER.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">نوع الإطار</label>
            <select className="select" value={f.frame_type} onChange={e => up('frame_type', e.target.value)}>
              <option value="">اختر...</option>
              {FRAME_TYPES.map(ft => <option key={ft}>{ft}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">يُستخدم لحساب تكلفة المصنعية تلقائياً في الطلبات</p>
          </div>
          <div>
            <label className="label">ملاحظات</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            💡 بعد حفظ الفريم، أضف الـ Variants (ألوان/مقاسات مختلفة) مع كمية وسعر مستقل لكل منها
          </div>
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

// ── الصفحة الرئيسية ─────────────────────────────────────────────────
export default function Inventory() {
  const [frames, setFrames]     = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState({})
  const [search, setSearch]     = useState('')
  const [showFrameForm, setShowFrameForm]     = useState(false)
  const [editFrame, setEditFrame]             = useState(null)
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editVariant, setEditVariant]         = useState(null)
  const [activeFrameId, setActiveFrameId]     = useState(null)

  const load = async () => {
    setLoading(true)
    const [{ data: fr }, { data: vr }] = await Promise.all([
      supabase.from('inventory').select('*').order('name'),
      supabase.from('inventory_variants').select('*').order('color'),
    ])
    setFrames(fr || [])
    setVariants(vr || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const deleteFrame = async (id) => {
    if (!window.confirm('حذف هذا الفريم وجميع Variants الخاصة به؟')) return
    await supabase.from('inventory').delete().eq('id', id)
    load()
  }
  const deleteVariant = async (id) => {
    if (!window.confirm('حذف هذا الـ Variant؟')) return
    await supabase.from('inventory_variants').delete().eq('id', id)
    load()
  }

  const filtered = frames.filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.type?.includes(search) || f.frame_type?.includes(search)
  )

  // إجماليات
  const totalQtyAvailable = variants.reduce((s, v) => s + Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0), 0)
  const lowVariants  = variants.filter(v => statusOf(Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0)) === 'منخفض').length
  const outVariants  = variants.filter(v => statusOf(Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0)) === 'نفد').length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">مخزون الفريمات</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {frames.length} فريم — {variants.length} Variant — {totalQtyAvailable} قطعة متاحة
          </p>
        </div>
        <button onClick={() => { setEditFrame(null); setShowFrameForm(true) }} className="btn-primary">
          <Plus size={16}/> إضافة فريم
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الفريمات', value: frames.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'إجمالي Variants', value: variants.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Variants منخفضة', value: lowVariants, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Variants نفدت', value: outVariants, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-2xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {(lowVariants > 0 || outVariants > 0) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0"/>
          <p className="text-sm text-amber-700 font-semibold">
            {outVariants > 0 && `${outVariants} Variant نفدت الكمية`}
            {outVariants > 0 && lowVariants > 0 && ' — '}
            {lowVariants > 0 && `${lowVariants} Variant بكمية منخفضة`}
          </p>
        </div>
      )}

      {/* فلتر بحث */}
      <div className="card !p-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9" placeholder="بحث بالاسم، النوع، نوع الإطار..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* قائمة الفريمات بالـ Variants */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <Package size={40} className="mx-auto mb-3 text-gray-200"/>
          <p className="text-sm text-gray-400">لا توجد فريمات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fr => {
            const fv = variants.filter(v => v.frame_id === fr.id)
            const isOpen = expanded[fr.id]
            const totalAvail = fv.reduce((s, v) => s + Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0), 0)
            const hasAlert = fv.some(v => {
              const a = Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0)
              return a <= 3
            })
            return (
              <div key={fr.id} className="card !p-0 overflow-hidden">
                {/* Frame header row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(fr.id)}>
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 text-lg">
                    {fr.type === 'شمس' ? '🕶️' : '👓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 truncate">{fr.name}</span>
                      {hasAlert && <AlertTriangle size={14} className="text-amber-400 flex-shrink-0"/>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      {fr.type && <span>{fr.type}</span>}
                      {fr.gender && <><span>·</span><span>{fr.gender}</span></>}
                      {fr.frame_type && <><span>·</span><span className="text-indigo-600 font-semibold">{fr.frame_type}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">Variants</div>
                      <div className="font-bold text-gray-700">{fv.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">متاح</div>
                      <div className={`font-extrabold ${totalAvail > 3 ? 'text-green-600' : totalAvail > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {totalAvail}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setActiveFrameId(fr.id); setEditVariant(null); setShowVariantForm(true) }}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 text-xs font-semibold flex items-center gap-1">
                      <Plus size={13}/> Variant
                    </button>
                    <button onClick={e => { e.stopPropagation(); setEditFrame(fr); setShowFrameForm(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                      <Edit3 size={14}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteFrame(fr.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 size={14}/>
                    </button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                  </div>
                </div>

                {/* Variants table */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {fv.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">
                        لا توجد Variants — اضغط "+ Variant" لإضافة لون أو مقاس
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            {['SKU', 'اللون', 'المقاس', 'الإجمالي', 'محجوز 🔒', 'متاح ✅', 'سعر التكلفة', 'سعر البيع', 'الحالة', 'إجراءات'].map(h => (
                              <th key={h} className="table-header text-xs">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fv.map(v => {
                            const avail = Math.max((v.qty_total || 0) - (v.qty_reserved || 0), 0)
                            const st = statusOf(avail)
                            return (
                              <tr key={v.id} className={`table-row group ${st === 'نفد' ? 'bg-red-50/30' : st === 'منخفض' ? 'bg-yellow-50/30' : ''}`}>
                                <td className="table-cell text-xs font-mono text-gray-400">{v.sku || '—'}</td>
                                <td className="table-cell text-sm font-semibold">{v.color || '—'}</td>
                                <td className="table-cell text-xs font-mono" dir="ltr">{v.size || '—'}</td>
                                <td className="table-cell text-center text-sm">{v.qty_total}</td>
                                <td className="table-cell text-center">
                                  <span className="text-xs text-orange-500 font-semibold">{v.qty_reserved || 0}</span>
                                </td>
                                <td className="table-cell text-center">
                                  <span className={`font-extrabold text-lg ${avail > 3 ? 'text-green-600' : avail > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {avail}
                                  </span>
                                </td>
                                <td className="table-cell text-sm text-red-600">{fmt(v.cost_price)}</td>
                                <td className="table-cell text-sm font-bold text-green-700">{fmt(v.sell_price)}</td>
                                <td className="table-cell">
                                  <span className={`badge ${STATUS_BADGE[st] || 'pill-gray'}`}>{st}</span>
                                </td>
                                <td className="table-cell">
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setActiveFrameId(fr.id); setEditVariant(v); setShowVariantForm(true) }}
                                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit3 size={13}/></button>
                                    <button onClick={() => deleteVariant(v.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13}/></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
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

      {showFrameForm && (
        <FrameForm frame={editFrame}
          onClose={() => { setShowFrameForm(false); setEditFrame(null) }}
          onSave={() => { setShowFrameForm(false); setEditFrame(null); load() }}
        />
      )}
      {showVariantForm && (
        <VariantForm frameId={activeFrameId} variant={editVariant}
          onClose={() => { setShowVariantForm(false); setEditVariant(null); setActiveFrameId(null) }}
          onSave={() => { setShowVariantForm(false); setEditVariant(null); setActiveFrameId(null); load() }}
        />
      )}
    </div>
  )
}
