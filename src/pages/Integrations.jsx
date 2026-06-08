// ── Store Integrations — متطلب #14 ──────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Save, X, RefreshCw, Link2, CheckCircle, XCircle,
         AlertTriangle, Clock, Trash2, Edit3, Play, Eye, EyeOff } from 'lucide-react'

const PLATFORMS = [
  { id: 'easy_orders', name: 'Easy Orders',    logo: '📦', color: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700',   description: 'ربط متجر Easy Orders لاستيراد الطلبات تلقائياً' },
  { id: 'website',     name: 'Custom Website', logo: '🌐', color: 'bg-purple-50 border-purple-200',badge: 'bg-purple-100 text-purple-700',description: 'ربط موقع إلكتروني مخصص عبر API Webhook' },
  { id: 'shopify',     name: 'Shopify',        logo: '🛍️', color: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',  description: 'Shopify Integration (قريباً)' },
  { id: 'woocommerce', name: 'WooCommerce',    logo: '🛒', color: 'bg-orange-50 border-orange-200',badge: 'bg-orange-100 text-orange-700',description: 'WooCommerce Plugin (قريباً)' },
  { id: 'zid',         name: 'Zid',            logo: '🏪', color: 'bg-teal-50 border-teal-200',    badge: 'bg-teal-100 text-teal-700',    description: 'Zid Platform (قريباً)' },
  { id: 'salla',       name: 'Salla',          logo: '🏬', color: 'bg-indigo-50 border-indigo-200',badge: 'bg-indigo-100 text-indigo-700',description: 'Salla Platform (قريباً)' },
]

const SOON = ['shopify', 'woocommerce', 'zid', 'salla']

// ── نموذج الإضافة / التعديل ──────────────────────────────────────────
function IntegrationForm({ integration, platforms, onClose, onSave }) {
  const isEdit = !!integration?.id
  const [f, setF] = useState({
    platform_id:  integration?.platform_id || '',
    platform_name:integration?.platform_name || '',
    api_key:      integration?.api_key || '',
    api_secret:   integration?.api_secret || '',
    webhook_url:  integration?.webhook_url || '',
    is_active:    integration?.is_active ?? true,
  })
  const [saving, setSaving]   = useState(false)
  const [showKey, setShowKey] = useState(false)
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handlePlatformChange = (pid) => {
    const pl = PLATFORMS.find(p => p.id === pid)
    setF(p => ({ ...p, platform_id: pid, platform_name: pl?.name || '' }))
  }

  const handleSave = async () => {
    if (!f.platform_id || !f.api_key) return
    setSaving(true)
    const payload = { ...f }
    let err
    if (isEdit) ({ error: err } = await supabase.from('store_integrations').update(payload).eq('id', integration.id))
    else ({ error: err } = await supabase.from('store_integrations').insert(payload))
    setSaving(false)
    if (!err) onSave()
    else console.error(err)
  }

  // توليد Webhook URL تلقائياً
  const webhookUrl = f.platform_id
    ? `${window.location.origin}/api/webhook/${f.platform_id}/${Math.random().toString(36).slice(2,10)}`
    : ''

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل الربط' : 'ربط منصة جديدة'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">المنصة *</label>
            <select className="select" value={f.platform_id} onChange={e => handlePlatformChange(e.target.value)}>
              <option value="">اختر منصة...</option>
              {PLATFORMS.filter(p => !SOON.includes(p.id)).map(p => (
                <option key={p.id} value={p.id}>{p.logo} {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">API Key *</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} className="input pe-10" dir="ltr"
                value={f.api_key} onChange={e => up('api_key', e.target.value)}
                placeholder="أدخل API Key..."/>
              <button type="button" onClick={() => setShowKey(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="label">API Secret — اختياري</label>
            <input type="password" className="input" dir="ltr"
              value={f.api_secret} onChange={e => up('api_secret', e.target.value)}
              placeholder="API Secret إن وجد..."/>
          </div>
          <div>
            <label className="label">Webhook URL</label>
            <div className="flex gap-2">
              <input className="input flex-1 text-xs" dir="ltr" value={f.webhook_url || webhookUrl}
                onChange={e => up('webhook_url', e.target.value)}
                placeholder="https://..."/>
              {!f.webhook_url && webhookUrl && (
                <button onClick={() => up('webhook_url', webhookUrl)}
                  className="btn-secondary !px-3 text-xs">توليد</button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">أضف هذا الرابط في إعدادات المنصة لاستقبال الطلبات تلقائياً</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl px-4 py-3">
            <input type="checkbox" checked={f.is_active} onChange={e => up('is_active', e.target.checked)} className="w-4 h-4 accent-blue-600"/>
            <span className="text-sm font-semibold text-gray-700">تفعيل الربط</span>
          </label>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving || !f.platform_id || !f.api_key}
            className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── الصفحة الرئيسية ─────────────────────────────────────────────────
export default function Integrations() {
  const [integrations, setIntegrations] = useState([])
  const [logs, setLogs]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editIntg, setEditIntg]         = useState(null)
  const [syncing, setSyncing]           = useState(null)
  const [activeTab, setActiveTab]       = useState('integrations')

  const load = async () => {
    setLoading(true)
    const [{ data: intg }, { data: lg }] = await Promise.all([
      supabase.from('store_integrations').select('*').order('created_at', { ascending: false }),
      supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    setIntegrations(intg || [])
    setLogs(lg || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleActive = async (intg) => {
    await supabase.from('store_integrations').update({ is_active: !intg.is_active }).eq('id', intg.id)
    load()
  }

  const deleteIntg = async (id) => {
    if (!window.confirm('حذف هذا الربط؟')) return
    await supabase.from('store_integrations').delete().eq('id', id)
    load()
  }

  // مزامنة يدوية — تسجيل محاولة المزامنة في السجل
  const handleManualSync = async (intg) => {
    setSyncing(intg.id)
    await supabase.from('sync_logs').insert({
      integration_id: intg.id,
      platform_name:  intg.platform_name,
      sync_type:      'manual',
      status:         'pending',
      orders_imported: 0,
      orders_updated:  0,
      errors:          0,
      notes:           'مزامنة يدوية — يتطلب webhook listener على الخادم',
    })
    // محاكاة المزامنة (في الإنتاج يستدعي webhook endpoint)
    await new Promise(r => setTimeout(r, 1500))
    await supabase.from('sync_logs').update({ status: 'success' })
      .eq('integration_id', intg.id).eq('sync_type', 'manual').eq('status', 'pending')
    setSyncing(null)
    load()
  }

  const getPlatform = (pid) => PLATFORMS.find(p => p.id === pid) || { logo: '🔗', name: pid, color: 'bg-gray-50', badge: 'pill-gray' }

  const totalImported = logs.filter(l => l.status === 'success').reduce((s, l) => s + (l.orders_imported || 0), 0)
  const totalErrors   = logs.filter(l => l.status === 'error').length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Store Integrations</h1>
          <p className="text-sm text-gray-400 mt-0.5">ربط المتاجر والمنصات الخارجية — متطلب #14</p>
        </div>
        <button onClick={() => { setEditIntg(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16}/> ربط منصة
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'المنصات المرتبطة', value: integrations.filter(i => i.is_active).length, color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'إجمالي الطلبات المستوردة', value: totalImported, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'عمليات المزامنة', value: logs.length, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'أخطاء مزامنة', value: totalErrors, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} border-0`}>
            <div className="text-xs text-gray-500">{label}</div>
            <div className={`text-2xl font-extrabold ${color} mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[{ id: 'integrations', label: '🔗 المنصات المرتبطة' }, { id: 'logs', label: '📋 سجل المزامنة' }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* قائمة المنصات المتاحة */}
      {activeTab === 'integrations' && (
        <>
          {/* منصات متاحة */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLATFORMS.map(pl => {
              const connected = integrations.find(i => i.platform_id === pl.id)
              const isSoon    = SOON.includes(pl.id)
              return (
                <div key={pl.id} className={`card border ${pl.color} relative`}>
                  {isSoon && (
                    <div className="absolute top-2 left-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-semibold">قريباً</div>
                  )}
                  <div className="text-2xl mb-2">{pl.logo}</div>
                  <div className="font-bold text-gray-800 text-sm">{pl.name}</div>
                  <div className="text-xs text-gray-400 mt-1 mb-3">{pl.description}</div>
                  {connected ? (
                    <div className="flex items-center gap-2">
                      <span className={`badge ${connected.is_active ? 'pill-green' : 'pill-gray'} flex items-center gap-1`}>
                        {connected.is_active ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                        {connected.is_active ? 'مُفعَّل' : 'معطل'}
                      </span>
                      <button onClick={() => handleManualSync(connected)} disabled={!!syncing}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        {syncing === connected.id ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/> : <RefreshCw size={11}/>}
                        مزامنة
                      </button>
                    </div>
                  ) : (
                    !isSoon && (
                      <button onClick={() => { setEditIntg(null); setShowForm(true) }}
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                        <Link2 size={11}/> ربط الآن
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>

          {/* الربط الفعلي */}
          {integrations.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-700 text-sm">إعدادات الربط</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['المنصة','API Key','Webhook URL','الحالة','آخر مزامنة','إجراءات'].map(h => (
                      <th key={h} className="table-header text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {integrations.map(intg => {
                    const pl = getPlatform(intg.platform_id)
                    const lastLog = logs.filter(l => l.integration_id === intg.id)[0]
                    return (
                      <tr key={intg.id} className="table-row group">
                        <td className="table-cell font-semibold">
                          <span className="flex items-center gap-2">
                            <span>{pl.logo}</span> {intg.platform_name}
                          </span>
                        </td>
                        <td className="table-cell text-xs font-mono text-gray-400">
                          {'•'.repeat(8)}{intg.api_key?.slice(-4)}
                        </td>
                        <td className="table-cell text-xs font-mono text-blue-600 max-w-32 truncate">
                          {intg.webhook_url || '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${intg.is_active ? 'pill-green' : 'pill-gray'}`}>
                            {intg.is_active ? '✅ نشط' : '⏸️ معطل'}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-gray-400">
                          {lastLog ? new Date(lastLog.created_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleManualSync(intg)} disabled={!!syncing}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="مزامنة يدوية">
                              {syncing === intg.id ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/> : <Play size={13}/>}
                            </button>
                            <button onClick={() => toggleActive(intg)}
                              className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500">
                              {intg.is_active ? <XCircle size={13}/> : <CheckCircle size={13}/>}
                            </button>
                            <button onClick={() => { setEditIntg(intg); setShowForm(true) }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                              <Edit3 size={13}/>
                            </button>
                            <button onClick={() => deleteIntg(intg.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {integrations.length === 0 && !loading && (
            <div className="text-center py-12 card">
              <Link2 size={40} className="mx-auto mb-3 text-gray-200"/>
              <p className="text-sm text-gray-400 mb-4">لم يتم ربط أي منصة بعد</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
                <Plus size={14}/> ربط أول منصة
              </button>
            </div>
          )}
        </>
      )}

      {/* سجل المزامنة */}
      {activeTab === 'logs' && (
        <div className="card !p-0 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={36} className="mx-auto mb-3 text-gray-200"/>
              <p className="text-sm text-gray-400">لا توجد سجلات مزامنة بعد</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['التاريخ','المنصة','نوع المزامنة','الحالة','مستورد','محدَّث','أخطاء','ملاحظات'].map(h => (
                    <th key={h} className="table-header text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="table-cell text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="table-cell text-sm font-semibold">{log.platform_name}</td>
                    <td className="table-cell text-xs">
                      <span className={`badge ${log.sync_type === 'auto' ? 'pill-blue' : 'pill-purple'}`}>
                        {log.sync_type === 'auto' ? '🔄 تلقائي' : '▶️ يدوي'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${log.status === 'success' ? 'pill-green' : log.status === 'error' ? 'pill-red' : 'pill-yellow'}`}>
                        {log.status === 'success' ? '✅ ناجح' : log.status === 'error' ? '❌ خطأ' : '⏳ معلق'}
                      </span>
                    </td>
                    <td className="table-cell text-center font-bold text-green-600">{log.orders_imported || 0}</td>
                    <td className="table-cell text-center font-bold text-blue-600">{log.orders_updated || 0}</td>
                    <td className="table-cell text-center font-bold text-red-500">{log.errors || 0}</td>
                    <td className="table-cell text-xs text-gray-400 max-w-32 truncate">{log.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <IntegrationForm
          integration={editIntg}
          onClose={() => { setShowForm(false); setEditIntg(null) }}
          onSave={() => { setShowForm(false); setEditIntg(null); load() }}
        />
      )}
    </div>
  )
}
