// ── Login — بالهوية البصرية الرسمية (متطلب #12) ──────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AELogoFull, BRAND } from '../components/AELogo'
import { Eye, EyeOff, LogIn, Phone, Mail, KeyRound } from 'lucide-react'
import { supabase, appUrl } from '../lib/supabase'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [mode, setMode]         = useState('email')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) { setError(error.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة'); setLoading(false) }
    else navigate('/')
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const phoneDigits = phone.replace(/\D/g, '')
    if (!phoneDigits) { setError('أدخل رقم الهاتف'); setLoading(false); return }
    const phoneEmail = `${phoneDigits}@ae-optics.internal`
    const { error } = await signIn(phoneEmail, password)
    if (error) { setError(error.message || 'رقم الهاتف أو كلمة المرور غير صحيحة'); setLoading(false) }
    else navigate('/')
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!email) { setError('أدخل بريدك الإلكتروني أولاً'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl('reset-password')
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ✅')
  }

  const handleGoogleLogin = async () => {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('') }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f4f3ee' }}>
      {/* يسار — هوية البراند */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 p-12"
        style={{ backgroundColor: BRAND.green }}>
        <AELogoFull width={320}/>
        <div className="mt-10 text-center">
          <h2 className="text-2xl font-extrabold" style={{ color: BRAND.cream }}>
            نظام إدارة متجر النظارات
          </h2>
          <p className="mt-3 text-sm opacity-60" style={{ color: BRAND.cream }}>
            إدارة الطلبات · المخزون · العملاء · الشحن
          </p>
        </div>
        {/* version badge */}
        <div className="mt-auto pt-8 text-xs font-mono opacity-30" style={{ color: BRAND.cream }}>
          ae Optics CRM v1.0.0
        </div>
      </div>

      {/* يمين — نموذج الدخول */}
      <div className="flex flex-col items-center justify-center w-full lg:w-[440px] flex-shrink-0 p-6 bg-white">

        {/* Logo للموبايل فقط */}
        <div className="lg:hidden mb-8">
          <AELogoFull width={200}/>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">مرحباً 👋</h1>
          <p className="text-sm text-gray-400 mb-7">سجّل دخولك للمتابعة</p>

          {mode === 'forgot' ? (
            <>
              <button onClick={() => { setMode('email'); setError(''); setSuccess('') }}
                className="flex items-center gap-1 text-sm font-semibold mb-5"
                style={{ color: BRAND.green }}>← رجوع</button>
              <h2 className="text-lg font-bold text-gray-900 mb-5">إعادة تعيين كلمة المرور</h2>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="label">البريد الإلكتروني</label>
                  <input type="email" className="input" placeholder="example@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"/>
                </div>
                {error   && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">⚠️ {error}</div>}
                {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">{success}</div>}
                <button type="submit" disabled={loading || !!success}
                  style={{ backgroundColor: BRAND.green }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60">
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <KeyRound size={16}/>}
                  إرسال رابط إعادة التعيين
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
                {[{ id:'email', label:'إيميل', icon: Mail }, { id:'phone', label:'هاتف', icon: Phone }].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => { setMode(id); setError('') }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all"
                    style={mode === id ? { backgroundColor: BRAND.green, color: BRAND.cream } : { color: '#888' }}>
                    <Icon size={15}/>{label}
                  </button>
                ))}
              </div>

              {/* Email */}
              {mode === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="label">البريد الإلكتروني</label>
                    <input type="email" className="input" placeholder="example@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} required dir="ltr"/>
                  </div>
                  <div>
                    <label className="label">كلمة المرور</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} className="input pe-10"
                        placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required dir="ltr"/>
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                    className="text-xs font-semibold hover:underline" style={{ color: BRAND.green }}>
                    نسيت كلمة المرور؟
                  </button>
                  {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">⚠️ {error}</div>}
                  <button type="submit" disabled={loading}
                    style={{ backgroundColor: BRAND.green }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base disabled:opacity-60">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <LogIn size={18}/>}
                    {loading ? 'جارٍ الدخول...' : 'دخول'}
                  </button>
                </form>
              )}

              {/* Phone */}
              {mode === 'phone' && (
                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  <div>
                    <label className="label">رقم الهاتف</label>
                    <input type="tel" className="input" placeholder="01xxxxxxxxx"
                      value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr"/>
                  </div>
                  <div>
                    <label className="label">كلمة المرور</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} className="input pe-10"
                        placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required dir="ltr"/>
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">⚠️ {error}</div>}
                  <button type="submit" disabled={loading}
                    style={{ backgroundColor: BRAND.green }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base disabled:opacity-60">
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <LogIn size={18}/>}
                    {loading ? 'جارٍ الدخول...' : 'دخول'}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-100"/>
                <span className="text-xs text-gray-400 font-semibold">أو</span>
                <div className="flex-1 h-px bg-gray-100"/>
              </div>

              {/* Google */}
              <button onClick={handleGoogleLogin} disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm font-semibold text-gray-700 disabled:opacity-60">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                تسجيل الدخول بـ Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
