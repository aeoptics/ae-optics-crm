-- ============================================================
-- ae Optics CRM — Patch v4.2: Order Items (Multi-Product Orders)
-- شغّل هذا الملف كاملاً في Supabase SQL Editor
-- ============================================================

-- ── 1. جدول عناصر الطلب (order_items) ───────────────────────────────
create table if not exists order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references orders(id) on delete cascade,

  -- المنتج
  product_type         text not null default 'نظارات طبية',
  glasses_type         text,
  frame_id             uuid references inventory(id),
  frame_name           text,
  frame_type           text,
  frame_variant_id     uuid references inventory_variants(id),
  frame_color          text,
  frame_size           text,
  qty                  integer not null default 1,

  -- العدسات
  lens_brand_id        uuid references lens_brands(id),
  lens_brand_name      text,
  lens_variant_id      uuid references lens_variants(id),
  lens_variant_name    text,

  -- العدسات اللاصقة
  contact_lens_brand   text,
  contact_lens_type    text,
  contact_lens_power_od numeric(5,2),
  contact_lens_power_os numeric(5,2),
  contact_lens_bc      numeric(4,2),
  contact_lens_diameter numeric(4,2),
  contact_lens_quantity integer,

  -- الوصفة الطبية
  prescription_id      uuid references prescriptions(id),
  presc_sph_od         numeric(5,2),
  presc_cyl_od         numeric(5,2),
  presc_axis_od        integer,
  presc_sph_os         numeric(5,2),
  presc_cyl_os         numeric(5,2),
  presc_axis_os        integer,
  presc_pd             numeric(5,2),
  presc_add            numeric(5,2),

  -- التسعير
  unit_price           numeric(10,2) not null default 0,   -- سعر الوحدة
  item_discount        numeric(10,2) default 0,            -- خصم على العنصر
  line_total           numeric(10,2) generated always as
                         (unit_price * qty - coalesce(item_discount,0)) stored,

  -- التكاليف
  frame_cost           numeric(10,2) default 0,
  lens_cost            numeric(10,2) default 0,
  contact_lens_cost    numeric(10,2) default 0,
  manuf_cost           numeric(10,2) default 0,
  item_total_cost      numeric(10,2) generated always as
                         (coalesce(frame_cost,0) + coalesce(lens_cost,0) +
                          coalesce(contact_lens_cost,0) + coalesce(manuf_cost,0)) stored,
  item_profit          numeric(10,2) generated always as
                         (unit_price * qty - coalesce(item_discount,0) -
                          coalesce(frame_cost,0) - coalesce(lens_cost,0) -
                          coalesce(contact_lens_cost,0) - coalesce(manuf_cost,0)) stored,

  -- ملاحظات
  notes                text,
  sort_order           integer default 0,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Trigger updated_at
drop trigger if exists trg_order_items_updated on order_items;
create trigger trg_order_items_updated before update on order_items
  for each row execute function touch_updated_at();

-- RLS
alter table order_items enable row level security;
drop policy if exists "auth_all_order_items" on order_items;
create policy "auth_all_order_items" on order_items
  for all using (auth.role() = 'authenticated');

-- Indexes
create index if not exists idx_order_items_order_id  on order_items(order_id);
create index if not exists idx_order_items_frame_id  on order_items(frame_id);
create index if not exists idx_order_items_lens_brand on order_items(lens_brand_id);

-- ── 2. إضافة حقل لتمييز الطلبات متعددة المنتجات ──────────────────────
alter table orders add column if not exists has_items    boolean default false;
alter table orders add column if not exists items_count  integer default 1;
alter table orders add column if not exists customer_phone2 text;

-- ── 3. View مدمجة للطلبات مع عناصرها ────────────────────────────────
create or replace view orders_with_items as
select
  o.*,
  coalesce(
    (select sum(i.line_total) from order_items i where i.order_id = o.id),
    o.order_value
  ) as items_subtotal,
  coalesce(
    (select count(*) from order_items i where i.order_id = o.id),
    1
  ) as actual_items_count,
  coalesce(
    (select sum(i.item_total_cost) from order_items i where i.order_id = o.id),
    o.total_cost
  ) as items_total_cost,
  coalesce(
    (select sum(i.item_profit) from order_items i where i.order_id = o.id),
    o.actual_profit
  ) as items_total_profit
