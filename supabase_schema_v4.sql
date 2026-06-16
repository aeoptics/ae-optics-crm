-- ============================================================
-- ae Optics CRM v1.0.0 — Full Schema (Run in Supabase SQL Editor)
-- يشمل جميع التعديلات من المتطلبات 1-10
-- ============================================================

-- ── Helper: touch_updated_at ─────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── 1. جدول العملاء ──────────────────────────────────────────────────
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  phone      text unique not null,
  name       text not null,
  email      text,
  notes      text,
  rating     text default 'متوسط',   -- ممتاز / متوسط / منخفض
  can_reorder text default 'نعم',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function touch_updated_at();
alter table customers enable row level security;
drop policy if exists "auth_all_customers" on customers;
create policy "auth_all_customers" on customers for all using (auth.role() = 'authenticated');

-- ── 2. جدول الوصفات الطبية ───────────────────────────────────────────
create table if not exists prescriptions (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  order_id    uuid,
  sph_od numeric(5,2), cyl_od numeric(5,2), axis_od integer,
  sph_os numeric(5,2), cyl_os numeric(5,2), axis_os integer,
  pd numeric(5,1), pd_right numeric(5,1), pd_left numeric(5,1),
  add_power numeric(5,2),
  prescription_image_url text,
  notes text,
  created_at timestamptz default now()
);
alter table prescriptions enable row level security;
drop policy if exists "auth_all_prescriptions" on prescriptions;
create policy "auth_all_prescriptions" on prescriptions for all using (auth.role() = 'authenticated');

-- ── 3. شركات الشحن ───────────────────────────────────────────────────
create table if not exists shipping_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  is_active  boolean default true,
  notes      text,
  created_at timestamptz default now()
);
create table if not exists shipping_rates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references shipping_companies(id) on delete cascade,
  governorate  text not null,
  customer_price numeric(10,2) default 0,
  store_cost     numeric(10,2) default 0,
  unique(company_id, governorate)
);
alter table shipping_companies enable row level security;
alter table shipping_rates enable row level security;
drop policy if exists "auth_all_shipping_cos" on shipping_companies;
drop policy if exists "auth_all_shipping_rates" on shipping_rates;
create policy "auth_all_shipping_cos" on shipping_companies for all using (auth.role() = 'authenticated');
create policy "auth_all_shipping_rates" on shipping_rates for all using (auth.role() = 'authenticated');

insert into shipping_companies (name) values
  ('Bosta'), ('Aramex'), ('Mylerz'), ('Courier'), ('Internal Delivery')
on conflict (name) do nothing;

