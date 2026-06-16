import { useState, useEffect } from 'react'
import { supabase, GOVERNORATES, fmt } from '../lib/supabase'
import { Plus, Save, X, Truck, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

function CompanyForm({ company, onClose, onSave }) {
  const isEdit = !!company?.id
  const [f, setF] = useState({
    name:  company?.name  || '',
    notes: company?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.name.trim()) { setError('اسم الشركة مطلوب'); return }
    setSaving(true)
    const payload = { name: f.name.trim(), notes: f.notes.trim() || null }
    let err
    if (isEdit) ({ error: err } = await supabase.from('shipping_companies').update(payload).eq('id', company.id))
    else ({ error: err } = await supabase.from('shipping_companies').insert(payload))
    setSaving(false)
    if (err) setError(err.message)
    else onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'تعديل شركة الشحن' : 'شركة شحن جديدة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">اسم الشركة *</label>
            <input className="input" value={f.name} onChange={e => up('name', e.target.value)} placeholder="مثال: Bosta"/>
          </div>
          <div>
            <label className="label">ملاحظات (اختياري)</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e => up('notes', e.target.value)}/>
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

export default function ShippingSettings() {
  const [companies, setCompanies] = useState([])
  const [rates, setRates]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [expanded, setExpanded]   = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editCompany, setEditCompany] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data: cos } = await supabase.from('shipping_companies').select('*').order('name')
    const { data: rs  } = await supabase.from('shipping_rates').select('*')
    setCompanies(cos || [])
    const map = {}
    rs?.forEach(r => {
      if (!map[r.company_id]) map[r.company_id] = {}
      map[r.company_id][r.governorate] = r
    })
    setRates(map)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const updateRate = (companyId, gov, field, val) => {
    setRates(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [gov]: { ...(prev[companyId]?.[gov] || {}), [field]: Number(val) || 0 }
      }
    }))
  }

  const saveRates = async (companyId) => {
    setSaving(true)
    const compRates = rates[companyId] || {}
    for (const gov of GOVERNORATES) {
      const r = compRates[gov] || {}
      await supabase.from('shipping_rates').upsert({
        company_id: companyId,
        governorate: gov,
        customer_price: r.customer_price || 0,
        store_cost: r.store_cost || 0
      }, { onConflict: 'company_id,governorate' })
    }
    setSaving(false)
    alert('تم الحفظ ✅')
  }

  const toggleActive = async (company) => {
    await supabase.from('shipping_companies').update({ is_active: !company.is_active }).eq('id', company.id)
    load()
  }

  const deleteCompany = async (id) => {
    if (!window.confirm('هل تريد حذف شركة الشحن؟ سيتم حذف جميع أسعارها أيضاً.')) return
    await supabase.from('shipping_companies').delete().eq('id', id)
    load()
  }

  const handleSaveForm = () => {
    setShowForm(false)
    setEditCompany(null)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const activeCount   = companies.filter(c => c.is_active).length
  const inactiveCount = companies.filter(c => !c.is_active).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">إدارة شركات الشحن</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {companies.length} شركة — {activeCount} نشطة
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16}/> شركة جديدة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-blue-50 border-0 flex items-center gap-3">
          <Truck size={20} className="text-blue-600"/>
          <div>
            <div className="text-xs text-gray-500">إجمالي الشركات</div>
            <div className="text-xl font-extrabold text-blue-600">{companies.length}</div>
          </div>
        </div>
        <div className="card bg-green-50 border-0 flex items-center gap-3">
          <Truck size={20} className="text-green-600"/>
          <div>
            <div className="text-xs text-gray-500">نشطة</div>
            <div className="text-xl font-extrabold text-green-600">{activeCount}</div>
          </div>
        </div>
        <div className="card bg-gray-50 border-0 flex items-center gap-3">
          <Truck size={20} className="text-gray-400"/>
          <div>
            <div className="text-xs text-gray-500">غير نشطة</div>
            <div className="text-xl font-extrabold text-gray-500">{inactiveCount}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {companies.map(company => (
          <div key={company.id} className="card !p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === company.id ? null : company.id)}>
              <div className="flex items-center gap-3">
                <Truck size={18} className="text-blue-500"/>
                <div>
                  <span className="font-bold text-gray-800">{company.name}</span>
                  {company.notes && <p className="text-xs text-gray-400 mt-0.5">{company.notes}</p>}
                </div>
                <span className={`badge text-xs ${company.is_active ? 'pill-green' : 'pill-gray'}`}>
                  {company.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setEditCompany(company); setShowForm(true) }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                  <Edit3 size={14}/>
                </button>
                <button onClick={e => { e.stopPropagation(); toggleActive(company) }}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold ${company.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {company.is_active ? 'تعطيل' : 'تفعيل'}
                </button>
                <button onClick={e => { e.stopPropagation(); deleteCompany(company.id) }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
                  <Trash2 size={14}/>
                </button>
                {expanded === company.id
                  ? <ChevronUp size={18} className="text-gray-400"/>
                  : <ChevronDown size={18} className="text-gray-400"/>}
              </div>
            </div>

            {/* Rates table */}
            {expanded === company.id && (
              <div className="border-t border-gray-100">
                <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 font-semibold">
                  أسعار الشحن لكل محافظة
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="table-header w-40">المحافظة</th>
                        <th className="table-header">سعر الشحن للعميل (ج)</th>
                        <th className="table-header">تكلفة الشحن الفعلية (ج)</th>
                        <th className="table-header">الفرق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GOVERNORATES.map(gov => {
                        const r    = rates[company.id]?.[gov] || {}
                        const diff = (r.customer_price || 0) - (r.store_cost || 0)
                        return (
                          <tr key={gov} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="table-cell font-semibold text-sm text-gray-700">{gov}</td>
                            <td className="table-cell">
                              <input type="number" className="input w-24 text-center" min="0"
                                value={r.customer_price || 0}
                                onChange={e => updateRate(company.id, gov, 'customer_price', e.target.value)}/>
                            </td>
                            <td className="table-cell">
                              <input type="number" className="input w-24 text-center" min="0"
                                value={r.store_cost || 0}
                                onChange={e => updateRate(company.id, gov, 'store_cost', e.target.value)}/>
                            </td>
                            <td className="table-cell">
                              <span className={`text-sm font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{diff} ج</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => saveRates(company.id)} disabled={saving} className="btn-primary disabled:opacity-60">
                    <Save size={15}/> {saving ? 'جارٍ الحفظ...' : 'حفظ الأسعار'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {companies.length === 0 && (
          <div className="text-center py-16 text-gray-300">
            <Truck size={40} className="mx-auto mb-3"/>
            <p className="text-sm text-gray-400">لا توجد شركات شحن — أضف شركة جديدة</p>
          </div>
        )}
      </div>

      {showForm && (
        <CompanyForm
          company={editCompany}
          onClose={() => { setShowForm(false); setEditCompany(null) }}
          onSave={handleSaveForm}
        />
      )}
    </div>
  )
}