from orders o;

-- ── 4. دالة حساب إجماليات الطلب من العناصر ──────────────────────────
create or replace function recalc_order_from_items(p_order_id uuid)
returns void language plpgsql as $$
declare
  v_items_total  numeric(10,2);
  v_items_cost   numeric(10,2);
  v_items_count  integer;
begin
  select
    coalesce(sum(line_total), 0),
    coalesce(sum(item_total_cost), 0),
    count(*)
  into v_items_total, v_items_cost, v_items_count
  from order_items
  where order_id = p_order_id;

  if v_items_count > 0 then
    update orders set
      order_value = v_items_total,
      total_cost  = v_items_cost + coalesce(store_shipping_cost, 0),
      actual_profit = v_items_total + coalesce(customer_shipping_price, 0)
                      - coalesce(discount, 0)
                      - v_items_cost
                      - coalesce(store_shipping_cost, 0),
      has_items   = true,
      items_count = v_items_count,
      updated_at  = now()
    where id = p_order_id;
  end if;
end;
$$;
grant execute on function recalc_order_from_items(uuid) to authenticated;

-- ── 5. دالة نسخ الطلب القديم (بمنتج واحد) إلى order_items ────────────
-- تُنفَّذ يدوياً بعد الترقية لنقل البيانات القديمة
create or replace function migrate_single_orders_to_items()
returns integer language plpgsql as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select * from orders
    where has_items is not true
      and order_value > 0
  loop
    insert into order_items (
      order_id, product_type, glasses_type,
      frame_id, frame_name, frame_type,
      frame_variant_id,
      lens_brand_id, lens_variant_id,
      contact_lens_brand, contact_lens_type,
      contact_lens_power_od, contact_lens_power_os,
      contact_lens_bc, contact_lens_diameter,
      contact_lens_quantity,
      prescription_id,
      unit_price,
      frame_cost, lens_cost, contact_lens_cost, manuf_cost,
      qty, sort_order
    ) values (
      v_order.id,
      coalesce(v_order.product_type, 'نظارات طبية'),
      v_order.glasses_type,
      v_order.frame_id,
      v_order.frame_name,
      v_order.frame_type,
      v_order.frame_variant_id,
      v_order.lens_brand_id,
      v_order.lens_variant_id,
      v_order.contact_lens_brand,
      v_order.contact_lens_type,
      v_order.contact_lens_power_od,
      v_order.contact_lens_power_os,
      v_order.contact_lens_bc,
      v_order.contact_lens_diameter,
      v_order.contact_lens_quantity,
      v_order.prescription_id,
      coalesce(v_order.order_value, 0),
      coalesce(v_order.frame_cost, 0),
      coalesce(v_order.lens_cost, 0),
      coalesce(v_order.contact_lens_cost, 0),
      coalesce(v_order.manuf_cost, 0),
      1, 1
    )
    on conflict do nothing;

    update orders set has_items = true, items_count = 1
    where id = v_order.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
grant execute on function migrate_single_orders_to_items() to authenticated;

-- ── 6. دالة خصم المخزون لعناصر الطلب ────────────────────────────────
create or replace function deduct_items_inventory(p_order_id uuid)
returns void language plpgsql as $$
begin
  update inventory_variants iv
  set qty_reserved = qty_reserved + oi.qty
  from order_items oi
  where oi.order_id = p_order_id
    and oi.frame_variant_id = iv.id
    and (iv.qty_total - iv.qty_reserved) >= oi.qty;
end;
$$;
grant execute on function deduct_items_inventory(uuid) to authenticated;

-- ── 7. دالة استرداد المخزون عند الإلغاء ─────────────────────────────
create or replace function restore_items_inventory(p_order_id uuid)
returns void language plpgsql as $$
begin
  update inventory_variants iv
  set qty_reserved = greatest(0, qty_reserved - oi.qty)
  from order_items oi
  where oi.order_id = p_order_id
    and oi.frame_variant_id = iv.id;
end;
$$;
grant execute on function restore_items_inventory(uuid) to authenticated;

-- ============================================================
-- ✅ Patch v4.2 — Order Items جاهز
-- بعد التشغيل، نفّذ: select migrate_single_orders_to_items();
-- ============================================================
