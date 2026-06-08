import { useState, useEffect } from 'react'
import { supabase, GOVERNORATES, fmt } from '../lib/supabase'
import { Plus, Save, X, Truck, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function ShippingSettings() {
  const [companies, setCompanies] = useState([])
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    setLoading(true)
    const {data:cos} = await supabase.from('shipping_companies').select('*').order('name')
    const {data:rs}  = await supabase.from('shipping_rates').select('*')
    setCompanies(cos||[])
    const map = {}
    rs?.forEach(r => {
      if (!map[r.company_id]) map[r.company_id] = {}
      map[r.company_id][r.governorate] = r
    })
    setRates(map)
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const updateRate = (companyId, gov, field, val) => {
    setRates(prev => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [gov]: { ...(prev[companyId]?.[gov]||{}), [field]: Number(val)||0 }
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
        customer_price: r.customer_price||0,
        store_cost: r.store_cost||0
      }, { onConflict: 'company_id,governorate' })
    }
    setSaving(false)
    alert('تم الحفظ ✅')
  }

  const addCompany = async () => {
    if (!newName.trim()) return
    await supabase.from('shipping_companies').insert({ name: newName.trim() })
    setNewName('')
    setAdding(false)
    load()
  }

  const toggleActive = async (company) => {
    await supabase.from('shipping_companies').update({ is_active: !company.is_active }).eq('id', company.id)
    load()
  }

  const deleteCompany = async (id) => {
    if (!window.confirm('حذف شركة الشحن؟')) return
    await supabase.from('shipping_companies').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">إعدادات الشحن</h1>
          <p className="text-sm text-gray-400 mt-0.5">أسعار الشحن لكل شركة ومحافظة</p>
        </div>
        <button onClick={()=>setAdding(true)} className="btn-primary"><Plus size={16}/> شركة جديدة</button>
      </div>

      {adding && (
        <div className="card flex gap-3">
          <input className="input flex-1" value={newName} onChange={e=>setNewName(e.target.value)}
            placeholder="اسم شركة الشحن" onKeyDown={e=>e.key==='Enter'&&addCompany()}/>
          <button onClick={addCompany} className="btn-primary">إضافة</button>
          <button onClick={()=>setAdding(false)} className="btn-secondary"><X size={15}/></button>
        </div>
      )}

      <div className="space-y-3">
        {companies.map(company => (
          <div key={company.id} className="card !p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
              onClick={()=>setExpanded(expanded===company.id?null:company.id)}>
              <div className="flex items-center gap-3">
                <Truck size={18} className="text-blue-500"/>
                <span className="font-bold text-gray-800">{company.name}</span>
                <span className={`badge text-xs ${company.is_active?'pill-green':'pill-gray'}`}>
                  {company.is_active?'نشط':'غير نشط'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e=>{e.stopPropagation();toggleActive(company)}}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold ${company.is_active?'bg-red-50 text-red-600':'bg-green-50 text-green-600'}`}>
                  {company.is_active?'تعطيل':'تفعيل'}
                </button>
                <button onClick={e=>{e.stopPropagation();deleteCompany(company.id)}} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={14}/></button>
                {expanded===company.id?<ChevronUp size={18} className="text-gray-400"/>:<ChevronDown size={18} className="text-gray-400"/>}
              </div>
            </div>

            {/* Rates table */}
            {expanded===company.id && (
              <div className="border-t border-gray-100">
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
                        const r = rates[company.id]?.[gov] || {}
                        const diff = (r.customer_price||0) - (r.store_cost||0)
                        return (
                          <tr key={gov} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="table-cell font-semibold text-sm text-gray-700">{gov}</td>
                            <td className="table-cell">
                              <input type="number" className="input w-24 text-center" min="0"
                                value={r.customer_price||0}
                                onChange={e=>updateRate(company.id,gov,'customer_price',e.target.value)}/>
                            </td>
                            <td className="table-cell">
                              <input type="number" className="input w-24 text-center" min="0"
                                value={r.store_cost||0}
                                onChange={e=>updateRate(company.id,gov,'store_cost',e.target.value)}/>
                            </td>
                            <td className="table-cell">
                              <span className={`text-sm font-bold ${diff>=0?'text-green-600':'text-red-600'}`}>{diff} ج</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end">
                  <button onClick={()=>saveRates(company.id)} disabled={saving} className="btn-primary disabled:opacity-60">
                    <Save size={15}/> {saving?'جارٍ الحفظ...':'حفظ الأسعار'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
