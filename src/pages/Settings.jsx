// ── الإعدادات — مصنعية الورشة + ae Optics (متطلبات #8، #10) ─────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Settings as SettingsIcon, DollarSign, CheckCircle, Info, Wrench } from 'lucide-react'

export default function Settings() {
  const [pricing, setPricing] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    supabase.from('pricing_settings').select('*').order('frame_type').then(({ data }) => {
      setPricing(data || [])
      setLoading(false)
    })
  }, [])

  const updatePrice = (id, val) => {
    setPricing(p => p.map(r => r.id === id ? { ...r, manuf_cost: Number(val) } : r))
  }

  const savePricing = async () => {
    setSaving(true)
    for (const p of pricing) {
      await supabase.from('pricing_settings').update({ manuf_cost: p.manuf_cost }).eq('id', p.id)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const FRAME_ICONS = { 'Full Frame': '🔲', 'Half Frame': '⬜', 'Rimless': '⭕' }
  const FRAME_AR    = { 'Full Frame': 'فريم كامل', 'Half Frame': 'نصف فريم', 'Rimless': 'بدون إطار' }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="page-title">الإعدادات</h1>
        <p className="text-sm text-gray-400 mt-0.5">إعدادات النظام والتسعير</p>
      </div>

      {/* مصنعية الورشة (متطلب #8) */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Wrench size={20} className="text-indigo-600"/>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Workshop Labor Cost — تكلفة المصنعية</h2>
            <p className="text-xs text-gray-400">للحساب الداخلي فقط — التغيير يؤثر على الطلبات الجديدة فقط</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
          ⚠️ عند تعديل أسعار المصنعية، تُطبَّق الأسعار الجديدة على الطلبات الجديدة فقط.
          الطلبات القديمة تحتفظ بقيمة المصنعية الأصلية وقت إنشائها ولا يُعاد احتسابها.
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-3">
            {pricing.map(p => (
              <div key={p.id} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <div className="text-2xl">{FRAME_ICONS[p.frame_type] || '🖼️'}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{p.frame_type}</div>
                  <div className="text-xs text-gray-400">{FRAME_AR[p.frame_type]}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={p.manuf_cost}
                    onChange={e => updatePrice(p.id, e.target.value)}
                    className="input w-32 text-center font-bold" min="0"/>
                  <span className="text-sm text-gray-400 font-semibold">ج</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              {saved && (
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                  <CheckCircle size={16}/>تم الحفظ ✅
                </span>
              )}
              <button onClick={savePricing} disabled={saving} className="btn-primary ms-auto disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
                {saving ? 'جارٍ الحفظ...' : 'حفظ الأسعار'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'إعدادات الشحن',     desc: 'أسعار الشحن لكل شركة ومحافظة', link: '/shipping',    icon: '🚚' },
          { title: 'شركات العدسات',     desc: 'إدارة Brands وVariants العدسات', link: '/lens-brands', icon: '🔬' },
          { title: 'إدارة الموظفين',    desc: 'إضافة موظفين وتحديد صلاحياتهم', link: '/employees',   icon: '👥' },
          { title: 'المصروفات',         desc: 'تسجيل المصروفات التشغيلية',      link: '/expenses',    icon: '💸' },
        ].map(({ title, desc, link, icon }) => (
          <a key={title} href={link} className="card hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-300">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="font-bold text-gray-800">{title}</div>
            <div className="text-xs text-gray-400 mt-1">{desc}</div>
          </a>
        ))}
      </div>

      {/* معلومات النظام */}
      <div className="card bg-gray-50 border-0">
        <div className="flex items-center gap-3 mb-3">
          <Info size={18} className="text-gray-400"/>
          <h3 className="font-semibold text-gray-700">معلومات النظام</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between"><span>اسم النظام</span><span className="font-bold text-gray-700">ae Optics CRM</span></div>
          <div className="flex justify-between"><span>الإصدار</span><span className="font-mono font-bold text-gray-700">v1.0.0</span></div>
          <div className="flex justify-between"><span>قاعدة البيانات</span><span className="font-bold text-gray-700">Supabase PostgreSQL</span></div>
          <div className="flex justify-between"><span>الاستضافة</span><span className="font-bold text-gray-700">GitHub Pages</span></div>
        </div>
      </div>
    </div>
  )
}
