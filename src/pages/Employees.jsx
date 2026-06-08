// ── إدارة الموظفين بصلاحيات مستقلة (متطلب #7) ─────────────────────
import { useState, useEffect } from 'react'
import { supabase, ROLES, ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from '../lib/supabase'
import { Plus, Save, X, Users, Edit3, Trash2, Shield, CheckSquare, Square } from 'lucide-react'

function EmployeeForm({ employee, onClose, onSave }) {
  const isEdit = !!employee?.id
  const [f, setF] = useState({
    name: employee?.name || '',
    role: employee?.role || 'moderator',
    email: '',
    password: '',
    permissions: employee?.permissions || ROLE_DEFAULT_PERMISSIONS['moderator'],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const up = (k, v) => setF(p => ({ ...p, [k]: v }))

  // عند تغيير الدور، حمّل الصلاحيات الافتراضية (مع الإبقاء على إمكانية التعديل)
  const handleRoleChange = (role) => {
    setF(p => ({ ...p, role, permissions: ROLE_DEFAULT_PERMISSIONS[role] || [] }))
  }

  const togglePermission = (key) => {
    setF(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key]
    }))
  }

  const handleSave = async () => {
    if (!f.name || !f.role) return
    setSaving(true); setError('')

    if (!isEdit) {
      if (!f.email || !f.password) { setError('الإيميل وكلمة المرور مطلوبين'); setSaving(false); return }
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email: f.email, password: f.password })
      if (authErr) { setError(authErr.message); setSaving(false); return }
      const { error: empErr } = await supabase.from('employees').insert({
        user_id: authData.user.id,
        name: f.name,
        role: f.role,
        permissions: f.permissions,
      })
      if (empErr) { setError(empErr.message); setSaving(false); return }
      await supabase.rpc('confirm_user_by_email', { p_email: f.email }).catch(() => {})
    } else {
      const { error: err } = await supabase.from('employees')
        .update({ name: f.name, role: f.role, permissions: f.permissions })
        .eq('id', employee.id)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false); onSave()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'تعديل موظف' : 'إضافة موظف'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="label">اسم الموظف</label>
            <input className="input" value={f.name} onChange={e => up('name', e.target.value)} placeholder="الاسم الكامل"/>
          </div>
          <div>
            <label className="label">المسمى الوظيفي</label>
            <select className="select" value={f.role} onChange={e => handleRoleChange(e.target.value)}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* الصلاحيات المستقلة */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">الصلاحيات</label>
              <div className="flex gap-2">
                <button onClick={() => setF(p => ({ ...p, permissions: ALL_PERMISSIONS.map(p => p.key) }))}
                  className="text-xs text-blue-600 hover:underline">تحديد الكل</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setF(p => ({ ...p, permissions: [] }))}
                  className="text-xs text-red-500 hover:underline">إلغاء الكل</button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1.5 transition-colors">
                  <button type="button" onClick={() => togglePermission(key)} className="flex-shrink-0 text-blue-600">
                    {f.permissions.includes(key) ? <CheckSquare size={16}/> : <Square size={16} className="text-gray-300"/>}
                  </button>
                  <span className="text-xs text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{f.permissions.length} / {ALL_PERMISSIONS.length} صلاحية محددة</p>
          </div>

          {!isEdit && <>
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input type="email" className="input" value={f.email} onChange={e => up('email', e.target.value)} dir="ltr" placeholder="email@example.com"/>
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <input type="password" className="input" value={f.password} onChange={e => up('password', e.target.value)} placeholder="على الأقل 6 أحرف"/>
            </div>
          </>}
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={15}/>}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [viewPerms, setViewPerms] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('created_at')
    setEmployees(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleActive = async (emp) => {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id)
    load()
  }

  const deleteEmp = async (id) => {
    if (!window.confirm('حذف هذا الموظف؟')) return
    await supabase.from('employees').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">إدارة الموظفين</h1>
          <p className="text-sm text-gray-400 mt-0.5">{employees.length} موظف</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowForm(true) }} className="btn-primary">
          <Plus size={16}/> إضافة موظف
        </button>
      </div>

      {/* دليل الأدوار */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k} className="card !p-3">
            <span className={`badge ${v.color} mb-1.5 block w-fit`}>{v.label}</span>
            <p className="text-xs text-gray-400">
              {(ROLE_DEFAULT_PERMISSIONS[k] || []).length} صلاحية افتراضية
            </p>
          </div>
        ))}
      </div>

      {/* جدول الموظفين */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-200"/>
            <p className="text-sm text-gray-400">لا يوجد موظفون بعد</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {['الاسم', 'المسمى', 'الصلاحيات', 'الحالة', 'تاريخ الإضافة', 'إجراءات'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const role = ROLES[emp.role]
                const perms = emp.permissions || []
                return (
                  <tr key={emp.id} className="table-row group">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          {emp.name?.[0]}
                        </div>
                        <span className="font-semibold text-gray-800">{emp.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${role?.color || 'pill-gray'}`}>{role?.label || emp.role}</span>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => setViewPerms(viewPerms === emp.id ? null : emp.id)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Shield size={12}/>
                        {perms.length} صلاحية
                      </button>
                      {viewPerms === emp.id && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {ALL_PERMISSIONS.map(({ key, label }) => (
                              <span key={key} className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                                perms.includes(key) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300 line-through'
                              }`}>{label}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${emp.is_active ? 'pill-green' : 'pill-gray'}`}>
                        {emp.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">
                      {new Date(emp.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditEmp(emp); setShowForm(true) }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit3 size={14}/></button>
                        <button onClick={() => toggleActive(emp)}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500"><Shield size={14}/></button>
                        <button onClick={() => deleteEmp(emp.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <EmployeeForm employee={editEmp}
          onClose={() => { setShowForm(false); setEditEmp(null) }}
          onSave={() => { setShowForm(false); setEditEmp(null); load() }}
        />
      )}
    </div>
  )
}
