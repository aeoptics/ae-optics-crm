import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.warn('[ae Optics CRM] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'public-anon-key',
)

export const appUrl = (path = '') => {
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
  return new URL(String(path).replace(/^\/+/, ''), base).toString()
}

export const STATUS_COLORS = {
  'Pending Confirmation': { bg:'bg-amber-50',   text:'text-amber-800',   badge:'bg-amber-100 text-amber-800',   dot:'bg-amber-400',  label:'انتظار التأكيد' },
  'Confirmed':            { bg:'bg-teal-50',    text:'text-teal-800',    badge:'bg-teal-100 text-teal-700',     dot:'bg-teal-400',   label:'مؤكد' },
  'In Preparation':       { bg:'bg-yellow-50',  text:'text-yellow-800',  badge:'bg-yellow-100 text-yellow-800', dot:'bg-yellow-400', label:'تحت التجهيز' },
  'Sent to Workshop':     { bg:'bg-orange-50',  text:'text-orange-800',  badge:'bg-orange-100 text-orange-700', dot:'bg-orange-400', label:'في الورشة' },
  'Returned from Workshop':{ bg:'bg-orange-50', text:'text-orange-700',  badge:'bg-orange-50 text-orange-600',  dot:'bg-orange-300', label:'رجع من الورشة' },
  'Ready to Ship':        { bg:'bg-purple-50',  text:'text-purple-800',  badge:'bg-purple-100 text-purple-700', dot:'bg-purple-400', label:'جاهز للشحن' },
  'Shipped':              { bg:'bg-blue-50',    text:'text-blue-800',    badge:'bg-blue-100 text-blue-700',     dot:'bg-blue-400',   label:'تم الشحن' },
  'Delivered':            { bg:'bg-green-50',   text:'text-green-800',   badge:'bg-green-100 text-green-700',   dot:'bg-green-500',  label:'تم التسليم' },
  'Refused on Delivery':  { bg:'bg-red-50',     text:'text-red-800',     badge:'bg-red-100 text-red-700',       dot:'bg-red-500',    label:'مرفوض' },
  'Returned':             { bg:'bg-rose-50',    text:'text-rose-800',    badge:'bg-rose-100 text-rose-700',     dot:'bg-rose-400',   label:'مرتجع' },
  'Cancelled':            { bg:'bg-gray-50',    text:'text-gray-600',    badge:'bg-gray-100 text-gray-600',     dot:'bg-gray-400',   label:'ملغي' },
}

export const ALL_STATUSES = Object.keys(STATUS_COLORS)

export const PRODUCT_TYPES    = ['نظارات طبية', 'نظارات شمسية', 'عدسات لاصقة']
export const GLASSES_TYPES    = ['طبية رجالي','طبية نسائي','طبية أطفال','شمس رجالي','شمس نسائي','شمس أطفال']
export const LENS_TYPES       = ['Blue Cut','Photochromic','Anti Reflective','Progressive','عادية','لم يحدد']
export const FRAME_TYPES      = ['Full Frame','Half Frame','Rimless']
export const DELIVERY_RESULTS = ['تم التسليم','رفض الاستلام','غير متاح','مؤجل','مرتجع']
export const REFUSAL_REASONS  = ['العميل غير متاح','رفض الاستلام','العنوان غير صحيح','تأخير الشحن','مشكلة في المنتج','سبب آخر']
export const PAYMENT_STATUSES = ['مدفوع','عند الاستلام','جزئي','لم يتم']
export const SHIPPING_TYPES   = ['عادي','مجاني','استلام من الفرع']
export const DISCOUNT_TYPES   = ['نقدي','نسبة مئوية']
export const EXPENSE_CATEGORIES = ['مرتبات','إيجار','إعلانات','إنترنت','كهرباء','مشتريات','مصروفات أخرى']
export const CONTACT_LENS_TYPES = ['يومية','شهرية','سنوية','ملونة يومية','ملونة شهرية','طبية']

// ── مصادر الطلبات المبسطة (متطلب #3) ────────────────────────────────
export const SOURCES = [
  'Website',
  'WhatsApp',
  'Messenger',
  'TikTok',
  'Referral',
  'Repeat Customer',
]

export const GOVERNORATES = [
  'القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية','البحيرة','الغربية',
  'المنوفية','القليوبية','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا',
  'الأقصر','أسوان','البحر الأحمر','مطروح','شمال سيناء','جنوب سيناء',
  'الإسماعيلية','السويس','بور سعيد','كفر الشيخ','دمياط'
]

// ── الصلاحيات المستقلة (متطلب #7) ────────────────────────────────────
export const ALL_PERMISSIONS = [
  { key: 'add_order',          label: 'إضافة طلب' },
  { key: 'edit_order',         label: 'تعديل طلب' },
  { key: 'delete_order',       label: 'حذف طلب' },
  { key: 'change_status',      label: 'تغيير الحالة' },
  { key: 'view_profits',       label: 'عرض الأرباح' },
  { key: 'manage_products',    label: 'إدارة المنتجات' },
  { key: 'manage_customers',   label: 'إدارة العملاء' },
  { key: 'manage_inventory',   label: 'إدارة المخزون' },
  { key: 'manage_workshop',    label: 'إدارة الورشة' },
  { key: 'manage_expenses',    label: 'إدارة المصروفات' },
  { key: 'manage_shipping',    label: 'إدارة شركات الشحن' },
  { key: 'manage_lens_brands', label: 'إدارة شركات العدسات' },
  { key: 'manage_employees',   label: 'إدارة الموظفين' },
]

// الصلاحيات الافتراضية لكل دور
export const ROLE_DEFAULT_PERMISSIONS = {
  admin:       ALL_PERMISSIONS.map(p => p.key),
  call_center: ['add_order','change_status','manage_customers'],
  moderator:   ['add_order','edit_order','manage_customers'],
  operations:  ['change_status','manage_workshop','manage_inventory'],
  accountant:  ['view_profits','manage_expenses'],
}

export const ROLES = {
  admin:        { label: 'مدير النظام',  color: 'bg-purple-100 text-purple-700' },
  call_center:  { label: 'كول سنتر',    color: 'bg-blue-100 text-blue-700' },
  moderator:    { label: 'إدخال طلبات', color: 'bg-teal-100 text-teal-700' },
  operations:   { label: 'موظف تشغيل', color: 'bg-orange-100 text-orange-700' },
  accountant:   { label: 'محاسب',       color: 'bg-green-100 text-green-700' },
}

export const SHIPPING_COMPANIES = ['Bosta','Aramex','Mylerz','Courier','Internal Delivery']

export const fmt    = (n) => n == null ? '—' : Number(n).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ج'
export const fmtPct = (n) => n == null ? '—' : (Number(n) * 100).toFixed(1) + '%'
export const today  = () => new Date().toISOString().split('T')[0]
