import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AELogoFull, BRAND } from '../components/AELogo'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setHasSession(!!session)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setError(error.message || 'حدث خطأ أثناء تحديث كلمة المرور')
      return
    }

    setSuccess('تم تحديث كلمة المرور بنجاح ✅')
    setTimeout(() => navigate('/login', { replace: true }), 1200)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f3ee]">
        <div className="w-10 h-10 border-4 border-[#13281D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f4f3ee' }}>
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 p-12" style={{ backgroundColor: BRAND.green }}>
        <AELogoFull width={320} />
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-extrabold" style={{ color: BRAND.cream }}>إعادة تعيين كلمة المرور</h2>
          <p className="mt-3 text-sm opacity-60" style={{ color: BRAND.cream }}>AE Optics CRM</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full lg:w-[440px] flex-shrink-0 p-6 bg-white">
        <div className="lg:hidden mb-8"><AELogoFull width={200} /></div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-gray-400 mb-7">
            أدخل كلمة المرور الجديدة للحساب.
          </p>

          {!hasSession && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm px-4 py-3 rounded-xl mb-4">
              إذا لم يتم فتح الصفحة من رابط الاستعادة، ارجع إلى صفحة الدخول وأرسل رابط إعادة التعيين مرة أخرى.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pe-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div>
              <label className="label">تأكيد كلمة المرور</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">⚠️ {error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100">{success}</div>}

            <button
              type="submit"
              disabled={saving || !!success}
              style={{ backgroundColor: BRAND.green }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base disabled:opacity-60"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <KeyRound size={18}/>}
              {saving ? 'جارٍ الحفظ...' : 'تحديث كلمة المرور'}
            </button>
          </form>

          <button onClick={() => navigate('/login', { replace: true })} className="mt-4 text-xs font-semibold hover:underline" style={{ color: BRAND.green }}>
            ← العودة إلى تسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  )
}
