import { useState, useEffect } from 'react'
import { supabase, EXPENSE_CATEGORIES, fmt } from '../lib/supabase'
import { Plus, Save, X, Trash2, Edit3, TrendingDown } from 'lucide-react'

function ExpenseForm({ expense, onClose, onSave }) {
  const isEdit = !!expense?.id
  const [f, setF] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || '',
    amount: expense?.amount || '',
    description: expense?.description || '',
    notes: expense?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const up = (k,v) => setF(p=>({...p,[k]:v}))

  const handleSave = async () => {
    if (!f.category || !f.amount) return
    setSaving(true)
    const payload = { ...f, amount: Number(f.amount) }
    let error
    if (isEdit) ({error} = await supabase.from('expenses').update(payload).eq('id',expense.id))
    else ({error} = await supabase.from('expenses').insert(payload))
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit?'تعديل مصروف':'إضافة مصروف'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">التاريخ</label>
            <input type="date" className="input" value={f.date} onChange={e=>up('date',e.target.value)}/></div>
          <div><label className="label">التصنيف</label>
            <select className="select" value={f.category} onChange={e=>up('category',e.target.value)}>
              <option value="">اختر...</option>
              {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">القيمة (ج)</label>
            <input type="number" className="input" value={f.amount} onChange={e=>up('amount',e.target.value)} placeholder="0"/></div>
          <div><label className="label">الوصف</label>
            <input className="input" value={f.description} onChange={e=>up('description',e.target.value)} placeholder="تفاصيل المصروف"/></div>
          <div><label className="label">ملاحظات</label>
            <textarea className="input h-20 resize-none" value={f.notes} onChange={e=>up('notes',e.target.value)}/></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Save size={15}/>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const load = async () => {
    setLoading(true)
    const {data} = await supabase.from('expenses').select('*').order('date',{ascending:false})
    setExpenses(data||[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const filtered = expenses.filter(e=>
    (!filterCat||e.category===filterCat) &&
    (!filterMonth||e.date?.startsWith(filterMonth))
  )

  const totalAll = filtered.reduce((s,e)=>s+(e.amount||0),0)
  const byCategory = EXPENSE_CATEGORIES.map(c=>({
    name:c, total:expenses.filter(e=>e.category===c).reduce((s,e)=>s+(e.amount||0),0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا المصروف؟')) return
    await supabase.from('expenses').delete().eq('id',id)
    load()
  }

  const CAT_COLORS = {
    'مرتبات':'bg-blue-100 text-blue-700', 'إيجار':'bg-purple-100 text-purple-700',
    'إعلانات':'bg-pink-100 text-pink-700', 'إنترنت':'bg-cyan-100 text-cyan-700',
    'كهرباء':'bg-yellow-100 text-yellow-700', 'مشتريات':'bg-orange-100 text-orange-700',
    'مصروفات أخرى':'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">المصروفات التشغيلية</h1>
          <p className="text-sm text-gray-400 mt-0.5">إجمالي: {fmt(totalAll)}</p>
        </div>
        <button onClick={()=>{setEditExpense(null);setShowForm(true)}} className="btn-primary">
          <Plus size={16}/> إضافة مصروف
        </button>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {byCategory.slice(0,4).map(({name,total})=>(
          <div key={name} className={`card border-0 ${CAT_COLORS[name]?.split(' ')[0].replace('text-','bg-').replace('700','50')||'bg-gray-50'}`}>
            <div className="text-xs font-semibold text-gray-500">{name}</div>
            <div className="text-xl font-extrabold text-gray-800 mt-1">{fmt(total)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card !p-3 flex gap-3 flex-wrap">
        <select className="select w-auto min-w-36" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
        <input type="month" className="input w-auto" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/>
        {(filterCat||filterMonth)&&<button onClick={()=>{setFilterCat('');setFilterMonth('')}} className="btn-secondary"><X size={13}/>مسح</button>}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading?<div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
        :filtered.length===0?<div className="text-center py-16"><TrendingDown size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-sm text-gray-400">لا توجد مصروفات</p></div>
        :(
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['التاريخ','التصنيف','الوصف','القيمة','ملاحظات','إجراءات'].map(h=>(
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id} className="table-row group">
                    <td className="table-cell text-xs text-gray-500">{e.date}</td>
                    <td className="table-cell"><span className={`badge ${CAT_COLORS[e.category]||'pill-gray'}`}>{e.category}</span></td>
                    <td className="table-cell text-sm">{e.description||'—'}</td>
                    <td className="table-cell font-bold text-red-600">{fmt(e.amount)}</td>
                    <td className="table-cell text-xs text-gray-400">{e.notes||'—'}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>{setEditExpense(e);setShowForm(true)}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit3 size={14}/></button>
                        <button onClick={()=>handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan="3" className="table-cell font-bold text-gray-700">الإجمالي</td>
                  <td className="table-cell font-extrabold text-red-600 text-lg">{fmt(totalAll)}</td>
                  <td colSpan="2"/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showForm&&<ExpenseForm expense={editExpense} onClose={()=>{setShowForm(false);setEditExpense(null)}} onSave={()=>{setShowForm(false);setEditExpense(null);load()}}/>}
    </div>
  )
}
