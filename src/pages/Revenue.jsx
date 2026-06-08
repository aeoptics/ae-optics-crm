import { useState, useEffect } from 'react'
import { supabase, fmt, fmtPct, SOURCES, EXPENSE_CATEGORIES } from '../lib/supabase'
import { TrendingUp, DollarSign, BarChart3, Percent, TrendingDown, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899']

const TT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs font-semibold">
    <p className="text-gray-500 mb-1">{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color}}>{p.name}: {typeof p.value==='number'&&p.value>100?fmt(p.value):p.value}</p>)}
  </div>
) : null

export default function Revenue() {
  const [orders, setOrders]     = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('all') // all | month | year
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0,7))
  const [selYear, setSelYear]   = useState(String(new Date().getFullYear()))

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('expenses').select('*')
    ]).then(([{data:ord},{data:exp}]) => {
      setOrders(ord||[])
      setExpenses(exp||[])
      setLoading(false)
    })
  }, [])

  // Filter by period
  const filterByPeriod = (items, dateField) => {
    if (period==='month') return items.filter(i=>i[dateField]?.startsWith(selMonth))
    if (period==='year')  return items.filter(i=>i[dateField]?.startsWith(selYear))
    return items
  }

  const filteredOrders   = filterByPeriod(orders, 'order_date')
  const filteredExpenses = filterByPeriod(expenses, 'date')
  const delivered = filteredOrders.filter(o=>o.status==='Delivered')

  const revenue        = delivered.reduce((s,o)=>s+(o.total_final||0), 0)
  const grossProfit    = delivered.reduce((s,o)=>s+(o.actual_profit||0), 0)
  const totalExpenses  = filteredExpenses.reduce((s,e)=>s+(e.amount||0), 0)
  const netProfit      = grossProfit - totalExpenses
  const totalCosts     = delivered.reduce((s,o)=>s+(o.total_cost||0), 0)
  const discounts      = filteredOrders.reduce((s,o)=>s+(o.discount||0), 0)
  const shippingIncome = delivered.reduce((s,o)=>s+(o.customer_shipping_price||o.shipping_value||0), 0)
  const shippingCost   = delivered.reduce((s,o)=>s+(o.store_shipping_cost||o.actual_shipping_cost||0), 0)
  const avgOrder       = delivered.length ? revenue/delivered.length : 0
  const avgMargin      = delivered.length ? delivered.reduce((s,o)=>s+(o.profit_margin||0),0)/delivered.length : 0

  const refused  = filteredOrders.filter(o=>o.status==='Refused on Delivery').length
  const returned = filteredOrders.filter(o=>o.status==='Returned').length
  const deliveryRate = filteredOrders.length ? delivered.length/filteredOrders.length : 0

  // Monthly data
  const monthly = MONTHS.map((m,i) => {
    const mo   = delivered.filter(o=>o.order_date&&new Date(o.order_date).getMonth()===i)
    const moEx = expenses.filter(e=>e.date&&new Date(e.date).getMonth()===i)
    const rev  = mo.reduce((s,o)=>s+(o.total_final||0),0)
    const gp   = mo.reduce((s,o)=>s+(o.actual_profit||0),0)
    const ex   = moEx.reduce((s,e)=>s+(e.amount||0),0)
    return { name:m.slice(0,3), إيرادات:rev, 'ربح إجمالي':gp, 'صافي ربح':gp-ex, مصروفات:ex, طلبات:mo.length }
  })

  // By source
  const bySource = SOURCES.map(s=>({
    name:s,
    إيرادات: delivered.filter(o=>o.source===s).reduce((t,o)=>t+(o.total_final||0),0),
    طلبات:   filteredOrders.filter(o=>o.source===s).length,
  })).filter(s=>s.طلبات>0).sort((a,b)=>b.إيرادات-a.إيرادات)

  // By product type
  const byType = {}
  delivered.forEach(o=>{
    const t=o.product_type||o.glasses_type||'غير محدد'
    if(!byType[t])byType[t]={rev:0,count:0,profit:0}
    byType[t].rev+=(o.total_final||0); byType[t].count++; byType[t].profit+=(o.actual_profit||0)
  })

  // Expenses by category
  const expByCat = EXPENSE_CATEGORIES.map(c=>({
    name:c, total:filteredExpenses.filter(e=>e.category===c).reduce((s,e)=>s+(e.amount||0),0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">تحليل الإيرادات والأرباح</h1>
        {/* Period filter */}
        <div className="flex gap-2 items-center">
          {['all','month','year'].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period===p?'bg-blue-600 text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {p==='all'?'الكل':p==='month'?'شهر':'سنة'}
            </button>
          ))}
          {period==='month'&&<input type="month" className="input w-36 text-xs" value={selMonth} onChange={e=>setSelMonth(e.target.value)}/>}
          {period==='year'&&<input type="number" className="input w-24 text-xs" value={selYear} onChange={e=>setSelYear(e.target.value)} min="2020" max="2030"/>}
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:'إجمالي الإيرادات', value:fmt(revenue),    icon:DollarSign, color:'text-green-600', bg:'bg-green-50'},
          {label:'ربح إجمالي',       value:fmt(grossProfit), icon:TrendingUp,  color:'text-teal-600',  bg:'bg-teal-50'},
          {label:'صافي الربح',       value:fmt(netProfit),   icon:TrendingUp,  color:netProfit>=0?'text-emerald-600':'text-red-600', bg:netProfit>=0?'bg-emerald-50':'bg-red-50'},
          {label:'متوسط هامش الربح', value:fmtPct(avgMargin),icon:Percent,     color:'text-indigo-600',bg:'bg-indigo-50'},
        ].map(({label,value,icon:Icon,color,bg})=>(
          <div key={label} className={`card flex items-center gap-3 ${bg} border-0`}>
            <Icon size={20} className={color}/>
            <div><div className="text-xs text-gray-500">{label}</div><div className={`text-xl font-extrabold ${color}`}>{value}</div></div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {label:'إجمالي التكاليف', value:fmt(totalCosts),    color:'text-red-600'},
          {label:'المصروفات التشغيلية', value:fmt(totalExpenses), color:'text-orange-600'},
          {label:'إجمالي الخصومات', value:fmt(discounts),     color:'text-amber-600'},
          {label:'نسبة التسليم',    value:fmtPct(deliveryRate),color:'text-green-600'},
          {label:'مرفوض + مرتجع',  value:refused+returned,   color:'text-red-600'},
        ].map(({label,value,color})=>(
          <div key={label} className="card">
            <div className="text-xs text-gray-400">{label}</div>
            <div className={`text-xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Net profit formula */}
      <div className="card bg-gradient-to-l from-blue-50 to-indigo-50 border-blue-200">
        <p className="text-xs font-bold text-blue-600 mb-3 uppercase tracking-wide">معادلة صافي الربح</p>
        <div className="flex items-center gap-2 flex-wrap text-sm font-semibold">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg">{fmt(revenue)} إيرادات</span>
          <span className="text-gray-400">−</span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg">{fmt(totalCosts)} تكاليف</span>
          <span className="text-gray-400">−</span>
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg">{fmt(totalExpenses)} مصروفات</span>
          <span className="text-gray-400">=</span>
          <span className={`px-3 py-1 rounded-lg font-extrabold text-base ${netProfit>=0?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{fmt(netProfit)} صافي ربح</span>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card">
        <h3 className="section-title">الإيرادات والأرباح الشهرية</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="name" tick={{fontSize:11,fontFamily:'Cairo'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip content={<TT/>}/>
            <Legend wrapperStyle={{fontFamily:'Cairo',fontSize:12}}/>
            <Bar dataKey="إيرادات"     fill="#3B82F6" radius={[3,3,0,0]} barSize={10}/>
            <Bar dataKey="ربح إجمالي" fill="#10B981" radius={[3,3,0,0]} barSize={10}/>
            <Bar dataKey="صافي ربح"   fill="#6366F1" radius={[3,3,0,0]} barSize={10}/>
            <Bar dataKey="مصروفات"    fill="#EF4444" radius={[3,3,0,0]} barSize={10}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By source */}
        <div className="card">
          <h3 className="section-title">إيرادات حسب المصدر</h3>
          {bySource.length===0?<div className="text-center py-10 text-gray-300 text-sm">لا توجد بيانات</div>:(
            <div className="space-y-3 mt-2">
              {bySource.map(({name,إيرادات,طلبات},i)=>(
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-700 text-xs">{name}</span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400">{طلبات} طلب</span>
                      <span className="font-bold text-blue-600">{fmt(إيرادات)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 rounded-full" style={{width:`${revenue>0?(إيرادات/revenue)*100:0}%`,background:COLORS[i%COLORS.length]}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By product type */}
        <div className="card">
          <h3 className="section-title">حسب نوع المنتج</h3>
          {Object.keys(byType).length===0?<div className="text-center py-10 text-gray-300 text-sm">لا توجد بيانات</div>:(
            <div className="space-y-3 mt-2">
              {Object.entries(byType).sort((a,b)=>b[1].rev-a[1].rev).map(([name,{rev,count,profit}],i)=>(
                <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700">{name}</div>
                    <div className="text-xs text-gray-400">{count} طلب</div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-blue-600">{fmt(rev)}</div>
                    <div className={`text-xs font-semibold ${profit>=0?'text-green-600':'text-red-500'}`}>{fmt(profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses by category */}
        <div className="card">
          <h3 className="section-title">المصروفات حسب التصنيف</h3>
          {expByCat.length===0?<div className="text-center py-10 text-gray-300 text-sm">لا توجد مصروفات</div>:(
            <div className="space-y-3 mt-2">
              {expByCat.map(({name,total},i)=>(
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-600">{name}</span>
                    <span className="font-bold text-red-600">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 rounded-full bg-red-400" style={{width:`${totalExpenses>0?(total/totalExpenses)*100:0}%`}}/>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                <span className="font-bold text-gray-700">الإجمالي</span>
                <span className="font-extrabold text-red-600">{fmt(totalExpenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping analysis */}
      <div className="card">
        <h3 className="section-title">تحليل الشحن</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            {label:'إيرادات الشحن من العملاء', value:fmt(shippingIncome), color:'text-green-600', bg:'bg-green-50'},
            {label:'تكلفة الشحن الفعلية',      value:fmt(shippingCost),   color:'text-red-600',   bg:'bg-red-50'},
            {label:'دعم الشحن (خسارة)',         value:fmt(Math.max(shippingCost-shippingIncome,0)), color:'text-orange-600', bg:'bg-orange-50'},
            {label:'ربح الشحن',                 value:fmt(Math.max(shippingIncome-shippingCost,0)), color:'text-teal-600',  bg:'bg-teal-50'},
          ].map(({label,value,color,bg})=>(
            <div key={label} className={`rounded-xl p-3 ${bg}`}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`text-lg font-extrabold ${color} mt-1`}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