-- ── 4. المخزون (Frames) — بدون qty/color/size هنا، تنتقل لـ Variants ─
create table if not exists inventory (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text,        -- طبية / شمس
  gender     text,        -- رجالي / نسائي / أطفال
  frame_type text,        -- Full Frame / Half Frame / Rimless (يُستخدم لتكلفة المصنعية)
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists trg_inventory_updated on inventory;
create trigger trg_inventory_updated before update on inventory
  for each row execute function touch_updated_at();
alter table inventory enable row level security;
drop policy if exists "auth_all_inventory" on inventory;
create policy "auth_all_inventory" on inventory for all using (auth.role() = 'authenticated');

-- ── 5. Variants للمنتجات (متطلب #6) ─────────────────────────────────
create table if not exists inventory_variants (
  id           uuid primary key default gen_random_uuid(),
  frame_id     uuid references inventory(id) on delete cascade,
  sku          text,
  color        text,
  size         text,
  qty_total    integer default 0,
  qty_reserved integer default 0,
  qty_available integer generated always as (qty_total - qty_reserved) stored,
  cost_price   numeric(10,2) default 0,
  sell_price   numeric(10,2) default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
drop trigger if exists trg_inv_variants_updated on inventory_variants;
create trigger trg_inv_variants_updated before update on inventory_variants
  for each row execute function touch_updated_at();
alter table inventory_variants enable row level security;
drop policy if exists "auth_all_inv_variants" on inventory_variants;
create policy "auth_all_inv_variants" on inventory_variants for all using (auth.role() = 'authenticated');

-- ── 6. شركات العدسات + Variants (متطلب #5) ───────────────────────────
create table if not exists lens_brands (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz default now()
);
create table if not exists lens_variants (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references lens_brands(id) on delete cascade,
  name        text not null,
  cost_price  numeric(10,2) default 0,
  sell_price  numeric(10,2) default 0,
  manuf_cost  numeric(10,2) default 0,   -- مصنعية خاصة (اختياري)
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
drop trigger if exists trg_lens_variants_updated on lens_variants;
create trigger trg_lens_variants_updated before update on lens_variants
  for each row execute function touch_updated_at();
alter table lens_brands enable row level security;
alter table lens_variants enable row level security;
drop policy if exists "auth_all_lens_brands" on lens_brands;
drop policy if exists "auth_all_lens_variants" on lens_variants;
create policy "auth_all_lens_brands" on lens_brands for all using (auth.role() = 'authenticated');
create policy "auth_all_lens_variants" on lens_variants for all using (auth.role() = 'authenticated');

-- بيانات أولية لشركات العدسات
insert into lens_brands (name) values
  ('Zeiss'), ('Kodak'), ('Hoya'), ('Essilor'), ('Pixel')
on conflict (name) do nothing;

-- ── 7. تكلفة المصنعية (Workshop Labor Cost — متطلب #8) ───────────────
create table if not exists pricing_settings (
  id          uuid primary key default gen_random_uuid(),
  frame_type  text unique not null,
  manuf_cost  numeric(10,2) default 0,
  updated_at  timestamptz default now()
);
insert into pricing_settings (frame_type, manuf_cost) values
  ('Full Frame', 0), ('Half Frame', 0), ('Rimless', 0)
on conflict (frame_type) do nothing;
alter table pricing_settings enable row level security;
drop policy if exists "auth_all_pricing" on pricing_settings;
create policy "auth_all_pricing" on pricing_settings for all using (auth.role() = 'authenticated');

-- ── 8. الطلبات (Orders) ───────────────────────────────────────────────
create sequence if not exists order_seq start 1;

create table if not exists orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text unique,
  order_date               date default current_date,

  -- بيانات العميل (مُخزّنة لحماية البيانات التاريخية — متطلب #9)
  customer_id              uuid references customers(id),
  customer_name            text,
  customer_phone           text,

  -- نوع المنتج
  product_type             text default 'نظارات طبية',
  glasses_type             text,
  frame_name               text,
  frame_type               text,     -- Full Frame / Half Frame / Rimless
  lens_type                text,

  -- مصادر مبسطة (متطلب #3)
  source                   text,     -- Website/WhatsApp/Messenger/TikTok/Referral/Repeat Customer
  lead_source_detail       text,

  -- الأسعار (مُثبَّتة وقت الإنشاء — متطلب #9)
  order_value              numeric(10,2) default 0,
  shipping_value           numeric(10,2) default 0,  -- الشحن على العميل
  discount                 numeric(10,2) default 0,
  discount_type            text default 'نقدي',
  discount_percent         numeric(5,2) default 0,
  total_final              numeric(10,2) generated always as
                             (order_value + coalesce(shipping_value,0) - coalesce(discount,0)) stored,

  -- الشحن
  shipping_company_id      uuid references shipping_companies(id),
  governorate              text,
  shipping_type            text default 'عادي',
  customer_shipping_price  numeric(10,2) default 0,
  store_shipping_cost      numeric(10,2) default 0,
  shipping_date            date,
  tracking_number          text,
  expected_delivery        date,
  actual_delivery          date,
  delivery_result          text,
  refusal_reason           text,

  -- الورشة (تسجيل تلقائي — متطلب #2)
  needs_workshop           boolean,
  workshop_sent_date       date,
  workshop_sent_at         timestamptz,   -- الوقت الدقيق للإرسال
  workshop_return_date     date,
  workshop_return_at       timestamptz,   -- الوقت الدقيق للعودة

  -- الحالة
  confirmed                boolean default false,
  status                   text default 'Pending Confirmation',
  payment_status           text default 'عند الاستلام',

  -- التكاليف المُثبَّتة (متطلب #9)
  frame_cost               numeric(10,2) default 0,
  lens_cost                numeric(10,2) default 0,
  contact_lens_cost        numeric(10,2) default 0,
  manuf_cost               numeric(10,2) default 0,
  actual_shipping_cost     numeric(10,2) default 0,
  total_cost               numeric(10,2),
  actual_profit            numeric(10,2),
  profit_margin            numeric(5,4),

  -- العدسات اللاصقة
  contact_lens_brand       text,
  contact_lens_type        text,
  contact_lens_power_od    numeric(5,2),
  contact_lens_power_os    numeric(5,2),
  contact_lens_bc          numeric(4,2),
  contact_lens_diameter    numeric(4,2),
  contact_lens_quantity    integer,

  -- الوصفة
  prescription_id          uuid references prescriptions(id),

  -- متفرقات
  assigned_to              text,
  notes                    text,
  first_status             text,

  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Auto order number
create or replace function set_order_number()
returns trigger language plpgsql as $$
begin
  if new.order_number is null then
    new.order_number := 'ORD-' || to_char(nextval('order_seq'), 'FM0000');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_order_number on orders;
create trigger trg_order_number before insert on orders
  for each row execute function set_order_number();
drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function touch_updated_at();

alter table orders enable row level security;
drop policy if exists "auth_all_orders" on orders;
create policy "auth_all_orders" on orders for all using (auth.role() = 'authenticated');

-- ── 9. الموظفون + الصلاحيات المستقلة (متطلب #7) ─────────────────────
create table if not exists employees (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade unique,
  name        text not null,
  role        text not null default 'moderator',
  permissions text[] default '{}',   -- مصفوفة الصلاحيات المستقلة
  is_active   boolean default true,
  created_at  timestamptz default now()
);
alter table employees enable row level security;
drop policy if exists "auth_all_employees" on employees;
create policy "auth_all_employees" on employees for all using (auth.role() = 'authenticated');

-- ── 10. الورشة ────────────────────────────────────────────────────────
create table if not exists workshop_accounts (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id) on delete cascade,
  order_number  text,
  customer_name text,
  frame_type    text,
  manuf_cost    numeric(10,2) default 0,
  paid          text default 'لا',
  amount_paid   numeric(10,2) default 0,
  amount_remaining numeric(10,2) generated always as
    (greatest(coalesce(manuf_cost,0) - coalesce(amount_paid,0), 0)) stored,
  sent_date     date,
  received_date date,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table workshop_accounts enable row level security;
drop policy if exists "auth_all_workshop" on workshop_accounts;
create policy "auth_all_workshop" on workshop_accounts for all using (auth.role() = 'authenticated');

-- ── 11. المصروفات ─────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date default current_date,
  category    text not null,
  amount      numeric(10,2) not null,
  description text,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);
alter table expenses enable row level security;
drop policy if exists "auth_all_expenses" on expenses;
create policy "auth_all_expenses" on expenses for all using (auth.role() = 'authenticated');

-- ── 12. دالة get_or_create_customer ──────────────────────────────────
create or replace function get_or_create_customer(p_phone text, p_name text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from customers where phone = p_phone;
  if v_id is null then
    insert into customers (phone, name) values (p_phone, p_name) returning id into v_id;
  else
    update customers set name = p_name, updated_at = now() where id = v_id;
  end if;
  return v_id;
end;
$$;

-- ── 12b. دالة تأكيد المستخدم بالبريد (للإداريين الجدد) ───────────────
create or replace function confirm_user_by_email(p_email text)
returns void language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
  set email_confirmed_at = now(),
      updated_at = now()
  where lower(email) = lower(p_email);
end;
$$;

grant execute on function confirm_user_by_email(text) to authenticated;

-- ── 13. Indexes ──────────────────────────────────────────────────────
create index if not exists idx_orders_customer_id    on orders(customer_id);
create index if not exists idx_orders_status         on orders(status);
create index if not exists idx_orders_created_at     on orders(created_at desc);
create index if not exists idx_prescriptions_cust    on prescriptions(customer_id);
create index if not exists idx_customers_phone       on customers(phone);
create index if not exists idx_expenses_date         on expenses(date);
create index if not exists idx_shipping_rates_co     on shipping_rates(company_id);
create index if not exists idx_inv_variants_frame    on inventory_variants(frame_id);
create index if not exists idx_lens_variants_brand   on lens_variants(brand_id);

-- ── 14. View: customer_archive ────────────────────────────────────────
create or replace view customer_archive as
select
  o.customer_phone,
  o.customer_name,
  max(o.order_date)     as last_order_date,
  max(o.order_number)   as last_order_number,
  count(*)              as total_orders,
  sum(o.total_final)    as total_spent,
  sum(o.actual_profit)  as total_profit,
  count(*) filter (where o.status = 'Delivered') as delivered_count,
  count(*) filter (where o.status in ('Returned','Refused on Delivery')) as returned_count
from orders o
group by o.customer_phone, o.customer_name;

-- ── 15. بيانات المحافظات لشركات الشحن ────────────────────────────────
do $$
declare
  gov text[] := array[
    'القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية',
    'البحيرة','الغربية','المنوفية','القليوبية','الفيوم','بني سويف',
    'المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر',
    'مطروح','شمال سيناء','جنوب سيناء','الإسماعيلية','السويس','بور سعيد',
    'كفر الشيخ','دمياط'
  ];
  comp record;
  g text;
begin
  for comp in select id from shipping_companies loop
    foreach g in array gov loop
      insert into shipping_rates (company_id, governorate, customer_price, store_cost)
      values (comp.id, g, 0, 0)
      on conflict (company_id, governorate) do nothing;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- ✅ الانتهاء — ae Optics CRM v1.0.0
-- ============================================================

-- ============================================================
-- إضافات متطلبات #14 و #15 و #17
-- ============================================================

-- ── Store Integrations (متطلب #14) ───────────────────────────────────
create table if not exists store_integrations (
  id            uuid primary key default gen_random_uuid(),
  platform_id   text not null,
  platform_name text not null,
  api_key       text,
  api_secret    text,
  webhook_url   text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table store_integrations enable row level security;
drop policy if exists "auth_all_integrations" on store_integrations;
create policy "auth_all_integrations" on store_integrations for all using (auth.role() = 'authenticated');

-- ── Sync Logs (متطلب #14) ────────────────────────────────────────────
create table if not exists sync_logs (
  id              uuid primary key default gen_random_uuid(),
  integration_id  uuid references store_integrations(id) on delete cascade,
  platform_name   text,
  sync_type       text default 'auto',   -- auto | manual
  status          text default 'pending', -- pending | success | error
  orders_imported integer default 0,
  orders_updated  integer default 0,
  errors          integer default 0,
  notes           text,
  created_at      timestamptz default now()
);
alter table sync_logs enable row level security;
drop policy if exists "auth_all_sync_logs" on sync_logs;
create policy "auth_all_sync_logs" on sync_logs for all using (auth.role() = 'authenticated');

-- ── Returns — المرتجعات (متطلب #15) ──────────────────────────────────
create table if not exists returns (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references orders(id),
  order_number         text,
  customer_name        text,
  customer_phone       text,
  return_date          date default current_date,
  reason               text,
  product_condition    text,   -- سليم / تالف
  return_to_inventory  boolean default false,
  shipping_paid_by     text,   -- العميل / المتجر
  shipping_cost        numeric(10,2) default 0,
  customer_paid_shipping numeric(10,2) default 0,
  product_cost         numeric(10,2) default 0,
  shipping_loss        numeric(10,2) default 0,
  product_loss         numeric(10,2) default 0,
  total_loss           numeric(10,2) default 0,
  notes                text,
  created_at           timestamptz default now()
);
alter table returns enable row level security;
drop policy if exists "auth_all_returns" on returns;
create policy "auth_all_returns" on returns for all using (auth.role() = 'authenticated');
create index if not exists idx_returns_order_id on returns(order_id);

-- ── Lost Shipments — الشحنات المفقودة (متطلب #17) ─────────────────
create table if not exists lost_shipments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references orders(id),
  order_number         text,
  customer_name        text,
  shipping_company_id  uuid references shipping_companies(id),
  shipping_company_name text,
  tracking_number      text,
  lost_date            date default current_date,
  order_value          numeric(10,2) default 0,
  product_cost         numeric(10,2) default 0,
  shipping_cost        numeric(10,2) default 0,
  total_loss           numeric(10,2) default 0,    -- product_cost + shipping_cost
  compensation_status  text default 'لم يتم التعويض', -- لم يتم / كامل / جزئي
  compensation_amount  numeric(10,2) default 0,
  compensation_date    date,
  compensation_ref     text,
  net_loss             numeric(10,2) default 0,    -- total_loss - compensation_amount
  is_compensated       boolean default false,
  notes                text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
alter table lost_shipments enable row level security;
drop policy if exists "auth_all_lost_shipments" on lost_shipments;
create policy "auth_all_lost_shipments" on lost_shipments for all using (auth.role() = 'authenticated');
create index if not exists idx_lost_company on lost_shipments(shipping_company_id);

-- إضافة حالة Lost Shipment لجدول الطلبات
-- (الحالات الجديدة تعمل بدون تعديل لأن status نص حر)
-- لكن نضيف view لتقرير شامل للخسائر

create or replace view losses_report as
select
  'مرتجع'::text as loss_type,
  r.return_date as date,
  r.order_number,
  r.customer_name,
  r.total_loss as net_loss,
  r.reason as notes
from returns r
union all
select
  'شحنة مفقودة'::text,
  ls.lost_date,
  ls.order_number,
  ls.customer_name,
  ls.net_loss,
  ls.compensation_status
from lost_shipments ls;

-- ============================================================
-- ✅ Schema كامل — ae Optics CRM v1.0.0 مع جميع المتطلبات
-- ============================================================

-- ============================================================
-- ae Optics CRM — Patch v4.1 (Required Modifications)
-- Run this patch in Supabase SQL Editor
-- ============================================================

-- ── 1. إضافة phone2 للعملاء (رقم الهاتف الاحتياطي) ───────────────────
alter table customers add column if not exists phone2 text;
create index if not exists idx_customers_phone2 on customers(phone2);

-- ── 2. إضافة حقول الدفع الجزئي للطلبات ───────────────────────────────
alter table orders add column if not exists amount_paid      numeric(10,2) default 0;
alter table orders add column if not exists amount_remaining numeric(10,2) generated always as
  (coalesce(total_final,0) - coalesce(amount_paid,0)) stored;

-- ── 3. إضافة ربط العدسات بالطلبات ────────────────────────────────────
alter table orders add column if not exists lens_brand_id   uuid references lens_brands(id);
alter table orders add column if not exists lens_variant_id uuid references lens_variants(id);

-- ── 4. إضافة ربط المخزون بالطلبات ────────────────────────────────────
alter table orders add column if not exists frame_id         uuid references inventory(id);
alter table orders add column if not exists frame_variant_id uuid references inventory_variants(id);

-- ── 5. دالة get_or_create_customer_v2 مع دعم phone2 ──────────────────
create or replace function get_or_create_customer_v2(
  p_phone  text,
  p_name   text,
  p_phone2 text default null
)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  -- البحث بالهاتف الأساسي أو الاحتياطي
  select id into v_id from customers
  where phone = p_phone or (p_phone2 is not null and phone2 = p_phone2)
  limit 1;

  if v_id is null then
    insert into customers (phone, name, phone2)
    values (p_phone, p_name, p_phone2)
    returning id into v_id;
  else
    update customers set
      name   = p_name,
      phone2 = coalesce(p_phone2, phone2),
      updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$;
grant execute on function get_or_create_customer_v2(text, text, text) to authenticated;

-- ── 6. إضافة qty_available مؤقتاً للـ inventory (للتوافق القديم) ──────
-- (inventory الأساسي لا يحتوي qty، الـ variants هي المصدر الحقيقي)
-- لكن نضيف view مساعدة
create or replace view inventory_with_qty as
select
  i.*,
  coalesce(sum(v.qty_available), 0) as total_qty_available,
  coalesce(sum(v.qty_total), 0)     as total_qty
from inventory i
left join inventory_variants v on v.frame_id = i.id
group by i.id;

-- ── 7. Indexes إضافية للأداء ──────────────────────────────────────────
create index if not exists idx_orders_lens_brand    on orders(lens_brand_id);
create index if not exists idx_orders_frame_id      on orders(frame_id);
create index if not exists idx_orders_payment       on orders(payment_status);

-- ============================================================
-- ✅ Patch v4.1 complete
-- ============================================================
